import { createClient } from "@supabase/supabase-js";

function publicUrl(path) {
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `${import.meta.env.BASE_URL}${p}`;
}

function normalizeString(v) {
  return typeof v === "string" ? v.trim() : "";
}

function looksLikePlaceholder(v) {
  const s = normalizeString(v);
  if (!s) return false;
  return (
    s.includes("PASTE_PROJECT_URL_HERE") ||
    s.includes("PASTE_ANON_PUBLIC_KEY_HERE") ||
    s.startsWith("PASTE_")
  );
}

function isProbablySupabaseUrl(url) {
  const s = normalizeString(url);
  if (!s || looksLikePlaceholder(s)) return false;
  if (!/^https:\/\/.+/i.test(s)) return false;
  return true;
}

function isProbablyAnonKey(key) {
  const s = normalizeString(key);
  if (!s || looksLikePlaceholder(s)) return false;
  // Supabase keys can be:
  // - legacy anon public keys (JWT-like, usually start with "eyJ")
  // - newer publishable keys (start with "sb_publishable_")
  // This is just a lightweight sanity check to avoid obvious placeholders.
  if (s.startsWith("sb_publishable_")) return true;
  return s.startsWith("eyJ") && s.includes(".");
}

async function loadRuntimeConfig() {
  const url = publicUrl("runtime-config.json");
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || typeof json !== "object") return null;
    const supabaseUrl = normalizeString(json.supabaseUrl);
    const supabaseAnonKey = normalizeString(json.supabaseAnonKey);
    if (!isProbablySupabaseUrl(supabaseUrl) || !isProbablyAnonKey(supabaseAnonKey)) return null;
    return { supabaseUrl, supabaseAnonKey };
  } catch {
    return null;
  }
}

export async function getSupabase() {
  const envUrl = normalizeString(import.meta.env.VITE_SUPABASE_URL);
  const envKey = normalizeString(import.meta.env.VITE_SUPABASE_ANON_KEY);
  if (isProbablySupabaseUrl(envUrl) && isProbablyAnonKey(envKey)) return createClient(envUrl, envKey);

  const cfg = await loadRuntimeConfig();
  if (cfg?.supabaseUrl && cfg?.supabaseAnonKey) {
    return createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }
  return null;
}

