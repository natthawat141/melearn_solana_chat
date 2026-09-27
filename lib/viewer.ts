import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { findUser, readSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/format";
import type { Account } from "@/lib/auth";
import type { Locale } from "@/lib/types";

export type Viewer = {
  user: Account | null;
  guestId: string;
  ownerType: "user" | "guest";
  ownerId: string;
  locale: Locale;
  level: string | null;
  goal: string | null;
  onboarded: boolean;
};

type GuestRow = {
  id: string;
  locale: string;
  level: string | null;
  goal: string | null;
  onboarded: number;
};

function asLocale(value: string | null | undefined): Locale {
  return value === "en" ? "en" : "th";
}

export async function getViewer(): Promise<Viewer> {
  const db = getDb();
  const jar = await cookies();
  const headerStore = await headers();
  const guestId = headerStore.get("x-guest-id") || jar.get("ml_guest")?.value || crypto.randomUUID();
  let guest = db.prepare("SELECT * FROM guests WHERE id = ?").get(guestId) as GuestRow | undefined;
  if (!guest) {
    db.prepare("INSERT INTO guests (id, locale, level, goal, onboarded, created_at) VALUES (?, 'th', NULL, NULL, 0, ?)").run(guestId, nowIso());
    guest = db.prepare("SELECT * FROM guests WHERE id = ?").get(guestId) as GuestRow;
  }
  const userId = readSession(jar.get("ml_session")?.value);
  const user = userId ? findUser(db, userId) : null;
  if (user) {
    return {
      user,
      guestId,
      ownerType: "user",
      ownerId: user.id,
      locale: user.locale,
      level: user.level,
      goal: user.goal,
      onboarded: user.onboarded,
    };
  }
  return {
    user: null,
    guestId,
    ownerType: "guest",
    ownerId: guestId,
    locale: asLocale(guest.locale),
    level: guest.level,
    goal: guest.goal,
    onboarded: Boolean(guest.onboarded),
  };
}

export function lessonUnlocked(userId: string | null, lessonId: string, access: "free" | "paid") {
  // Demo keeps every lesson open. Checkout is not wired, so paid does not lock.
  return access === "free" || access === "paid" || Boolean(userId && lessonId);
}
