import { createClient } from "@supabase/supabase-js";

const REACTIONS = [
  { id: "angry", src: "/hamsters/angry.png", label: "Intense" },
  { id: "game", src: "/hamsters/game.png", label: "All a game" },
  { id: "blush", src: "/hamsters/blush.png", label: "Blush smile" },
  { id: "uh-oh", src: "/hamsters/uh-oh.png", label: "Uh oh" },
  { id: "tired", src: "/hamsters/tired.png", label: "So tired" },
  { id: "laughing", src: "/hamsters/laughing.png", label: "Laughing" },
  { id: "grin", src: "/hamsters/grin.png", label: "Big grin" },
];

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = url && key ? createClient(url, key) : null;

let selectedImageId = null;
let selectedPostId = null;

const els = {
  picker: document.getElementById("reaction-picker"),
  billboard: document.getElementById("billboard"),
  boardStatus: document.getElementById("board-status"),
  configWarning: document.getElementById("config-warning"),
  composeOverlay: document.getElementById("compose-overlay"),
  composePreviewImg: document.getElementById("compose-preview-img"),
  composeText: document.getElementById("compose-text"),
  composeCancel: document.getElementById("compose-cancel"),
  composePost: document.getElementById("compose-post"),
  postOverlay: document.getElementById("post-overlay"),
  postKeep: document.getElementById("post-keep"),
  postDelete: document.getElementById("post-delete"),
};

function reactionById(id) {
  return REACTIONS.find((r) => r.id === id);
}

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
    "<strong>Connect Supabase</strong> so posts sync for everyone. Copy <code>.env.example</code> to <code>.env</code> and add your project URL and anon key. See README for the one-time database setup.";
}

function renderPicker() {
  els.picker.innerHTML = "";
  for (const r of REACTIONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reaction-btn";
    btn.setAttribute("aria-label", `Post reaction: ${r.label}`);
    btn.dataset.imageId = r.id;
    const img = document.createElement("img");
    img.src = r.src;
    img.alt = r.label;
    btn.appendChild(img);
    btn.addEventListener("click", () => openCompose(r.id));
    els.picker.appendChild(btn);
  }
}

function openCompose(imageId) {
  if (!supabase) {
    showConfigWarning();
    return;
  }
  selectedImageId = imageId;
  const r = reactionById(imageId);
  els.composePreviewImg.src = r.src;
  els.composePreviewImg.alt = r.label;
  els.composeText.value = "";
  els.composeOverlay.classList.remove("hidden");
  els.composeText.focus();
}

function closeCompose() {
  els.composeOverlay.classList.add("hidden");
  selectedImageId = null;
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
  if (!supabase || !selectedImageId) return;
  const content = els.composeText.value.trim();
  els.composePost.disabled = true;
  els.boardStatus.textContent = "Posting…";
  const { error } = await supabase.from("billboard_posts").insert({
    image_id: selectedImageId,
    content,
  });
  els.composePost.disabled = false;
  if (error) {
    els.boardStatus.textContent = `Could not post: ${error.message}`;
    return;
  }
  els.boardStatus.textContent = "Posted.";
  closeCompose();
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

function renderPosts(rows) {
  els.billboard.innerHTML = "";
  if (!rows.length) {
    const p = document.createElement("p");
    p.className = "empty-board";
    p.textContent = "No posts yet — be the first hamster on the board.";
    els.billboard.appendChild(p);
    return;
  }
  for (const row of rows) {
    const r = reactionById(row.image_id);
    if (!r) continue;
    const card = document.createElement("article");
    card.className = "billboard-card";
    card.tabIndex = 0;
    card.dataset.postId = row.id;
    const img = document.createElement("img");
    img.src = r.src;
    img.alt = r.label;
    const textEl = document.createElement("p");
    textEl.className = "card-text";
    textEl.textContent = row.content || "(no message)";
    const dateEl = document.createElement("p");
    dateEl.className = "card-date";
    dateEl.textContent = formatDate(row.created_at);
    card.append(img, textEl, dateEl);
    const open = () => openPostActions(row.id);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
    els.billboard.appendChild(card);
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
  els.boardStatus.textContent = `${data.length} post${data.length === 1 ? "" : "s"} on the board`;
  renderPosts(data);
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

els.composeCancel.addEventListener("click", closeCompose);
els.composePost.addEventListener("click", submitPost);
els.composeOverlay.addEventListener("click", (e) => {
  if (e.target === els.composeOverlay) closeCompose();
});
els.postKeep.addEventListener("click", closePostActions);
els.postDelete.addEventListener("click", deleteSelectedPost);
els.postOverlay.addEventListener("click", (e) => {
  if (e.target === els.postOverlay) closePostActions();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCompose();
    closePostActions();
  }
});

renderPicker();

if (!supabase) {
  showConfigWarning();
  els.boardStatus.textContent = "Board is offline until Supabase is configured.";
} else {
  loadPosts();
  subscribeRealtime();
}
