import { supabase, isSupabaseConfigured } from "./supabase";

export async function askAcademiaAI(messages, workspace = "general") {
  if (!isSupabaseConfigured) throw new Error("Connect Supabase before using live AI.");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in to use Academia AI.");
  const { data, error } = await supabase.functions.invoke("ai-chat", {
    body: { messages, workspace },
  });
  if (error) throw new Error(error.message || "AI request failed.");
  return data;
}
