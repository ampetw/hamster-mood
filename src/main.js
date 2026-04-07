import { createClient } from "@supabase/supabase-js";

function publicUrl(path) {
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `${import.meta.env.BASE_URL}${p}`;
}

let supabase = null;
let selectedPostId = null;

const els = {
  feed: document.getElementById("feed"),
  boardStatus: document.getElementById("board-status"),
  configWarning: document.getElementById("config-warning"),
  feelInput: document.getElementById("feel-input"),
  btnPost: document.getElementById("btn-post"),
  postOverlay: document.getElementById("post-overlay"),
  postKeep: document.getElementById("post-keep"),
  postDelete: document.getElementById("post-delete"),
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function showConfigWarning() {
  els.configWarning.classList.remove("hidden");
  els.configWarning.innerHTML =
    "<strong>Connect Supabase</strong> so posts sync for everyone. Add your keys to <code>docs/runtime-config.json</code> on GitHub Pages (or use a local <code>.env</code>). See README.";
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

async function initSupabase() {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  if (envUrl && envKey) {
    supabase = createClient(envUrl, envKey);
    return;
  }

  const cfg = await loadRuntimeConfig();
  if (cfg?.supabaseUrl && cfg?.supabaseAnonKey) {
    supabase = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }
}

function openPostActions(postId) {
  if (!supabase) return;
  selectedPostId = postId;
  els.postOverlay.classList.remove("hidden");
  els.postKeep.focus();
}

function closePostActions() {
  els.postOverlay.classList.add("hidden");
  selectedPostId = null;
}

async function submitPost() {
  if (!supabase) {
    showConfigWarning();
    return;
  }
  const content = els.feelInput.value.trim();
  if (!content) {
    els.boardStatus.textContent = "Write something first.";
    return;
  }
  els.btnPost.disabled = true;
  els.boardStatus.textContent = "Posting…";
  const { error } = await supabase.from("billboard_posts").insert({ content });
  els.btnPost.disabled = false;
  if (error) {
    els.boardStatus.textContent = `Could not post: ${error.message}`;
    return;
  }
  els.feelInput.value = "";
  els.boardStatus.textContent = "Posted.";
  await loadPosts();
}

async function deleteSelectedPost() {
  if (!supabase || !selectedPostId) return;
  els.postDelete.disabled = true;
  const { error } = await supabase.from("billboard_posts").delete().eq("id", selectedPostId);
  els.postDelete.disabled = false;
  if (error) {
    els.boardStatus.textContent = `Could not delete: ${error.message}`;
    closePostActions();
    return;
  }
  closePostActions();
  await loadPosts();
}

function renderFeed(rows) {
  els.feed.innerHTML = "";
  if (!rows.length) {
    const p = document.createElement("p");
    p.className = "feed-empty";
    p.textContent = "No posts yet — be the first to share how you feel.";
    els.feed.appendChild(p);
    return;
  }
  for (const row of rows) {
    const card = document.createElement("article");
    card.className = "post-card";
    card.tabIndex = 0;
    card.dataset.postId = row.id;
    const body = document.createElement("p");
    body.className = "post-body";
    body.textContent = row.content || "";
    const meta = document.createElement("p");
    meta.className = "post-meta";
    meta.textContent = formatDate(row.created_at);
    card.append(body, meta);
    const open = () => openPostActions(row.id);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
    els.feed.appendChild(card);
  }
}

async function loadPosts() {
  if (!supabase) return;
  els.boardStatus.textContent = "Loading…";
  const { data, error } = await supabase
    .from("billboard_posts")
    .select("id, content, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    els.boardStatus.textContent = `Could not load: ${error.message}`;
    return;
  }
  els.boardStatus.textContent = `${data.length} shared post${data.length === 1 ? "" : "s"} — tap a post to delete`;
  renderFeed(data);
}

function subscribeRealtime() {
  if (!supabase) return;
  const channel = supabase
    .channel("billboard_posts_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "billboard_posts" },
      () => {
        loadPosts();
      },
    )
    .subscribe();
  const poll = window.setInterval(() => loadPosts(), 12000);
  return () => {
    window.clearInterval(poll);
    supabase.removeChannel(channel);
  };
}

els.btnPost.addEventListener("click", submitPost);
els.postKeep.addEventListener("click", closePostActions);
els.postDelete.addEventListener("click", deleteSelectedPost);
els.postOverlay.addEventListener("click", (e) => {
  if (e.target === els.postOverlay) closePostActions();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePostActions();
});

els.btnPost.disabled = true;
els.boardStatus.textContent = "Loading…";

(async () => {
  await initSupabase();

  if (!supabase) {
    showConfigWarning();
    els.boardStatus.textContent = "Board is offline until Supabase is configured.";
    return;
  }

  els.configWarning.classList.add("hidden");
  els.btnPost.disabled = false;
  els.boardStatus.textContent = "Write how you feel, then tap POST.";
  loadPosts();
  subscribeRealtime();
})();
