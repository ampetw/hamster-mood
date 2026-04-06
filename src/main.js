import { createClient } from "@supabase/supabase-js";

function publicUrl(path) {
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `${import.meta.env.BASE_URL}${p}`;
}

const REACTIONS = [
  { id: "laughing", file: "laughing.png", label: "Laughing with tears" },
  { id: "grin", file: "grin.png", label: "Big grin" },
  { id: "tired", file: "tired.png", label: "Sad" },
  { id: "angry", file: "angry.png", label: "Screaming" },
  { id: "uh-oh", file: "uh-oh.png", label: "Tongue out" },
  { id: "game", file: "game.png", label: "Distressed" },
  { id: "blush", file: "blush.png", label: "Blushing" },
].map(({ file, ...r }) => ({ ...r, src: publicUrl(`hamsters/${file}`) }));

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = url && key ? createClient(url, key) : null;

let selectedImageId = null;
let selectedPostId = null;
let pickerButtons = [];

const els = {
  picker: document.getElementById("reaction-picker"),
  billboard: document.getElementById("billboard"),
  boardStatus: document.getElementById("board-status"),
  configWarning: document.getElementById("config-warning"),
  mainPreviewImg: document.getElementById("main-preview-img"),
  previewPlaceholder: document.getElementById("preview-placeholder"),
  messageText: document.getElementById("message-text"),
  btnPost: document.getElementById("btn-post"),
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

function updatePreview() {
  const r = selectedImageId ? reactionById(selectedImageId) : null;
  if (!r) {
    els.mainPreviewImg.classList.add("hidden");
    els.previewPlaceholder.classList.remove("hidden");
    els.mainPreviewImg.removeAttribute("src");
    return;
  }
  els.previewPlaceholder.classList.add("hidden");
  els.mainPreviewImg.classList.remove("hidden");
  els.mainPreviewImg.src = r.src;
  els.mainPreviewImg.alt = r.label;
}

function setPickerSelection(imageId) {
  for (const btn of pickerButtons) {
    btn.classList.toggle("is-selected", btn.dataset.imageId === imageId);
  }
}

function selectReaction(imageId) {
  selectedImageId = imageId;
  setPickerSelection(imageId);
  updatePreview();
}

function renderPicker() {
  els.picker.innerHTML = "";
  pickerButtons = [];
  for (const r of REACTIONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reaction-btn";
    btn.setAttribute("aria-label", `Select reaction: ${r.label}`);
    btn.dataset.imageId = r.id;
    const img = document.createElement("img");
    img.src = r.src;
    img.alt = r.label;
    btn.appendChild(img);
    btn.addEventListener("click", () => selectReaction(r.id));
    els.picker.appendChild(btn);
    pickerButtons.push(btn);
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
  if (!selectedImageId) {
    els.boardStatus.textContent = "Pick a hamster first.";
    return;
  }
  const content = els.messageText.value.trim();
  els.btnPost.disabled = true;
  els.boardStatus.textContent = "Posting…";
  const { error } = await supabase.from("billboard_posts").insert({
    image_id: selectedImageId,
    content,
  });
  els.btnPost.disabled = false;
  if (error) {
    els.boardStatus.textContent = `Could not post: ${error.message}`;
    return;
  }
  els.boardStatus.textContent = "Posted.";
  els.messageText.value = "";
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
    p.textContent = "No posts yet — be the first on the board.";
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
  els.boardStatus.textContent = `${data.length} post${data.length === 1 ? "" : "s"}`;
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

els.btnPost.addEventListener("click", submitPost);
els.postKeep.addEventListener("click", closePostActions);
els.postDelete.addEventListener("click", deleteSelectedPost);
els.postOverlay.addEventListener("click", (e) => {
  if (e.target === els.postOverlay) closePostActions();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePostActions();
});

renderPicker();
updatePreview();

if (!supabase) {
  showConfigWarning();
  els.boardStatus.textContent = "Board offline — add Supabase in .env";
  els.btnPost.disabled = true;
} else {
  loadPosts();
  subscribeRealtime();
}
