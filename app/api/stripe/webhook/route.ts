import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "署名がありません" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  let event: Stripe.Event;
  try {
    // Stripeからの正規リクエストであることを署名で検証
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "署名検証に失敗しました" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const credits = parseInt(session.metadata?.credits ?? "0", 10);

    if (!userId || credits <= 0) {
      return NextResponse.json({ error: "メタデータ不正" }, { status: 400 });
    }

    const supabase = await createClient();

    // SECURITY DEFINER関数でクレジットを加算（重複処理防止付き）
    const { error } = await supabase.rpc("add_credits_from_stripe", {
      p_user_id: userId,
      p_amount: credits,
      p_stripe_session_id: session.id,
    });

    if (error) {
      console.error("クレジット加算エラー:", error);
      return NextResponse.json({ error: "クレジット加算に失敗しました" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
