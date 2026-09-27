import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { AppDatabase } from "@/lib/db";
import { withTransaction } from "@/lib/db";
import { nowIso } from "@/lib/format";
import type { Locale } from "@/lib/types";

export type Account = {
  id: string;
  displayName: string;
  locale: Locale;
  level: string | null;
  goal: string | null;
  onboarded: boolean;
  walletAddress: string | null;
};

type UserRow = {
  id: string;
  display_name: string;
  password_hash: string;
  locale: string;
  level: string | null;
  goal: string | null;
  onboarded: number;
  wallet_address: string | null;
};

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(process.cwd(), "data", "session.secret");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  const value = crypto.randomBytes(32).toString("hex");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value, { mode: 0o600 });
  return value;
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = crypto.scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return crypto.timingSafeEqual(next, prev);
}

export function signSession(userId: string) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 })).toString("base64url");
  const mac = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function readSession(token: string | undefined | null) {
  if (!token) return null;
  const index = token.lastIndexOf(".");
  if (index <= 0) return null;
  const payload = token.slice(0, index);
  const mac = token.slice(index + 1);
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { uid?: string; exp?: number };
    if (!parsed.uid || !parsed.exp || parsed.exp < Date.now()) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}

function toAccount(row: UserRow): Account {
  return {
    id: row.id,
    displayName: row.display_name,
    locale: row.locale === "en" ? "en" : "th",
    level: row.level,
    goal: row.goal,
    onboarded: Boolean(row.onboarded),
    walletAddress: row.wallet_address,
  };
}

export function findUser(db: AppDatabase, id: string) {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ? toAccount(row) : null;
}

export function findUserByName(db: AppDatabase, name: string) {
  const row = db.prepare("SELECT * FROM users WHERE display_name = ?").get(name.trim()) as UserRow | undefined;
  return row ?? null;
}

export function migrateGuest(db: AppDatabase, guestId: string, userId: string) {
  const progress = db.prepare("SELECT lesson_id FROM progress WHERE owner_type = 'guest' AND owner_id = ?").all(guestId) as Array<{ lesson_id: string }>;
  for (const row of progress) {
    const existing = db.prepare("SELECT lesson_id FROM progress WHERE owner_type = 'user' AND owner_id = ? AND lesson_id = ?").get(userId, row.lesson_id);
    if (!existing) {
      db.prepare("UPDATE progress SET owner_type = 'user', owner_id = ? WHERE owner_type = 'guest' AND owner_id = ? AND lesson_id = ?").run(userId, guestId, row.lesson_id);
    }
  }
  const conversations = db.prepare("SELECT id, lesson_id FROM conversations WHERE owner_type = 'guest' AND owner_id = ?").all(guestId) as Array<{ id: string; lesson_id: string }>;
  for (const row of conversations) {
    const existing = db.prepare("SELECT id FROM conversations WHERE owner_type = 'user' AND owner_id = ? AND lesson_id = ?").get(userId, row.lesson_id);
    if (!existing) {
      db.prepare("UPDATE conversations SET owner_type = 'user', owner_id = ? WHERE id = ?").run(userId, row.id);
    }
  }
}

export function registerUser(db: AppDatabase, input: { displayName: string; password: string; guestId: string; locale: Locale; level: string | null; goal: string | null; onboarded: boolean }) {
  const name = input.displayName.trim();
  if (!name || name.length > 40) throw new Error("NAME");
  if (input.password.length < 4 || input.password.length > 72) throw new Error("PASSWORD");
  if (findUserByName(db, name)) throw new Error("TAKEN");
  const id = crypto.randomUUID();
  withTransaction(db, () => {
    db.prepare(
      "INSERT INTO users (id, display_name, password_hash, locale, level, goal, onboarded, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(id, name, hashPassword(input.password), input.locale, input.level, input.goal, input.onboarded ? 1 : 0, nowIso());
    migrateGuest(db, input.guestId, id);
  });
  return findUser(db, id)!;
}

export function loginUser(db: AppDatabase, input: { displayName: string; password: string; guestId: string }) {
  const row = findUserByName(db, input.displayName);
  if (!row || !verifyPassword(input.password, row.password_hash)) throw new Error("INVALID");
  withTransaction(db, () => migrateGuest(db, input.guestId, row.id));
  return findUser(db, row.id)!;
}
