import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") ?? "https://example.com", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return Response.json({ error: "Sign-in required." }, { status: 401, headers: cors });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: "Invalid session." }, { status: 401, headers: cors });
    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const workspace = String(body.workspace ?? "general").slice(0, 40);
    if (!messages.length || messages.length > 20) return Response.json({ error: "Send between 1 and 20 messages." }, { status: 400, headers: cors });
    const safeMessages = messages.map((m: {role?:string;content?:string}) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").slice(0, 8000),
    }));
    if (safeMessages.some((m: {content:string}) => !m.content.trim())) return Response.json({ error: "Message cannot be empty." }, { status: 400, headers: cors });
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return Response.json({ error: "AI service is not configured yet." }, { status: 503, headers: cors });
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1-mini",
        messages: [{ role: "system", content: `You are Academia AI, an academic learning assistant. Help students understand concepts, plan and practise. Do not fabricate citations or claim unverified facts. State uncertainty. Workspace: ${workspace}.` }, ...safeMessages],
        temperature: 0.5,
      }),
    });
    const result = await response.json();
    if (!response.ok) return Response.json({ error: "AI provider request failed." }, { status: 502, headers: cors });
    await supabase.from("usage_events").insert({ user_id: user.id, event_type: "ai_message", units: 1, metadata: { workspace } });
    return Response.json({ answer: result.choices?.[0]?.message?.content ?? "", usage: result.usage ?? null }, { headers: cors });
  } catch (_error) {
    return Response.json({ error: "Unexpected AI service error." }, { status: 500, headers: cors });
  }
});
