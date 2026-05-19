import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OcrClient from "./OcrClient";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: credits } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  return (
    <OcrClient
      email={user.email ?? ""}
      initialCredits={credits?.balance ?? 0}
    />
  );
}
