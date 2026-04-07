import { getSupabase } from "./supabaseClient.js";
import { REACTIONS, reactionById } from "./reactions.js";

let supabase = null;
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

function showConfigWarning() {
  els.configWarning.classList.remove("hidden");
  els.configWarning.innerHTML =
    "<strong>Connect Supabase</strong> so posts sync for everyone. Add your keys to <code>docs/runtime-config.json</code> on GitHub Pages (or use a local <code>.env</code>).";
}

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
  if (!supabase) {
    showConfigWarning();
    return;
  }
  if (!selectedImageId) return;
  const content = els.feelInput.value.trim();
  if (!content) return;

  els.btnPost.disabled = true;
  const { error } = await supabase.from("billboard_posts").insert({
    image_id: selectedImageId,
    content,
  });
  els.btnPost.disabled = false;
  if (error) {
    const msg = escapeHtml(error.message || "Unknown error");
    const hint =
      /row level security|rls/i.test(error.message || "") ?
        "<br /><br />This usually means Row Level Security is blocking inserts. In Supabase, add an INSERT policy for the <code>billboard_posts</code> table (or disable RLS for testing)." :
        "";
    showPostError(`${msg}${hint}`);
    return;
  }

  els.feelInput.value = "";
  window.location.href = `${import.meta.env.BASE_URL}billboard.html`;
}

function updatePostEnabled() {
  const content = els.feelInput.value.trim();
  els.btnPost.disabled = !supabase || !selectedImageId || !content;
}

els.btnPost.addEventListener("click", submitPost);
els.feelInput.addEventListener("input", updatePostEnabled);

renderPicker();
updatePreview();

(async () => {
  supabase = await getSupabase();
  if (!supabase) showConfigWarning();
  updatePostEnabled();
})();

