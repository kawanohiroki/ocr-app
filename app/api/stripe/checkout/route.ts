import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const PACKS = {
  small: { credits: 30, amount: 500, label: "30回分" },
  large: { credits: 100, amount: 1500, label: "100回分" },
} as const;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await req.json() as { pack: string };
    const packInfo = PACKS[body.pack as keyof typeof PACKS];

    if (!packInfo) {
      return NextResponse.json({ error: "無効なパック種別です" }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    // アプリのベースURLを決定（Vercelのプレビューとカスタムドメインに対応）
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "jpy",
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: `書籍OCR クレジット ${packInfo.label}`,
              description: `OCR処理を${packInfo.credits}回分利用できます`,
            },
            unit_amount: packInfo.amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        credits: packInfo.credits.toString(),
      },
      success_url: `${baseUrl}/credits?success=true`,
      cancel_url: `${baseUrl}/credits`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Stripeエラーの詳細をログに出力してJSONで返す
    console.error("Stripe checkout エラー:", error);
    const message = error instanceof Error ? error.message : "決済セッションの作成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
