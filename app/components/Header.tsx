"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
  email: string;
}

export default function Header({ email }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-800">書籍OCR</span>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/"
              className={pathname === "/" ? "text-blue-600 font-medium" : "text-gray-500 hover:text-gray-800"}
            >
              OCR
            </Link>
            <Link
              href="/mypage"
              className={pathname === "/mypage" ? "text-blue-600 font-medium" : "text-gray-500 hover:text-gray-800"}
            >
              マイページ
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500 hidden sm:inline">{email}</span>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}
