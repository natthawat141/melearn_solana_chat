import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { AppDatabase } from "@/lib/db";
import { withTransaction } from "@/lib/db";
import { nowIso } from "@/lib/format";
import { DEFAULT_LOCALE, type Locale } from "@/lib/types";

export type Account = {
  id: string;
  displayName: string;
  locale: Locale;
  level: string | null;
  goal: string | null;
  onboarded: boolean;
  walletAddress: string | null;
  avatarUrl: string | null;
  educationStage: string | null;
  preferredSubject: string | null;
};

type UserRow = {
  id: string;
  email: string | null;
  display_name: string;
  password_hash: string;
  locale: string;
  level: string | null;
  goal: string | null;
  onboarded: number;
  wallet_address: string | null;
  avatar_url?: string | null;
  education_stage?: string | null;
  preferred_subject?: string | null;
};

async function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = (await getCloudflareContext({ async: true })) as unknown as { env?: { SESSION_SECRET?: { get(): Promise<string> } } };
    const value = await context.env?.SESSION_SECRET?.get();
    if (value) return value;
  } catch {
    // Local development falls back to the file below.
  }
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

export async function signSession(userId: string) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 })).toString("base64url");
  const mac = crypto.createHmac("sha256", await secret()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export async function readSession(token: string | undefined | null) {
  if (!token) return null;
  const index = token.lastIndexOf(".");
  if (index <= 0) return null;
  const payload = token.slice(0, index);
  const mac = token.slice(index + 1);
  const expected = crypto.createHmac("sha256", await secret()).update(payload).digest("base64url");
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
    locale: row.locale === "th" ? "th" : DEFAULT_LOCALE,
    level: row.level,
    goal: row.goal,
    onboarded: Boolean(row.onboarded),
    walletAddress: row.wallet_address,
    avatarUrl: row.avatar_url ?? null,
    educationStage: row.education_stage ?? null,
    preferredSubject: row.preferred_subject ?? null,
  };
}

export async function findUser(db: AppDatabase, id: string) {
  const row = await db.prepare("SELECT * FROM users WHERE id = ?").get<UserRow>(id);
  return row ? toAccount(row) : null;
}

export async function findUserByName(db: AppDatabase, name: string) {
  const clean = name.trim();
  const row = await db.prepare("SELECT * FROM users WHERE display_name = ? OR email = ? COLLATE NOCASE").get<UserRow>(clean, clean);
  return row ?? null;
}

export const findUserByNameOrEmail = findUserByName;

export async function migrateGuest(db: AppDatabase, guestId: string, userId: string) {
  const progress = await db.prepare("SELECT lesson_id FROM progress WHERE owner_type = 'guest' AND owner_id = ?").all<{ lesson_id: string }>(guestId);
  for (const row of progress) {
    const existing = await db.prepare("SELECT lesson_id FROM progress WHERE owner_type = 'user' AND owner_id = ? AND lesson_id = ?").get(userId, row.lesson_id);
    if (!existing) {
      await db.prepare("UPDATE progress SET owner_type = 'user', owner_id = ? WHERE owner_type = 'guest' AND owner_id = ? AND lesson_id = ?").run(userId, guestId, row.lesson_id);
    }
  }
  const conversations = await db.prepare("SELECT id, lesson_id FROM conversations WHERE owner_type = 'guest' AND owner_id = ?").all<{ id: string; lesson_id: string }>(guestId);
  for (const row of conversations) {
    const existing = await db.prepare("SELECT id FROM conversations WHERE owner_type = 'user' AND owner_id = ? AND lesson_id = ?").get(userId, row.lesson_id);
    if (!existing) {
      await db.prepare("UPDATE conversations SET owner_type = 'user', owner_id = ? WHERE id = ?").run(userId, row.id);
    }
  }
  const guestQuota = await db.prepare("SELECT used, window_started_at FROM quotas WHERE owner_type = 'guest' AND owner_id = ?").get(guestId);
  const userQuota = await db.prepare("SELECT owner_id FROM quotas WHERE owner_type = 'user' AND owner_id = ?").get(userId);
  if (guestQuota && !userQuota) {
    await db.prepare("UPDATE quotas SET owner_type = 'user', owner_id = ? WHERE owner_type = 'guest' AND owner_id = ?").run(userId, guestId);
  }
}

