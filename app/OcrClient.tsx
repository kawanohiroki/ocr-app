"use client";

import { useState, useRef, useCallback } from "react";
import Header from "@/app/components/Header";

type Status = "idle" | "loading" | "success" | "error";

interface Props {
  email: string;
}

export default function OcrClient({ email }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [extractedText, setExtractedText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const isHeic =
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif") ||
      file.type === "image/heic" ||
      file.type === "image/heif";

    setFileName(file.name);

    // HEICはブラウザがプレビュー表示できないためスキップ
    if (!isHeic) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    setStatus("loading");
    setExtractedText("");
    setErrorMessage("");

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "OCR処理に失敗しました");
      }

      setExtractedText(data.text);
      setStatus("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "不明なエラーが発生しました");
      setStatus("error");
    }
  }, []);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

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
      <Header email={email} />

      <main className="max-w-3xl mx-auto py-10 px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">テキスト書き起こし</h2>
          <p className="text-gray-500 text-sm">画像をアップロードするとテキストを書き起こします</p>
          <p className="text-xs text-gray-400 mt-1">JPEG・PNG・WEBP・HEIC 対応 ／ 完了後はマイページに自動保存されます</p>
        </div>

        {/* アップロードエリア */}
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors mb-6 ${
            isDragging
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 bg-white hover:border-blue-300 hover:bg-gray-50"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={handleInputChange}
          />

          {previewUrl ? (
            <div className="flex flex-col items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="アップロードした画像"
                className="max-h-64 rounded-lg object-contain shadow"
              />
              <p className="text-sm text-gray-400">別の画像を選ぶにはクリックまたはドロップ</p>
            </div>
          ) : fileName && (status === "loading" || status === "success") ? (
            <div className="text-gray-500">
              <p className="font-medium">{fileName}</p>
              <p className="text-sm text-gray-400 mt-1">別の画像を選ぶにはクリックまたはドロップ</p>
            </div>
          ) : (
            <div className="text-gray-400">
              <svg
                className="mx-auto mb-4 w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-base font-medium">クリックまたはドラッグ＆ドロップ</p>
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
                <button
                  onClick={handleCopy}
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  {copied ? "コピーしました！" : "コピー"}
                </button>
              </div>
            </div>
            <pre className="p-5 text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed max-h-[500px] overflow-y-auto">
              {extractedText}
            </pre>
          </div>
        )}

        {/* リセット */}
        {(status === "success" || status === "error") && (
          <div className="mt-4 text-center">
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              別の画像を試す
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
