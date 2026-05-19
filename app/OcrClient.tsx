"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";

type Status = "idle" | "loading" | "success" | "error" | "no_credits";

interface Props {
  email: string;
  initialCredits: number;
}

export default function OcrClient({ email, initialCredits }: Props) {
  const router = useRouter();
  const [credits, setCredits] = useState(initialCredits);
  const [status, setStatus] = useState<Status>("idle");
  const [extractedText, setExtractedText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    // クレジット不足の場合は即座にブロック
    if (credits <= 0) {
      setStatus("no_credits");
      return;
    }

    const isHeic =
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif") ||
      file.type === "image/heic" ||
      file.type === "image/heif";

    setFileName(file.name);
    if (!isHeic) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    setStatus("loading");
    setExtractedText("");
    setErrorMessage("");

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      const data = await res.json();

      // クレジット不足（サーバー側で検出）
      if (res.status === 402) {
        setStatus("no_credits");
        setCredits(0);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "OCR処理に失敗しました");
      }

      setExtractedText(data.text);
      // APIが返す最新残高で表示を更新
      if (typeof data.remainingCredits === "number") {
        setCredits(data.remainingCredits);
      }
      setStatus("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "不明なエラーが発生しました");
      setStatus("error");
    }
  }, [credits]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setStatus("idle");
    setExtractedText("");
    setErrorMessage("");
    setPreviewUrl(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header email={email} credits={credits} />

      <main className="max-w-3xl mx-auto py-10 px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">テキスト書き起こし</h2>
          <p className="text-gray-500 text-sm">画像をアップロードするとテキストを書き起こします</p>
          <p className="text-xs text-gray-400 mt-1">JPEG・PNG・WEBP・HEIC 対応 ／ 完了後はマイページに自動保存</p>
        </div>

        {/* クレジット不足バナー */}
        {status === "no_credits" && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-6 flex items-center justify-between">
            <div>
              <p className="font-medium text-orange-800">クレジットがなくなりました</p>
              <p className="text-sm text-orange-600 mt-0.5">クレジットを購入すると引き続きOCRを利用できます</p>
            </div>
            <button
              onClick={() => router.push("/credits")}
              className="shrink-0 ml-4 bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              クレジットを購入
            </button>
          </div>
        )}

        {/* アップロードエリア */}
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors mb-6 ${
            credits <= 0
              ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
              : isDragging
              ? "border-blue-400 bg-blue-50 cursor-pointer"
              : "border-gray-300 bg-white hover:border-blue-300 hover:bg-gray-50 cursor-pointer"
          }`}
          onClick={() => credits > 0 && fileInputRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); if (credits > 0) { setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); } }}
          onDragOver={(e) => { e.preventDefault(); if (credits > 0) setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={handleInputChange}
            disabled={credits <= 0}
          />

          {previewUrl ? (
            <div className="flex flex-col items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="アップロードした画像" className="max-h-64 rounded-lg object-contain shadow" />
              <p className="text-sm text-gray-400">別の画像を選ぶにはクリックまたはドロップ</p>
            </div>
          ) : fileName && (status === "loading" || status === "success") ? (
            <div className="text-gray-500">
              <p className="font-medium">{fileName}</p>
              <p className="text-sm text-gray-400 mt-1">別の画像を選ぶにはクリックまたはドロップ</p>
            </div>
          ) : (
            <div className="text-gray-400">
              <svg className="mx-auto mb-4 w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-base font-medium">
                {credits <= 0 ? "クレジットがありません" : "クリックまたはドラッグ＆ドロップ"}
              </p>
            </div>
          )}
        </div>

        {/* ローディング */}
        {status === "loading" && (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100 mb-4">
            <div className="flex items-center justify-center gap-3 text-blue-600">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="font-medium">OCR処理中...</span>
            </div>
          </div>
        )}

        {/* エラー */}
        {status === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-4">
            <p className="text-red-700 font-medium">エラーが発生しました</p>
            <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
          </div>
        )}

        {/* 結果 */}
        {status === "success" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-700">書き起こし結果</h2>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-400">マイページに保存済み</span>
                <button onClick={handleCopy} className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
                  {copied ? "コピーしました！" : "コピー"}
                </button>
              </div>
            </div>
            <pre className="p-5 text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed max-h-[500px] overflow-y-auto">
              {extractedText}
            </pre>
          </div>
        )}

        {(status === "success" || status === "error") && (
          <div className="mt-4 text-center">
            <button onClick={handleReset} className="text-sm text-gray-500 hover:text-gray-700 underline">
              別の画像を試す
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
