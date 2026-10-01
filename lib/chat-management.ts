import type { AppDatabase } from "./db";

export function validChatTitle(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 100;
}

export async function renameChat(db: AppDatabase, userId: string, id: string, title: string) {
  if (!validChatTitle(title)) throw new Error("INVALID_TITLE");
  const result = await db.prepare("UPDATE conversations SET title = ? WHERE id = ? AND owner_type = 'user' AND owner_id = ?").run(title.trim(), id, userId);
  return result.changes > 0;
}

export async function deleteChat(db: AppDatabase, userId: string, id: string) {
  return db.transaction(async () => {
    const owned = await db.prepare("SELECT id FROM conversations WHERE id = ? AND owner_type = 'user' AND owner_id = ?").get(id, userId);
    if (!owned) return false;
    await db.prepare("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE id = ? AND owner_type = 'user' AND owner_id = ?)").run(id, userId);
    const result = await db.prepare("DELETE FROM conversations WHERE id = ? AND owner_type = 'user' AND owner_id = ?").run(id, userId);
    return result.changes > 0;
  });
}
