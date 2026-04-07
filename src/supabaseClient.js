import { createClient } from "@supabase/supabase-js";

function publicUrl(path) {
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `${import.meta.env.BASE_URL}${p}`;
}

async function loadRuntimeConfig() {
  const url = publicUrl("runtime-config.json");
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || typeof json !== "object") return null;
    return {
      supabaseUrl: typeof json.supabaseUrl === "string" ? json.supabaseUrl.trim() : "",
      supabaseAnonKey: typeof json.supabaseAnonKey === "string" ? json.supabaseAnonKey.trim() : "",
    };
  } catch {
    return null;
  }
}

export async function getSupabase() {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  if (envUrl && envKey) return createClient(envUrl, envKey);

  const cfg = await loadRuntimeConfig();
  if (cfg?.supabaseUrl && cfg?.supabaseAnonKey) {
    return createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }
  return null;
}

