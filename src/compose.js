import { REACTIONS, reactionById } from "./reactions.js";

let selectedImageId = null;
let pickerButtons = [];

const els = {
  picker: document.getElementById("reaction-picker"),
  configWarning: document.getElementById("config-warning"),
  feelInput: document.getElementById("feel-input"),
  btnPost: document.getElementById("btn-post"),
  mainPreviewImg: document.getElementById("main-preview-img"),
  previewPlaceholder: document.getElementById("preview-placeholder"),
};

function showPostError(message) {
  els.configWarning.classList.remove("hidden");
  els.configWarning.innerHTML = `<strong>Could not post</strong><br />${message}`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setPickerSelection(imageId) {
  for (const btn of pickerButtons) {
    const isSelected = btn.dataset.imageId === imageId;
    btn.classList.toggle("is-selected", isSelected);
    btn.setAttribute("aria-pressed", String(isSelected));
  }
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
    btn.setAttribute("aria-label", `Select hamster: ${r.label}`);
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

async function submitPost() {
  if (!selectedImageId) return;
  const content = els.feelInput.value.trim();
  if (!content) return;

  els.btnPost.disabled = true;
  try {
    const post = {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      image_id: selectedImageId,
      content,
      created_at: new Date().toISOString(),
    };
    const raw = localStorage.getItem("hamsterMoodPosts");
    const posts = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(posts)) throw new Error("Posts store is corrupted.");
    posts.unshift(post);
    localStorage.setItem("hamsterMoodPosts", JSON.stringify(posts.slice(0, 200)));
  } catch (e) {
    const msg = escapeHtml(e?.message || "Unknown error");
    showPostError(msg);
    els.btnPost.disabled = false;
    return;
  }
  els.btnPost.disabled = false;

  els.feelInput.value = "";
  window.location.href = `${import.meta.env.BASE_URL}billboard.html`;
}

function updatePostEnabled() {
  const content = els.feelInput.value.trim();
  els.btnPost.disabled = !selectedImageId || !content;
}

els.btnPost.addEventListener("click", submitPost);
els.feelInput.addEventListener("input", updatePostEnabled);

renderPicker();
updatePreview();
updatePostEnabled();

