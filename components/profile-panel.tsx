"use client";

import bs58 from "bs58";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LearningPreferences } from "@/components/learning-preferences";
import { SignedOutState } from "@/components/signed-out-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { clearLessonDrafts } from "@/lib/lesson-draft";
import { shortAddress } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

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
  const [nextLevel, setNextLevel] = useState(level || "unsure");
  const [nextGoal, setNextGoal] = useState(goal || "chat");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [wallet, setWallet] = useState(walletAddress);

  async function save() {
    setPending(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: name, level: nextLevel, goal: nextGoal, onboarded: true }),
    });
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    setPending(false);
    if (!response.ok) {
      setError(data?.message || t(locale, "profile.saveError"));
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
    setMessage(t(locale, "profile.saved"));
    router.refresh();
  }

  async function removeHistory() {
    const response = await fetch("/api/me/learning-history", { method: "DELETE" });
    if (response.ok) {
      setConfirm(false);
      setMessage(t(locale, "profile.deleted"));
      router.refresh();
      return;
    }
    setError(t(locale, "common.error"));
  }

  async function logout() {
    clearLessonDrafts();
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  }

  if (!signedIn) {
    return (
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-5">
        <h1>{t(locale, "profile.title")}</h1>
        <SignedOutState locale={locale} title={t(locale, "profile.signInTitle")} body={t(locale, "profile.guest")} nextPath="/profile" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-5">
      <h1>{t(locale, "profile.title")}</h1>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>{t(locale, "profile.account")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="profile-name">{t(locale, "profile.name")}</FieldLabel>
              <Input id="profile-name" className="h-12" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} autoComplete="username" />
            </Field>
          </FieldGroup>
          <p className="mt-4 text-sm font-semibold">{t(locale, "profile.wallet")}</p>
          <p className="mt-1 break-all text-sm text-muted-foreground">{wallet ? shortAddress(wallet) : t(locale, "profile.walletNone")}</p>
          <Button type="button" variant="outline" className="mt-3 min-h-11" onClick={() => void linkWallet()}>
            {t(locale, "profile.walletLink")}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t(locale, "profile.preferences")}</CardTitle>
          <CardDescription>{t(locale, "onboarding.body")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LearningPreferences locale={locale} level={nextLevel} goal={nextGoal} onLevel={setNextLevel} onGoal={setNextGoal} disabled={pending} />
        </CardContent>
        <CardFooter>
          <Button type="button" className="min-h-11" disabled={pending} onClick={() => void save()}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {t(locale, "profile.save")}
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">{tutor === "model" ? t(locale, "profile.tutorModel") : t(locale, "profile.tutorLesson")}</p>
          <p className="mt-3 text-sm text-muted-foreground">{t(locale, "profile.historyNote")}</p>
        </CardContent>
      </Card>
      <Button type="button" variant="outline" className="min-h-11 w-fit" onClick={() => void logout()}>
        {t(locale, "auth.logout")}
      </Button>
      <Button type="button" variant="ghost" className="min-h-11 w-fit text-destructive" onClick={() => setConfirm(true)}>
        {t(locale, "profile.delete")}
      </Button>
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
