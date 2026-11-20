import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") ?? "https://example.com", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return Response.json({ error: "Sign-in required." }, { status: 401, headers: cors });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Invalid session." }, { status: 401, headers: cors });
    const secret = Deno.env.get("STRIPE_SECRET_KEY");
    const price = Deno.env.get("STRIPE_PRICE_ID");
    const site = Deno.env.get("SITE_URL");
    if (!secret || !price || !site) return Response.json({ error: "Billing is not configured yet." }, { status: 503, headers: cors });
    const form = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": price,
      "line_items[0][quantity]": "1",
      success_url: `${site}/?billing=success`,
      cancel_url: `${site}/?billing=cancelled`,
      client_reference_id: user.id,
      customer_email: user.email ?? "",
      "metadata[supabase_user_id]": user.id,
      "subscription_data[metadata][supabase_user_id]": user.id,
    });
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form });
    const session = await response.json();
    if (!response.ok) return Response.json({ error: "Could not create checkout session." }, { status: 502, headers: cors });
    return Response.json({ url: session.url }, { headers: cors });
  } catch (_error) {
    return Response.json({ error: "Unexpected billing error." }, { status: 500, headers: cors });
  }
});
