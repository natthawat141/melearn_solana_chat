"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import bs58 from "bs58";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Copy, LogOut, Wallet, Trash2 } from "lucide-react";
import { ProfileAvatar } from "@/components/profile-avatar";
import { EducationPreferences } from "@/components/education-preferences";
import { LearningPreferences } from "@/components/learning-preferences";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignedOutState } from "@/components/signed-out-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { clearLessonDrafts } from "@/lib/lesson-draft";
import { formatWhen, shortAddress } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export type ProfileLearningItem = { id: string; title: string; status: string; updatedAt: string };

export function ProfilePanel({
  locale,
  signedIn,
  displayName,
  level,
  goal,
  walletAddress,
  avatarUrl,
  learning,
  educationStage,
  preferredSubject,
}: {
  locale: Locale;
  signedIn: boolean;
  displayName: string;
  level: string | null;
  goal: string | null;
  walletAddress: string | null;
  avatarUrl: string | null;
  learning: ProfileLearningItem[];
  educationStage: string | null;
  preferredSubject: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [nextLevel, setNextLevel] = useState(level || "unsure");
  const [nextEducationStage, setNextEducationStage] = useState(educationStage);
  const [nextPreferredSubject, setNextPreferredSubject] = useState(preferredSubject);
  const [nextGoal, setNextGoal] = useState(goal || "chat");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [wallet, setWallet] = useState(walletAddress);
  const [photo, setPhoto] = useState(avatarUrl);
  const imageInput = useRef<HTMLInputElement>(null);

  async function perform(action: () => Promise<void>) {
    if (pending) return;
    setPending(true); setError(null); setMessage(null);
    try { await action(); }
    catch { setError(t(locale, "common.error")); }
    finally { setPending(false); }
  }

  async function uploadImage(file: File) {
    const form = new FormData(); form.append("image", file);
    const response = await fetch("/api/me/avatar", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) { setError(data.message || t(locale, "common.error")); return; }
    setPhoto(data.avatarUrl); setMessage(t(locale, "profile.photoSaved")); router.refresh();
  }

  async function save(section: "account" | "learning") {
    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(section === "account" ? { displayName: name } : { level: nextLevel, goal: nextGoal, educationStage: nextEducationStage, preferredSubject: nextPreferredSubject, onboarded: true }),
    });
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
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
    const connected = await provider.connect();
    const challengeResponse = await fetch("/api/wallet/challenge", { method: "POST" });
    const challenge = await challengeResponse.json();
    if (!challengeResponse.ok || !challenge.message) { setError(challenge.message || t(locale, "common.error")); return; }
    const signed = await provider.signMessage(new TextEncoder().encode(challenge.message), "utf8");
    const signatureBytes = signed instanceof Uint8Array ? signed : signed.signature;
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
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) throw new Error("LOGOUT");
    clearLessonDrafts();
    router.refresh();
  }

  if (!signedIn) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-[960px] flex-col gap-4 px-5 py-6 md:px-8 md:py-8">
        <h1>{t(locale, "profile.title")}</h1>
        <SignedOutState locale={locale} title={t(locale, "profile.signInTitle")} body={t(locale, "profile.guest")} nextPath="/profile" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1040px] space-y-6 px-5 py-7 md:px-8 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t(locale, "profile.title")}</h1>
          <p className="text-sm text-muted-foreground">{t(locale, "profile.manage")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={pending}
          onClick={() => void perform(logout)}
        >
          {pending ? <Spinner /> : <LogOut className="size-4" />}
          <span>{t(locale, "auth.logout")}</span>
        </Button>
      </header>
      <div aria-live="polite">
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        {message ? <Alert><AlertDescription>{message}</AlertDescription></Alert> : null}
      </div>
      <Tabs defaultValue="account" className="gap-5">
        <TabsList aria-label={t(locale, "profile.sections")} className="grid h-auto group-data-horizontal/tabs:h-auto w-full grid-cols-2 gap-1 bg-muted/60 p-1 sm:grid-cols-4">
          <TabsTrigger value="account" className="min-h-11">{t(locale, "profile.account")}</TabsTrigger>
          <TabsTrigger value="learning" className="min-h-11">{t(locale, "profile.preferences")}</TabsTrigger>
          <TabsTrigger value="progress" className="min-h-11">{t(locale, "profile.progress")}</TabsTrigger>
          <TabsTrigger value="settings" className="min-h-11">{t(locale, "profile.session")}</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <form onSubmit={event => { event.preventDefault(); void perform(() => save("account")); }}>
          <Card>
            <CardHeader><CardTitle>{t(locale, "profile.account")}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <ProfileAvatar name={name} src={photo} className="size-20 shrink-0 [&_[data-slot=avatar-fallback]]:text-3xl" />
                <div className="min-w-0 space-y-2">
                  <p className="truncate font-semibold">{displayName}</p>
                  <input ref={imageInput} type="file" hidden aria-label={t(locale, "profile.photo")} accept="image/jpeg,image/png,image/webp" disabled={pending} onChange={event => { const file = event.target.files?.[0]; if (file) void perform(() => uploadImage(file)); event.target.value = ""; }} />
                  <Button type="button" variant="outline" disabled={pending} onClick={() => imageInput.current?.click()}><Camera />{t(locale, "profile.photo")}</Button>
                  <p className="text-xs text-muted-foreground">{t(locale, "profile.photoHint")}</p>
                </div>
              </div>
              <FieldGroup>
                <Field><FieldLabel htmlFor="profile-name">{t(locale, "profile.name")}</FieldLabel><Input id="profile-name" className="h-11" value={name} onChange={event => setName(event.target.value)} maxLength={40} required disabled={pending} autoComplete="nickname" /></Field>
              </FieldGroup>
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><Wallet className="size-4" />{t(locale, "profile.wallet")}</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm text-muted-foreground">{wallet ? shortAddress(wallet) : t(locale, "profile.walletNone")}</p>
                  {wallet ? <Button type="button" variant="ghost" size="icon" aria-label={t(locale, "profile.copyWallet")} onClick={() => void perform(async () => { await navigator.clipboard.writeText(wallet); setMessage(t(locale, "profile.copied")); })} disabled={pending}><Copy className="size-4" /></Button> : null}
                </div>
                {!wallet ? <Button type="button" variant="outline" className="mt-3" disabled={pending} onClick={() => void perform(linkWallet)}>{t(locale, "profile.walletLink")}</Button> : null}
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={pending}
                onClick={() => void perform(logout)}
              >
                <LogOut className="size-4" />
                <span>{t(locale, "auth.logout")}</span>
              </Button>
              <Button type="submit" className="min-h-11" disabled={pending}>
                {pending ? <Spinner /> : null}
                {t(locale, "profile.save")}
              </Button>
            </CardFooter>
          </Card>
          </form>
        </TabsContent>
        <TabsContent value="learning">
          <form onSubmit={event => { event.preventDefault(); void perform(() => save("learning")); }}>
          <Card>
            <CardHeader><CardTitle>{t(locale, "profile.preferences")}</CardTitle><CardDescription>{t(locale, "profile.preferencesHint")}</CardDescription></CardHeader>
            <CardContent className="space-y-8"><EducationPreferences locale={locale} educationStage={nextEducationStage} preferredSubject={nextPreferredSubject} onEducationStage={setNextEducationStage} onPreferredSubject={setNextPreferredSubject} disabled={pending} /><LearningPreferences locale={locale} level={nextLevel} goal={nextGoal} onLevel={setNextLevel} onGoal={setNextGoal} disabled={pending} /></CardContent>
            <CardFooter className="justify-end"><Button type="submit" className="min-h-11" disabled={pending}>{pending ? <Spinner /> : null}{t(locale, "profile.save")}</Button></CardFooter>
          </Card>
          </form>
        </TabsContent>
        <TabsContent value="progress">
          <Card>
            <CardHeader><CardTitle>{t(locale, "profile.progress")}</CardTitle><CardDescription>{t(locale, "profile.progressHint")}</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-4"><p className="text-2xl font-semibold tabular-nums">{learning.filter(item => item.status !== "completed").length}</p><p className="mt-1 text-muted-foreground">{t(locale, "lesson.inProgress")}</p></div>
                <div className="rounded-xl border p-4"><p className="text-2xl font-semibold tabular-nums">{learning.filter(item => item.status === "completed").length}</p><p className="mt-1 text-muted-foreground">{t(locale, "lesson.completed")}</p></div>
              </div>
              {learning.length ? <ul className="divide-y rounded-xl border px-4">{learning.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0 space-y-1"><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{formatWhen(item.updatedAt, locale)}</p><Badge variant="secondary">{t(locale, item.status === "completed" ? "lesson.completed" : "lesson.inProgress")}</Badge></div><Button asChild variant="outline"><Link href={`/learn/${item.id}`}>{t(locale, item.status === "completed" ? "teacher.review" : "home.continue")}</Link></Button></li>)}</ul> : <div className="space-y-3 rounded-xl border border-dashed p-6 text-center"><p className="text-muted-foreground">{t(locale, "progress.empty")}</p><Button asChild><Link href="/app">{t(locale, "progress.pickTeacher")}</Link></Button></div>}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="settings">
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle>{t(locale, "profile.appearance")}</CardTitle><CardDescription>{t(locale, "profile.appearanceHint")}</CardDescription></CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                  <div><p className="font-medium">{t(locale, "profile.language")}</p><p className="text-sm text-muted-foreground">{t(locale, "profile.languageHint")}</p></div>
                  <LanguageSwitcher locale={locale} />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                  <div><p className="font-medium">{t(locale, "profile.theme")}</p><p className="text-sm text-muted-foreground">{t(locale, "profile.themeHint")}</p></div>
                  <ThemeToggle label={t(locale, "profile.theme")} lightLabel={t(locale, "profile.themeLight")} darkLabel={t(locale, "profile.themeDark")} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{t(locale, "profile.session")}</CardTitle><CardDescription>{t(locale, "profile.sessionHint")}</CardDescription></CardHeader>
              <CardFooter className="flex flex-wrap justify-between gap-3">
                <Button type="button" variant="outline" disabled={pending} onClick={() => void perform(logout)}><LogOut />{t(locale, "auth.logout")}</Button>
                <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={pending} onClick={() => setConfirm(true)}><Trash2 />{t(locale, "profile.delete")}</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      <ConfirmDialog open={confirm} title={t(locale, "profile.deleteConfirm")} body={t(locale, "profile.deleteBody")} confirmLabel={t(locale, "common.confirm")} cancelLabel={t(locale, "common.cancel")} onOpenChange={setConfirm} onConfirm={() => perform(removeHistory)} />
    </div>
  );
}
