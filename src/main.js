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

let supabase = null;

let selectedImageId = null;
let selectedPostId = null;
let pickerButtons = [];

const els = {
  picker: document.getElementById("reaction-picker"),
  board: document.getElementById("board"),
  boardStatus: document.getElementById("board-status"),
  configWarning: document.getElementById("config-warning"),
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

function boardRelativePointFromEvent(evt) {
  const rect = els.board.getBoundingClientRect();
  const x = (evt.clientX - rect.left) / rect.width;
  const y = (evt.clientY - rect.top) / rect.height;
  return {
    x: Math.min(0.99, Math.max(0.01, x)),
    y: Math.min(0.99, Math.max(0.01, y)),
  };
}

function setPickerSelection(imageId) {
  for (const btn of pickerButtons) {
    const isSelected = btn.dataset.imageId === imageId;
    btn.classList.toggle("is-selected", isSelected);
    btn.setAttribute("aria-pressed", String(isSelected));
  }
}

function selectReaction(imageId) {
  selectedImageId = imageId;
  setPickerSelection(imageId);
}

function renderPicker() {
  els.picker.innerHTML = "";
  pickerButtons = [];
  for (const r of REACTIONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reaction-btn";
    btn.setAttribute("aria-label", `Select reaction: ${r.label}`);
    btn.setAttribute("aria-pressed", "false");
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
  els.boardStatus.textContent = "Click the board to place it.";
}

async function placeStamp(evt) {
  if (!supabase) {
    showConfigWarning();
    return;
  }
  if (!selectedImageId) {
    els.boardStatus.textContent = "Pick a hamster first.";
    return;
  }

  const { x, y } = boardRelativePointFromEvent(evt);
  els.boardStatus.textContent = "Stamping…";
  const { error } = await supabase.from("billboard_posts").insert({
    image_id: selectedImageId,
    x,
    y,
  });
  if (error) {
    els.boardStatus.textContent = `Could not stamp: ${error.message}`;
    return;
  }
  els.boardStatus.textContent = "Stamped.";
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

function renderStamps(rows) {
  els.board.innerHTML = "";

  for (const row of rows) {
    const r = reactionById(row.image_id);
    if (!r) continue;

    const wrap = document.createElement("div");
    wrap.className = "stamp";
    wrap.style.left = `${Math.round((row.x ?? 0.5) * 10000) / 100}%`;
    wrap.style.top = `${Math.round((row.y ?? 0.5) * 10000) / 100}%`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", `Stamp: ${r.label} at ${formatDate(row.created_at)}`);
    btn.dataset.postId = row.id;

    const img = document.createElement("img");
    img.src = r.src;
    img.alt = r.label;

    const dateEl = document.createElement("div");
    dateEl.className = "stamp-date";
    dateEl.textContent = formatDate(row.created_at);

    btn.appendChild(img);
    wrap.append(btn, dateEl);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openPostActions(row.id);
    });

    els.board.appendChild(wrap);
  }
}

async function loadPosts() {
  if (!supabase) return;
  els.boardStatus.textContent = "Loading board…";
  const { data, error } = await supabase
    .from("billboard_posts")
    .select("id, image_id, x, y, created_at")
    .order("created_at", { ascending: true });
  if (error) {
    els.boardStatus.textContent = `Could not load: ${error.message}`;
    return;
  }
  els.boardStatus.textContent = `${data.length} stamp${data.length === 1 ? "" : "s"} — click to stamp, click a stamp to delete`;
  renderStamps(data);
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

renderPicker();
els.board.addEventListener("click", placeStamp);

els.boardStatus.textContent = "Loading…";

(async () => {
  await initSupabase();

  if (!supabase) {
    showConfigWarning();
    els.boardStatus.textContent = "Board is offline until Supabase is configured.";
    return;
  }

  els.configWarning.classList.add("hidden");
  els.boardStatus.textContent = "Pick a hamster, then click the board to stamp it.";
  loadPosts();
  subscribeRealtime();
})();
