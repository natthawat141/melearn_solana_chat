import { firebaseWebConfig } from "@/lib/firebase-config";

type FirebaseAccount = {
  localId?: unknown;
  displayName?: unknown;
  photoUrl?: unknown;
  disabled?: unknown;
  providerUserInfo?: Array<{ providerId?: unknown }>;
};

type FirebaseLookupResponse = { users?: FirebaseAccount[] };

export type GoogleIdentity = {
  uid: string;
  displayName: string | null;
  photoUrl: string | null;
};

export type GoogleIdentityResult =
  | { ok: true; identity: GoogleIdentity }
  | { ok: false; reason: "invalid" | "unavailable" };

export async function verifyGoogleFirebaseIdToken(idToken: string): Promise<GoogleIdentityResult> {
  const endpoint = new URL("https://identitytoolkit.googleapis.com/v1/accounts:lookup");
  endpoint.searchParams.set("key", firebaseWebConfig.apiKey);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  if (response.status === 400 || response.status === 401) return { ok: false, reason: "invalid" };
  if (!response.ok) return { ok: false, reason: "unavailable" };

  let account: FirebaseAccount | undefined;
  try {
    const data = (await response.json()) as FirebaseLookupResponse;
    account = data.users?.[0];
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  if (
    typeof account?.localId !== "string" || !account.localId || account.localId.length > 128 ||
    account.disabled === true ||
    !account.providerUserInfo?.some((provider) => provider.providerId === "google.com")
  ) return { ok: false, reason: "invalid" };

  let photoUrl: string | null = null;
  if (typeof account.photoUrl === "string") {
    try {
      const url = new URL(account.photoUrl);
      if (url.protocol === "https:") photoUrl = url.href.slice(0, 2048);
    } catch { /* A missing or invalid Google photo is optional. */ }
  }

  return {
    ok: true,
    identity: {
      uid: account.localId,
      displayName: typeof account.displayName === "string" ? account.displayName.slice(0, 120) : null,
      photoUrl,
    },
  };
}
