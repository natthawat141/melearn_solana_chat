const prefix = "melearn-draft:";
const maxAgeMs = 12 * 60 * 60 * 1000;
const maxChars = 2000;

type StoredDraft = { text: string; savedAt: number };

function storage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function readLessonDraft(lessonId: string) {
  const store = storage();
  if (!store) return "";
  try {
    const raw = store.getItem(prefix + lessonId);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (typeof parsed.text !== "string" || typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > maxAgeMs) {
      store.removeItem(prefix + lessonId);
      return "";
    }
    return parsed.text.slice(0, maxChars);
  } catch {
    return "";
  }
}

export function writeLessonDraft(lessonId: string, text: string) {
  const store = storage();
  if (!store) return;
  const next = text.slice(0, maxChars);
  if (!next) {
    store.removeItem(prefix + lessonId);
    return;
  }
  const payload: StoredDraft = { text: next, savedAt: Date.now() };
  store.setItem(prefix + lessonId, JSON.stringify(payload));
}

export function clearLessonDraft(lessonId: string) {
  storage()?.removeItem(prefix + lessonId);
}

export function clearLessonDrafts() {
  const store = storage();
  if (!store) return;
  for (const key of Object.keys(store)) {
    if (key.startsWith(prefix)) store.removeItem(key);
  }
}
