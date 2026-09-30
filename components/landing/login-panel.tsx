"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { LandingCopy } from "@/content/landing";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { connectSolanaWallet, signSolanaMessage } from "@/lib/wallet";

export function LoginPanel({
  copy,
  locale,
  initialMode = "login",
  nextPath,
}: {
  copy: LandingCopy["auth"];
  locale: Locale;
  initialMode?: "login" | "register";
  nextPath: string;
}) {
  const router = useRouter();
  const isRegister = initialMode === "register";
  const [pending, setPending] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(isRegister);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function signInWithWallet() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const publicKey = await connectSolanaWallet();
      if (!publicKey) {
        setError(t(locale, "auth.walletMissing"));
        return;
      }
      const issued = await fetch("/api/auth/wallet/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicKey }),
      });
      const challenge = (await issued.json().catch(() => null)) as { message?: string; nonce?: string } | null;
      if (!issued.ok || !challenge?.message || !challenge.nonce) {
        setError(challenge?.message || t(locale, "auth.walletFailed"));
        return;
      }
      const proof = await signSolanaMessage(challenge.message);
      if (!proof) {
        setError(t(locale, "auth.walletMissing"));
        return;
      }
      const response = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicKey: proof.publicKey, nonce: challenge.nonce, signature: proof.signature }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; user?: { onboarded: boolean } } | null;
      if (!response.ok || !data?.user) {
        setError(data?.message || t(locale, "auth.walletFailed"));
        return;
      }
      router.replace(data.user.onboarded ? nextPath : `/setup?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    } catch {
      setError(t(locale, "auth.walletRejected"));
    } finally {
      setPending(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = new FormData(event.currentTarget);
    const displayName = String(values.get("displayName") ?? "").trim();
    const password = String(values.get("password") ?? "");
    const nextNameError = !displayName || displayName.length > 40 ? t(locale, "auth.nameInvalid") : null;
    const nextPasswordError = !password || password.length > 72 || password.length < 4 ? t(locale, "auth.shortPassword") : null;
    setNameError(nextNameError);
    setPasswordError(nextPasswordError);
    setError(null);
    if (nextNameError || nextPasswordError) return;
    setPending(true);
    try {
      const response = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, password }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; user?: { onboarded: boolean } } | null;
      if (!response.ok || !data?.user) {
        setError(data?.message || copy.error);
        return;
      }
      router.replace(data.user.onboarded ? nextPath : `/setup?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    } catch {
      setError(copy.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <h1>{isRegister ? copy.registerTitle : copy.title}</h1>
      <p>{isRegister ? copy.registerBody : copy.body}</p>

      <p>
        <button className="border border-current px-2 py-1" type="button" disabled={pending} onClick={() => void signInWithWallet()}>
          {pending ? copy.pending : t(locale, "auth.walletAction")}
        </button>
      </p>
      <p>{t(locale, "auth.walletProviders")}</p>
      <p>{t(locale, "auth.walletNote")}</p>
      {error ? <p role="alert">{error}</p> : null}

      {isRegister || passwordOpen ? (
        <form onSubmit={submitPassword} aria-busy={pending}>
          <p>
            <label htmlFor="account-name">{copy.name}</label><br />
            <input
              className="border border-current px-1 py-0.5"
              id="account-name"
              name="displayName"
              autoComplete="username"
              required
              maxLength={40}
              disabled={pending}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "account-name-error" : undefined}
            />
            {nameError ? <span id="account-name-error" role="alert"> {nameError}</span> : null}
          </p>
          <p>
            <label htmlFor="account-password">{copy.password}</label><br />
            <input
              className="border border-current px-1 py-0.5"
              id="account-password"
              name="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              maxLength={72}
              disabled={pending}
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? "account-password-error" : undefined}
            />
            {passwordError ? <span id="account-password-error" role="alert"> {passwordError}</span> : null}
          </p>
          <button className="border border-current px-2 py-1" type="submit" disabled={pending}>{pending ? copy.pending : isRegister ? copy.register : copy.submit}</button>
        </form>
      ) : (
        <p>
          <button className="border border-current px-2 py-1" type="button" disabled={pending} onClick={() => setPasswordOpen(true)}>
            {t(locale, "auth.passwordInstead")}
          </button>
        </p>
      )}

      <p>
        <a className="underline" href={`/login?next=${encodeURIComponent(nextPath)}&mode=${isRegister ? "login" : "register"}`}>
          {isRegister ? copy.switchLogin : copy.switchRegister}
        </a>
      </p>
      <p>{copy.note}</p>
    </section>
  );
}
