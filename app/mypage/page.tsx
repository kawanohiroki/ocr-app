import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MypageClient from "./MypageClient";

export default async function MypagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: history }, { data: credits }] = await Promise.all([
    supabase
      .from("ocr_results")
      .select("id, filename, extracted_text, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", user.id)
      .single(),
  ]);

  return (
    <MypageClient
      email={user.email ?? ""}
      initialHistory={history ?? []}
      credits={credits?.balance ?? 0}
    />
  );
}
