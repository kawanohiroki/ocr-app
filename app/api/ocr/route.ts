import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Buffer型のエイリアス（Node.js Buffer は ArrayBufferLike を使うが一貫して扱うためUint8Arrayを使用）
type ImageBuffer = Uint8Array;

// HEIC形式かどうかを判定（マジックバイトで検出）
function isHeic(buffer: ImageBuffer): boolean {
  if (buffer.length < 12) return false;
  const ftypBox = Buffer.from(buffer.slice(4, 8)).toString("ascii");
  if (ftypBox !== "ftyp") return false;
  const brand = Buffer.from(buffer.slice(8, 12)).toString("ascii");
  return ["heic", "heis", "hevc", "hevx", "mif1", "msf1"].includes(brand);
}

// HEICをJPEGに変換
async function convertHeicToJpeg(buffer: ImageBuffer): Promise<ImageBuffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const heicConvert = require("heic-convert");
  const outputBuffer = await heicConvert({
    buffer: Buffer.from(buffer),
    format: "JPEG",
    quality: 0.9,
  });
  return new Uint8Array(outputBuffer);
}

// 4MB超の場合にsharpで圧縮
async function compressIfNeeded(buffer: ImageBuffer): Promise<{ data: ImageBuffer; mediaType: string }> {
  const MAX_SIZE = 4 * 1024 * 1024; // 4MB

  if (buffer.length <= MAX_SIZE) {
    return { data: buffer, mediaType: "image/jpeg" };
  }

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
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "画像ファイルが選択されていません" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
    }

    // ファイルをUint8Arrayに変換
    const arrayBuffer = await file.arrayBuffer();
    let imageBuffer: ImageBuffer = new Uint8Array(arrayBuffer);
    let mediaType = file.type || "image/jpeg";

    // HEIC形式の場合はJPEGに変換
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

    // 4MB超の場合は圧縮
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
              // 画像内のテキストを忠実に書き起こすよう指示
              text: "この画像に含まれるすべてのテキストを、レイアウトや改行を可能な限り保持しながら、そのまま書き起こしてください。補足や説明は不要です。テキストのみを出力してください。",
            },
          ],
        },
      ],
    });

    const extractedText =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ text: extractedText });
  } catch (error) {
    console.error("OCR処理エラー:", error);
    const message = error instanceof Error ? error.message : "不明なエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
