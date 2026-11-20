import { supabase, isSupabaseConfigured } from "./supabase";

export async function startSubscriptionCheckout() {
  if (!isSupabaseConfigured) throw new Error("Connect Supabase before enabling subscriptions.");
  const { data, error } = await supabase.functions.invoke("create-checkout", { body: {} });
  if (error) throw new Error(error.message || "Could not start checkout.");
  if (!data?.url) throw new Error("Checkout URL was not returned.");
  window.location.assign(data.url);
}
