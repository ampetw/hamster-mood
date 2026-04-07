function publicUrl(path) {
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `${import.meta.env.BASE_URL}${p}`;
}

export const REACTIONS = [
  { id: "laughing", file: "laughing.png", label: "Laughing with tears" },
  { id: "grin", file: "grin.png", label: "Big grin" },
  { id: "tired", file: "tired.png", label: "Sad" },
  { id: "angry", file: "angry.png", label: "Screaming" },
  { id: "uh-oh", file: "uh-oh.png", label: "Tongue out" },
  { id: "game", file: "game.png", label: "Distressed" },
  { id: "blush", file: "blush.png", label: "Blushing" },
].map(({ file, ...r }) => ({ ...r, src: publicUrl(`hamsters/${file}`) }));

export function reactionById(id) {
  return REACTIONS.find((r) => r.id === id);
}

