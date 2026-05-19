"use client";

import { useState } from "react";
import Header from "@/app/components/Header";

interface OcrResult {
  id: string;
  filename: string;
  extracted_text: string;
  created_at: string;
}

interface Props {
  email: string;
  initialHistory: OcrResult[];
  credits: number;
}

export default function MypageClient({ email, initialHistory, credits }: Props) {
  const [history, setHistory] = useState<OcrResult[]>(initialHistory);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // テキストファイルとしてダウンロード
  const handleDownload = (item: OcrResult) => {
    const blob = new Blob([item.extracted_text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    // 拡張子を.txtに変換してダウンロード
    const baseName = item.filename.replace(/\.[^.]+$/, "");
    a.href = url;
    a.download = `${baseName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 履歴を削除
  const handleDelete = async (id: string) => {
    if (!confirm("この履歴を削除しますか？")) return;
    setDeletingId(id);

    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除に失敗しました");
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header email={email} credits={credits} />

      <main className="max-w-3xl mx-auto py-10 px-4">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          OCR履歴
          <span className="text-sm font-normal text-gray-400 ml-2">
            {history.length}件
          </span>
        </h2>

        {history.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
            <p>まだOCR履歴がありません</p>
            <p className="text-sm mt-1">
              <a href="/" className="text-blue-600 hover:underline">
                OCRページ
              </a>
              で画像をアップロードすると自動的に保存されます
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {history.map((item) => (
              <li
                key={item.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm"
              >
                {/* ヘッダー行 */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800 truncate">{item.filename}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.created_at)}</p>
                  </div>

                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === item.id ? null : item.id)
                      }
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {expandedId === item.id ? "閉じる" : "プレビュー"}
                    </button>
                    <button
                      onClick={() => handleDownload(item)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      ダウンロード
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      {deletingId === item.id ? "削除中..." : "削除"}
                    </button>
                  </div>
                </div>

                {/* テキストプレビュー */}
                {expandedId === item.id && (
                  <div className="px-5 pb-4 border-t border-gray-50">
                    <pre className="mt-3 text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto bg-gray-50 rounded-lg p-3">
                      {item.extracted_text}
                    </pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
