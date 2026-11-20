import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405, headers: cors });
  }

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return Response.json({ error: "Sign-in required." }, { status: 401, headers: cors });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: "Invalid session." }, { status: 401, headers: cors });
    }

    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const workspace = String(body.workspace ?? "general").slice(0, 40);

    if (!messages.length || messages.length > 20) {
      return Response.json({ error: "Send between 1 and 20 messages." }, { status: 400, headers: cors });
    }

    const safeMessages = messages.map((m: { role?: string; content?: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content ?? "").slice(0, 8000) }],
    }));

    if (safeMessages.some((m: { parts: { text: string }[] }) => !m.parts[0].text.trim())) {
      return Response.json({ error: "Message cannot be empty." }, { status: 400, headers: cors });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "Free AI is not configured yet. Add GEMINI_API_KEY in Supabase Function Secrets." }, { status: 503, headers: cors });
    }

    const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.1-flash-lite";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `You are Academia AI, an academic learning assistant. Help students understand concepts, plan and practise. Do not fabricate citations or claim unverified facts. State uncertainty. Workspace: ${workspace}.`,
            }],
          },
          contents: safeMessages,
          generationConfig: { temperature: 0.5 },
        }),
      },
    );

    const result = await response.json();
    if (!response.ok) {
      console.error("Gemini API request failed:", response.status, result?.error?.message ?? "Unknown provider error");
      return Response.json(
        { error: response.status === 429
            ? "Free AI usage limit reached. Please try again later."
            : "Free AI provider request failed. Check the Gemini API key and free-tier access." },
        { status: response.status === 429 ? 429 : 502, headers: cors },
      );
    }

    const answer = result.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("") ?? "";

    if (!answer) {
      return Response.json({ error: "The AI provider returned an empty response. Please try again." }, { status: 502, headers: cors });
    }

    await supabase.from("usage_events").insert({
      user_id: user.id,
      event_type: "ai_message",
      units: 1,
      metadata: { workspace, provider: "gemini" },
    });

    return Response.json({
      answer,
      usage: result.usageMetadata ?? null,
    }, { headers: cors });
  } catch (error) {
    console.error("Unexpected AI service error:", error);
    return Response.json({ error: "Unexpected AI service error." }, { status: 500, headers: cors });
  }
});
