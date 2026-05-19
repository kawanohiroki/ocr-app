import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OcrClient from "./OcrClient";

// サーバーコンポーネントとしてユーザー情報を取得し、クライアントコンポーネントに渡す
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <OcrClient email={user.email ?? ""} />;
}
