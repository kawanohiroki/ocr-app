import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MypageClient from "./MypageClient";

export default async function MypagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // OCR履歴を取得（新しい順）
  const { data: history, error } = await supabase
    .from("ocr_results")
    .select("id, filename, extracted_text, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("履歴取得エラー:", error);
  }

  return (
    <MypageClient
      email={user.email ?? ""}
      initialHistory={history ?? []}
    />
  );
}
