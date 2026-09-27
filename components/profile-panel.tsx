"use client";

import bs58 from "bs58";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button, Card, TextField } from "@/components/melearn-ui";
import { shortAddress } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

const levels = ["beginner", "some", "unsure"] as const;
const goals = ["chat", "review", "practice"] as const;

export function ProfilePanel({
  locale,
  signedIn,
  displayName,
  level,
  goal,
  walletAddress,
  tutor,
}: {
  locale: Locale;
  signedIn: boolean;
  displayName: string;
  level: string | null;
  goal: string | null;
  walletAddress: string | null;
  tutor: "lesson" | "model";
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [nextLevel, setNextLevel] = useState(level || "beginner");
  const [nextGoal, setNextGoal] = useState(goal || "chat");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [wallet, setWallet] = useState(walletAddress);

  async function save() {
    setError(null);
    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: name, level: nextLevel, goal: nextGoal, onboarded: true }),
    });
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    if (!response.ok) {
      setError(data?.message || t(locale, "common.error"));
      return;
    }
    setMessage(t(locale, "profile.saved"));
    router.refresh();
  }

  async function linkWallet() {
    setError(null);
    const provider = window.solana?.isPhantom ? window.solana : window.solflare || window.solana;
    if (!provider?.signMessage) {
      setError(t(locale, "pay.noWallet"));
      return;
    }
    const challenge = await fetch("/api/wallet/challenge", { method: "POST" }).then((response) => response.json());
    const signed = await provider.signMessage(new TextEncoder().encode(challenge.message), "utf8");
    const signatureBytes = signed instanceof Uint8Array ? signed : signed.signature;
    const connected = await provider.connect();
    const response = await fetch("/api/wallet/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nonce: challenge.nonce,
        publicKey: connected.publicKey.toString(),
        signature: bs58.encode(signatureBytes),
      }),
    });
    const data = (await response.json()) as { walletAddress?: string; message?: string };
    if (!response.ok || !data.walletAddress) {
      setError(data.message || t(locale, "common.error"));
      return;
    }
    setWallet(data.walletAddress);
    router.refresh();
  }

  async function removeHistory() {
    const response = await fetch("/api/me/learning-history", { method: "DELETE" });
    if (response.ok) {
      setConfirm(false);
      setMessage(t(locale, "profile.deleted"));
      router.refresh();
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  }

  if (!signedIn) {
    return (
      <div className="mx-auto grid w-full max-w-[760px] gap-4 px-5">
        <h1>{t(locale, "profile.title")}</h1>
        <Card>
          <p className="mb-4 text-muted-foreground">{t(locale, "profile.guest")}</p>
          <AuthPanel locale={locale} />
        </Card>
        <p className="text-sm text-muted-foreground">{t(locale, "profile.historyNote")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[760px] gap-4 px-5">
      <h1>{t(locale, "profile.title")}</h1>
      <Card className="grid gap-3">
        <label className="grid gap-1 text-sm font-semibold">
          {t(locale, "profile.name")}
          <TextField value={name} onChange={(event) => setName(event.target.value)} maxLength={40} />
        </label>
        <p className="text-sm font-semibold">{t(locale, "profile.level")}</p>
        <div className="flex flex-wrap gap-2">
          {levels.map((item) => (
            <button key={item} type="button" aria-pressed={nextLevel === item} onClick={() => setNextLevel(item)} className={`min-h-11 rounded-full px-3 text-sm font-semibold ${nextLevel === item ? "bg-primary text-white" : "bg-[#E7EDFF] text-primary"}`}>
              {t(locale, `level.${item}`)}
            </button>
          ))}
        </div>
        <p className="text-sm font-semibold">{t(locale, "profile.goal")}</p>
        <div className="flex flex-wrap gap-2">
          {goals.map((item) => (
            <button key={item} type="button" aria-pressed={nextGoal === item} onClick={() => setNextGoal(item)} className={`min-h-11 rounded-full px-3 text-sm font-semibold ${nextGoal === item ? "bg-primary text-white" : "bg-[#E7EDFF] text-primary"}`}>
              {t(locale, `goal.${item}`)}
            </button>
          ))}
        </div>
        {error ? <p className="text-sm text-error">{error}</p> : null}
        {message ? <p className="text-sm text-success">{message}</p> : null}
        <Button type="button" onClick={save}>
          {t(locale, "profile.save")}
        </Button>
      </Card>
      <Card>
        <p className="font-semibold">{t(locale, "profile.wallet")}</p>
        <p className="mt-1 break-all text-sm">{wallet ? shortAddress(wallet) : t(locale, "profile.walletNone")}</p>
        <Button type="button" variant="secondary" className="mt-3" onClick={linkWallet}>
          {t(locale, "profile.walletLink")}
        </Button>
        <p className="mt-3 text-sm text-muted-foreground">{t(locale, "profile.historyNote")}</p>
      </Card>
      <Card>
        <p className="text-sm text-muted-foreground">{tutor === "model" ? t(locale, "profile.tutorModel") : t(locale, "profile.tutorLesson")}</p>
      </Card>
      <Button type="button" variant="secondary" onClick={logout}>
        {t(locale, "auth.logout")}
      </Button>
      <button type="button" className="min-h-11 text-left font-semibold text-error" onClick={() => setConfirm(true)}>
        {t(locale, "profile.delete")}
      </button>
      <ConfirmDialog
        open={confirm}
        title={t(locale, "profile.deleteConfirm")}
        body={t(locale, "profile.deleteBody")}
        confirmLabel={t(locale, "common.confirm")}
        cancelLabel={t(locale, "common.cancel")}
        onOpenChange={setConfirm}
        onConfirm={removeHistory}
      />
    </div>
  );
}
