import { getSupabase } from "./supabaseClient.js";
import { reactionById } from "./reactions.js";

let supabase = null;
let selectedPostId = null;

const els = {
  feed: document.getElementById("feed"),
  boardStatus: document.getElementById("board-status"),
  configWarning: document.getElementById("config-warning"),
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
    "<strong>Connect Supabase</strong> so posts sync for everyone. Add your keys to <code>docs/runtime-config.json</code> on GitHub Pages (or use a local <code>.env</code>).";
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

async function deleteSelectedPost() {
  if (!supabase || !selectedPostId) return;
  els.postDelete.disabled = true;
  const { error } = await supabase.from("billboard_posts").delete().eq("id", selectedPostId);
  els.postDelete.disabled = false;
  if (error) {
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
    p.textContent = "No posts yet — tap New post to add one.";
    els.feed.appendChild(p);
    return;
  }

  for (const row of rows) {
    const r = reactionById(row.image_id);
    if (!r) continue;

    const card = document.createElement("article");
    card.className = "post-card post-card-with-image";
    card.tabIndex = 0;
    card.dataset.postId = row.id;

    const img = document.createElement("img");
    img.className = "post-hamster";
    img.src = r.src;
    img.alt = r.label;

    const body = document.createElement("p");
    body.className = "post-body";
    body.textContent = row.content || "";

    const meta = document.createElement("p");
    meta.className = "post-meta";
    meta.textContent = formatDate(row.created_at);

    card.append(img, body, meta);

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
    .select("id, image_id, content, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    els.boardStatus.textContent = `Could not load: ${error.message}`;
    return;
  }
  els.boardStatus.textContent = `${data.length} post${data.length === 1 ? "" : "s"} — tap a post to delete`;
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

els.postKeep.addEventListener("click", closePostActions);
els.postDelete.addEventListener("click", deleteSelectedPost);
els.postOverlay.addEventListener("click", (e) => {
  if (e.target === els.postOverlay) closePostActions();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePostActions();
});

els.boardStatus.textContent = "Loading…";

(async () => {
  supabase = await getSupabase();
  if (!supabase) {
    showConfigWarning();
    els.boardStatus.textContent = "Billboard is offline until Supabase is configured.";
    return;
  }
  els.configWarning.classList.add("hidden");
  loadPosts();
  subscribeRealtime();
})();
