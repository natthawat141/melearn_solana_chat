"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField } from "@/components/melearn-ui";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export function AuthPanel({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch(mode === "register" ? "/api/auth/register" : "/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName, password }),
    });
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    setPending(false);
    if (!response.ok) {
      setError(data?.message || t(locale, "common.error"));
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <h2>{mode === "register" ? t(locale, "auth.registerTitle") : t(locale, "auth.loginTitle")}</h2>
      <label className="grid gap-1 text-sm font-semibold">
        {t(locale, "auth.name")}
        <TextField value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="nickname" required maxLength={40} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        {t(locale, "auth.password")}
        <TextField type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "register" ? "new-password" : "current-password"} required minLength={4} maxLength={72} />
      </label>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {mode === "register" ? t(locale, "auth.register") : t(locale, "auth.login")}
      </Button>
      <button
        type="button"
        className="min-h-11 text-left text-sm font-semibold text-primary"
        onClick={() => {
          setMode(mode === "register" ? "login" : "register");
          setError(null);
        }}
      >
        {mode === "register" ? t(locale, "auth.switchLogin") : t(locale, "auth.switchRegister")}
      </button>
    </form>
  );
}
