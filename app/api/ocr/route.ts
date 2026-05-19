import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

type ImageBuffer = Uint8Array;

function isHeic(buffer: ImageBuffer): boolean {
  if (buffer.length < 12) return false;
  const ftypBox = Buffer.from(buffer.slice(4, 8)).toString("ascii");
  if (ftypBox !== "ftyp") return false;
  const brand = Buffer.from(buffer.slice(8, 12)).toString("ascii");
  return ["heic", "heis", "hevc", "hevx", "mif1", "msf1"].includes(brand);
}

async function convertHeicToJpeg(buffer: ImageBuffer): Promise<ImageBuffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const heicConvert = require("heic-convert");
  const outputBuffer = await heicConvert({ buffer: Buffer.from(buffer), format: "JPEG", quality: 0.9 });
  return new Uint8Array(outputBuffer);
}

async function compressIfNeeded(buffer: ImageBuffer): Promise<{ data: ImageBuffer; mediaType: string }> {
  const MAX_SIZE = 4 * 1024 * 1024;
  if (buffer.length <= MAX_SIZE) return { data: buffer, mediaType: "image/jpeg" };

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require("sharp");
  let quality = 80;
  let compressed: ImageBuffer = buffer;
  while (compressed.length > MAX_SIZE && quality >= 20) {
    compressed = await sharp(Buffer.from(buffer)).jpeg({ quality }).toBuffer();
    quality -= 10;
  }
  return { data: compressed, mediaType: "image/jpeg" };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // クレジットを原子的に消費（残高不足なら -1 が返る）
    const { data: remainingCredits, error: creditError } = await supabase.rpc("deduct_credit", {
      p_user_id: user.id,
    });

    if (creditError) {
      console.error("クレジット消費エラー:", creditError);
      return NextResponse.json({ error: "クレジット処理に失敗しました" }, { status: 500 });
    }

    if (remainingCredits === -1) {
      return NextResponse.json(
        { error: "クレジットが不足しています", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "画像ファイルが選択されていません" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
    }

    const arrayBuffer = await file.arrayBuffer();
    let imageBuffer: ImageBuffer = new Uint8Array(arrayBuffer);
    let mediaType = file.type || "image/jpeg";

    if (
      isHeic(imageBuffer) ||
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif")
    ) {
      imageBuffer = await convertHeicToJpeg(imageBuffer);
      mediaType = "image/jpeg";
    }

    const { data: finalBuffer, mediaType: finalMediaType } = await compressIfNeeded(imageBuffer);
    const base64Image = Buffer.from(finalBuffer).toString("base64");

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: finalMediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64Image,
              },
            },
            {
              type: "text",
              text: "この画像に含まれるすべてのテキストを、レイアウトや改行を可能な限り保持しながら、そのまま書き起こしてください。補足や説明は不要です。テキストのみを出力してください。",
            },
          ],
        },
      ],
    });

    const extractedText = response.content[0].type === "text" ? response.content[0].text : "";

    // OCR結果をDBに保存（失敗してもOCR結果の返却はブロックしない）
    try {
      await supabase.from("ocr_results").insert({
        user_id: user.id,
        filename: file.name,
        extracted_text: extractedText,
      });
    } catch (dbError) {
      console.error("DB保存エラー:", dbError);
    }

    // OCR成功後の残高をフロントエンドに返す
    return NextResponse.json({ text: extractedText, remainingCredits });
  } catch (error) {
    console.error("OCR処理エラー:", error);
    const message = error instanceof Error ? error.message : "不明なエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