export async function registerUser(db: AppDatabase, input: { displayName: string; password: string; guestId: string; locale: Locale; level: string | null; goal: string | null; onboarded: boolean; email?: string }) {
  const name = input.displayName.trim();
  if (!name || name.length > 40) throw new Error("NAME");
  if (input.password.length < 4 || input.password.length > 72) throw new Error("PASSWORD");
  if (await findUserByName(db, name)) throw new Error("TAKEN");
  const id = crypto.randomUUID();
  await withTransaction(db, async () => {
    await db.prepare(
      "INSERT INTO users (id, display_name, password_hash, locale, level, goal, onboarded, email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(id, name, hashPassword(input.password), input.locale, input.level, input.goal, input.onboarded ? 1 : 0, input.email || null, nowIso());
    await migrateGuest(db, input.guestId, id);
  });
  return (await findUser(db, id))!;
}

export async function registerVerifiedUser(db: AppDatabase, input: {
  email: string;
  displayName?: string;
  password?: string;
  passwordHash?: string;
  guestId: string;
  locale: Locale;
}) {
  const email = input.email.trim().toLowerCase();
  let name = input.displayName?.trim() || email.split("@")[0] || email;
  if (name.length > 40) name = name.slice(0, 40);
  if (await findUserByName(db, name)) {
    name = `${name.slice(0, 32)}_${crypto.randomBytes(3).toString("hex")}`;
  }
  const hash = input.passwordHash || (input.password ? hashPassword(input.password) : null);
  if (!hash) throw new Error("PASSWORD");
  const id = crypto.randomUUID();
  await withTransaction(db, async () => {
    await db.prepare(
      "INSERT INTO users (id, display_name, email, email_verified, password_hash, locale, level, goal, onboarded, created_at) VALUES (?, ?, ?, 1, ?, ?, NULL, NULL, 0, ?)"
    ).run(id, name, email, hash, input.locale, nowIso());
    await migrateGuest(db, input.guestId, id);
  });
  return (await findUser(db, id))!;
}

export async function resetUserPassword(db: AppDatabase, email: string, newPassword: string) {
  const cleanEmail = email.trim().toLowerCase();
  const user = await findUserByNameOrEmail(db, cleanEmail);
  if (!user) throw new Error("USER_NOT_FOUND");
  if (newPassword.length < 6 || newPassword.length > 72) throw new Error("PASSWORD");
  await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(newPassword), user.id);
  return user;
}

function canonicalWalletAddress(publicKey: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(publicKey) ? publicKey.toLowerCase() : publicKey;
}

export async function loginWithWallet(db: AppDatabase, input: { publicKey: string; guestId: string; locale: Locale }) {
  const publicKey = canonicalWalletAddress(input.publicKey);
  const existing = await db.prepare("SELECT * FROM users WHERE wallet_address = ?").get<UserRow>(publicKey);
  if (existing) {
    await withTransaction(db, () => migrateGuest(db, input.guestId, existing.id));
    return (await findUser(db, existing.id))!;
  }
  let name = `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`;
  if (await findUserByName(db, name)) name = publicKey.slice(0, 16);
  if (await findUserByName(db, name)) name = `${publicKey.slice(0, 6)}…${crypto.randomBytes(3).toString("hex")}`;
  const id = crypto.randomUUID();
  await withTransaction(db, async () => {
    await db.prepare(
      "INSERT INTO users (id, display_name, password_hash, locale, level, goal, onboarded, wallet_address, created_at) VALUES (?, ?, ?, ?, NULL, NULL, 0, ?, ?)",
    ).run(id, name, hashPassword(crypto.randomBytes(24).toString("hex")), input.locale, publicKey, nowIso());
    await migrateGuest(db, input.guestId, id);
  });
  return (await findUser(db, id))!;
}

export async function loginUser(db: AppDatabase, input: { displayName: string; password: string; guestId: string }) {
  const row = await findUserByName(db, input.displayName);
  if (!row || !verifyPassword(input.password, row.password_hash)) throw new Error("INVALID");
  await withTransaction(db, () => migrateGuest(db, input.guestId, row.id));
  return (await findUser(db, row.id))!;
}

export async function loginWithGoogle(db: AppDatabase, input: {
  googleUid: string;
  displayName: string | null;
  photoUrl: string | null;
  guestId: string;
  locale: Locale;
}) {
  if (!input.googleUid || input.googleUid.length > 128) throw new Error("GOOGLE_UID");
  const existing = await db.prepare("SELECT id FROM users WHERE google_uid = ?").get<{ id: string }>(input.googleUid);
  if (existing) {
    await withTransaction(db, () => migrateGuest(db, input.guestId, existing.id));
    return (await findUser(db, existing.id))!;
  }

  const baseName = input.displayName?.replace(/[\r\n\u0000-\u001f]/g, " ").trim().slice(0, 40) || "Google learner";
  let displayName = baseName;
  if (await findUserByName(db, displayName)) {
    const suffix = ` ·${input.googleUid.slice(0, 8)}`;
    displayName = `${baseName.slice(0, 40 - suffix.length)}${suffix}`;
  }
  if (await findUserByName(db, displayName)) displayName = `Learner ${crypto.randomBytes(6).toString("hex")}`;

  const id = crypto.randomUUID();
  const avatarUrl = input.photoUrl && /^https:\/\//i.test(input.photoUrl) ? input.photoUrl.slice(0, 2048) : null;
  try {
    await withTransaction(db, async () => {
      await db.prepare(
        "INSERT INTO users (id, display_name, password_hash, locale, level, goal, onboarded, wallet_address, google_uid, avatar_url, created_at) VALUES (?, ?, ?, ?, NULL, NULL, 0, NULL, ?, ?, ?)",
      ).run(id, displayName, hashPassword(crypto.randomBytes(32).toString("hex")), input.locale, input.googleUid, avatarUrl, nowIso());
      await migrateGuest(db, input.guestId, id);
    });
    return (await findUser(db, id))!;
  } catch (error) {
    const raced = await db.prepare("SELECT id FROM users WHERE google_uid = ?").get<{ id: string }>(input.googleUid);
    if (!raced) throw error;
    await withTransaction(db, () => migrateGuest(db, input.guestId, raced.id));
    return (await findUser(db, raced.id))!;
  }
}
