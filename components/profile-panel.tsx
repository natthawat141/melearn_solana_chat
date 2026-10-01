"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import bs58 from "bs58";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Copy, LogOut, Wallet, Trash2, SlidersHorizontal, GraduationCap, ChartNoAxesColumn } from "lucide-react";
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
        <h1>{t(locale, "profile.settingsTitle")}</h1>
        <SignedOutState locale={locale} title={t(locale, "profile.signInTitle")} body={t(locale, "profile.guest")} nextPath="/profile" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1040px] space-y-6 px-4 py-5 sm:space-y-8 sm:px-6 md:px-8 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl! font-semibold! tracking-tight">{t(locale, "profile.settingsTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t(locale, "profile.manage")}</p>
        </div>
      </header>
      <div aria-live="polite" className="empty:hidden">
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        {message ? <Alert><AlertDescription>{message}</AlertDescription></Alert> : null}
      </div>
      <Tabs defaultValue="general" onValueChange={() => { setError(null); setMessage(null); }} className="min-w-0 gap-6 sm:gap-8 xl:grid xl:grid-cols-[180px_minmax(0,1fr)] xl:gap-12">
        <TabsList aria-label={t(locale, "profile.sections")} className="grid h-auto group-data-horizontal/tabs:h-auto w-full grid-cols-1 gap-2 self-start bg-transparent p-0 sm:grid-cols-3 xl:flex xl:flex-col xl:items-stretch">
          <TabsTrigger value="general" className="h-auto min-h-11 min-w-0 w-full justify-start gap-2 rounded-lg px-3 py-2 text-left text-sm! whitespace-normal xl:gap-3 xl:px-4"><SlidersHorizontal />{t(locale, "profile.general")}</TabsTrigger>
          <TabsTrigger value="learning" className="h-auto min-h-11 min-w-0 w-full justify-start gap-2 rounded-lg px-3 py-2 text-left text-sm! whitespace-normal xl:gap-3 xl:px-4"><GraduationCap />{t(locale, "profile.preferences")}</TabsTrigger>
          <TabsTrigger value="progress" className="h-auto min-h-11 min-w-0 w-full justify-start gap-2 rounded-lg px-3 py-2 text-left text-sm! whitespace-normal xl:gap-3 xl:px-4"><ChartNoAxesColumn />{t(locale, "profile.progress")}</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="min-w-0 space-y-10">
          <form onSubmit={event => { event.preventDefault(); void perform(() => save("account")); }}>
          <Card className="gap-6 rounded-none bg-transparent p-0 shadow-none ring-0">
            <CardHeader className="px-0"><CardTitle>{t(locale, "profile.account")}</CardTitle></CardHeader>
            <CardContent className="px-0 space-y-6">
              <div className="flex items-center gap-4">
                <ProfileAvatar name={name} src={photo} className="size-16 shrink-0 sm:size-20 [&_[data-slot=avatar-fallback]]:text-2xl sm:[&_[data-slot=avatar-fallback]]:text-3xl" />
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
              <div className="border-y border-border py-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><Wallet className="size-4" />{t(locale, "profile.wallet")}</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm text-muted-foreground">{wallet ? shortAddress(wallet) : t(locale, "profile.walletNone")}</p>
                  {wallet ? <Button type="button" variant="ghost" size="icon" aria-label={t(locale, "profile.copyWallet")} onClick={() => void perform(async () => { await navigator.clipboard.writeText(wallet); setMessage(t(locale, "profile.copied")); })} disabled={pending}><Copy className="size-4" /></Button> : null}
                </div>
                {!wallet ? <Button type="button" variant="outline" className="mt-3" disabled={pending} onClick={() => void perform(linkWallet)}>{t(locale, "profile.walletLink")}</Button> : null}
              </div>
            </CardContent>
            <CardFooter className="rounded-none border-0 bg-transparent px-0 pb-0 pt-4 justify-end">
              <Button type="submit" className="min-h-11" disabled={pending}>
                {pending ? <Spinner /> : null}
                {t(locale, "profile.save")}
              </Button>
            </CardFooter>
          </Card>
          </form>

            <Card className="gap-6 rounded-none bg-transparent p-0 shadow-none ring-0">
              <CardHeader className="px-0"><CardTitle>{t(locale, "profile.appearance")}</CardTitle><CardDescription>{t(locale, "profile.appearanceHint")}</CardDescription></CardHeader>
              <CardContent className="px-0 divide-y divide-border">
                <div className="flex flex-wrap items-center justify-between gap-5 py-6 first:pt-0">
                  <div><p className="font-medium">{t(locale, "profile.language")}</p><p className="text-sm text-muted-foreground">{t(locale, "profile.languageHint")}</p></div>
                  <LanguageSwitcher locale={locale} labelled />
                </div>
                <div className="flex flex-col gap-5 pt-6">
                  <div><p className="font-medium">{t(locale, "profile.theme")}</p><p className="text-sm text-muted-foreground">{t(locale, "profile.themeHint")}</p></div>
                  <ThemeToggle label={t(locale, "profile.theme")} lightLabel={locale === "th" ? "สว่าง" : "Light"} darkLabel={locale === "th" ? "มืด" : "Dark"} />
                </div>
              </CardContent>
            </Card>



            <Card className="gap-6 rounded-none bg-transparent p-0 shadow-none ring-0">
              <CardHeader className="px-0"><CardTitle>{t(locale, "profile.session")}</CardTitle><CardDescription>{t(locale, "profile.sessionHint")}</CardDescription></CardHeader>
              <CardContent className="divide-y divide-border px-0">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
                  <p className="font-medium">{t(locale, "auth.logout")}</p>
                  <Button type="button" variant="outline" disabled={pending} onClick={() => void perform(logout)}><LogOut />{t(locale, "auth.logout")}</Button>
                </div>
                <div className="flex flex-col items-start justify-between gap-4 pt-5 sm:flex-row">
                  <div className="min-w-0 flex-1 space-y-1"><p className="font-medium">{t(locale, "profile.delete")}</p><p className="max-w-md text-sm text-muted-foreground">{t(locale, "profile.deleteBody")}</p></div>
                  <Button type="button" variant="destructive" disabled={pending} onClick={() => setConfirm(true)}><Trash2 />{t(locale, "profile.delete")}</Button>
                </div>
              </CardContent>
            </Card>

        </TabsContent>
        <TabsContent value="learning">
          <form onSubmit={event => { event.preventDefault(); void perform(() => save("learning")); }}>
          <Card className="gap-6 rounded-none bg-transparent p-0 shadow-none ring-0">
            <CardHeader className="px-0"><CardTitle>{t(locale, "profile.preferences")}</CardTitle><CardDescription>{t(locale, "profile.preferencesHint")}</CardDescription></CardHeader>
            <CardContent className="px-0 space-y-8"><EducationPreferences locale={locale} educationStage={nextEducationStage} preferredSubject={nextPreferredSubject} onEducationStage={setNextEducationStage} onPreferredSubject={setNextPreferredSubject} disabled={pending} /><LearningPreferences locale={locale} level={nextLevel} goal={nextGoal} onLevel={setNextLevel} onGoal={setNextGoal} disabled={pending} /></CardContent>
            <CardFooter className="rounded-none border-0 bg-transparent px-0 pb-0 pt-4 justify-end"><Button type="submit" className="min-h-11" disabled={pending}>{pending ? <Spinner /> : null}{t(locale, "profile.save")}</Button></CardFooter>
          </Card>
          </form>
        </TabsContent>
        <TabsContent value="progress">
          <Card className="gap-6 rounded-none bg-transparent p-0 shadow-none ring-0">
            <CardHeader className="px-0"><CardTitle>{t(locale, "profile.progress")}</CardTitle><CardDescription>{t(locale, "profile.progressHint")}</CardDescription></CardHeader>
            <CardContent className="px-0 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-4"><p className="text-2xl font-semibold tabular-nums">{learning.filter(item => item.status !== "completed").length}</p><p className="mt-1 text-muted-foreground">{t(locale, "lesson.inProgress")}</p></div>
                <div className="rounded-lg bg-muted/50 p-4"><p className="text-2xl font-semibold tabular-nums">{learning.filter(item => item.status === "completed").length}</p><p className="mt-1 text-muted-foreground">{t(locale, "lesson.completed")}</p></div>
              </div>
              {learning.length ? <ul className="divide-y divide-border">{learning.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0 space-y-1"><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{formatWhen(item.updatedAt, locale)}</p><Badge variant="secondary">{t(locale, item.status === "completed" ? "lesson.completed" : "lesson.inProgress")}</Badge></div><Button asChild variant="outline"><Link href={`/learn/${item.id}`}>{t(locale, item.status === "completed" ? "teacher.review" : "home.continue")}</Link></Button></li>)}</ul> : <div className="space-y-3 rounded-lg bg-muted/40 p-6 text-center"><p className="text-muted-foreground">{t(locale, "progress.empty")}</p><Button asChild><Link href="/app">{t(locale, "progress.pickTeacher")}</Link></Button></div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <ConfirmDialog open={confirm} title={t(locale, "profile.deleteConfirm")} body={t(locale, "profile.deleteBody")} confirmLabel={t(locale, "common.confirm")} cancelLabel={t(locale, "common.cancel")} onOpenChange={setConfirm} onConfirm={() => perform(removeHistory)} />
    </div>
  );
}
