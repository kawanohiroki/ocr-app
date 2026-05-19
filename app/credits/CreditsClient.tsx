"use client";

import { useState } from "react";
import Header from "@/app/components/Header";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

interface Props {
  email: string;
  balance: number;
  transactions: Transaction[];
  paymentSuccess: boolean;
}

const PACKS = [
  { id: "small", label: "30回分", price: "¥500", credits: 30 },
  { id: "large", label: "100回分", price: "¥1,500", credits: 100, recommended: true },
];

export default function CreditsClient({ email, balance, transactions, paymentSuccess }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (packId: string) => {
    setLoading(packId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: packId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      alert("決済ページへの遷移に失敗しました");
      setLoading(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("ja-JP", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header email={email} credits={balance} />

      <main className="max-w-2xl mx-auto py-10 px-4 space-y-8">

        {/* 支払い完了メッセージ */}
        {paymentSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 font-medium">
            クレジットの購入が完了しました。残高に反映されています。
          </div>
        )}

        {/* 残高カード */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
          <p className="text-sm text-gray-400 mb-1">現在の残高</p>
          <p className="text-5xl font-bold text-gray-800">
            {balance}
            <span className="text-lg font-normal text-gray-400 ml-2">回</span>
          </p>
          {balance === 0 && (
            <p className="text-sm text-red-500 mt-2">
              クレジットがなくなりました。下のパックを購入してください。
            </p>
          )}
        </div>

        {/* 購入パック */}
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">クレジットを購入</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PACKS.map((pack) => (
              <div
                key={pack.id}
                className={`bg-white rounded-xl border shadow-sm p-5 relative ${
                  pack.recommended ? "border-blue-300" : "border-gray-100"
                }`}
              >
                {pack.recommended && (
                  <span className="absolute -top-2.5 left-4 bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                    おすすめ
                  </span>
                )}
                <p className="text-2xl font-bold text-gray-800">{pack.label}</p>
                <p className="text-gray-400 text-sm mt-0.5">OCR処理 {pack.credits}回分</p>
                <p className="text-xl font-semibold text-blue-600 mt-3">{pack.price}</p>
                <button
                  onClick={() => handlePurchase(pack.id)}
                  disabled={loading !== null}
                  className="mt-4 w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading === pack.id ? "処理中..." : "購入する"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 利用履歴 */}
        {transactions.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-700 mb-3">クレジット履歴</h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm text-gray-700">{tx.description ?? tx.type}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.created_at)}</p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      tx.amount > 0 ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
