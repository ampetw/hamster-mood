import { reactionById } from "./reactions.js";

const els = {
  feed: document.getElementById("feed"),
  boardStatus: document.getElementById("board-status"),
  configWarning: document.getElementById("config-warning"),
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function loadLocalPosts() {
  try {
    const raw = localStorage.getItem("hamsterMoodPosts");
    const posts = raw ? JSON.parse(raw) : [];
    return Array.isArray(posts) ? posts : [];
  } catch {
    return [];
  }
}

function saveLocalPosts(posts) {
  localStorage.setItem("hamsterMoodPosts", JSON.stringify(posts));
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

  const normalizeImageId = (imageId) => {
    if (typeof imageId !== "string") return "";
    const s = imageId.trim();
    if (!s) return "";
    // Handle older/alternate formats that might store filenames.
    if (s.toLowerCase().endsWith(".png")) return s.slice(0, -4);
    return s;
  };

  for (const row of rows) {
    const imageId = normalizeImageId(row.image_id);
    const r = reactionById(imageId) || reactionById("blush");

    const card = document.createElement("article");
    card.className = "post-card post-card-with-image";
    card.tabIndex = 0;
    card.dataset.postId = row.id;

    const img = document.createElement("img");
    img.className = "post-hamster";
    if (r) {
      img.src = r.src;
      img.alt = r.label;
    } else {
      img.alt = "Hamster";
    }

    const body = document.createElement("p");
    body.className = "post-body";
    body.textContent = row.content || "";

    const meta = document.createElement("p");
    meta.className = "post-meta";
    meta.textContent = formatDate(row.created_at);

    card.append(img, body, meta);

    card.addEventListener("click", () => {
      const ok = window.confirm("Delete this post?");
      if (!ok) return;
      const posts = loadLocalPosts();
      const next = posts.filter((p) => p?.id !== row.id);
      saveLocalPosts(next);
      loadPosts();
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
    els.feed.appendChild(card);
  }
}

async function loadPosts() {
  els.boardStatus.textContent = "Loading…";
  const posts = loadLocalPosts()
    .slice()
    .sort((a, b) => String(b?.created_at || "").localeCompare(String(a?.created_at || "")));
  els.boardStatus.textContent = `${posts.length} post${posts.length === 1 ? "" : "s"} — tap a post to delete`;
  renderFeed(posts);
}

els.boardStatus.textContent = "Loading…";

els.configWarning.classList.add("hidden");
loadPosts();
