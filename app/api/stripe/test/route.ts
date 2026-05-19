import { NextResponse } from "next/server";
import Stripe from "stripe";

// Stripe接続診断用エンドポイント（デバッグ後に削除）
export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY が未設定です" });
  }

  // キーの基本情報（先頭10文字と末尾4文字のみ表示）
  const keyInfo = `${key.slice(0, 10)}...${key.slice(-4)} (${key.length}文字)`;

  try {
    const stripe = new Stripe(key);
    // 最も軽量なAPIコール（残高確認）
    const balance = await stripe.balance.retrieve();
    return NextResponse.json({
      status: "接続成功",
      keyInfo,
      currency: balance.available[0]?.currency,
    });
  } catch (error) {
    return NextResponse.json({
      status: "接続失敗",
      keyInfo,
      error: error instanceof Error ? error.message : String(error),
      errorType: error?.constructor?.name,
    });
  }
}
