import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreditsClient from "./CreditsClient";

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: credits } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  const { data: transactions } = await supabase
    .from("credit_transactions")
    .select("id, amount, type, description, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const params = await searchParams;

  return (
    <CreditsClient
      email={user.email ?? ""}
      balance={credits?.balance ?? 0}
      transactions={transactions ?? []}
      paymentSuccess={params.success === "true"}
    />
  );
}
