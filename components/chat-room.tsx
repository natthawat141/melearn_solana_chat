"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MessageMarkdown } from "@/components/message-markdown";
import { Icon } from "@/components/icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";
import { formatWhen } from "@/lib/format";
import { clearLessonDraft, readLessonDraft, writeLessonDraft } from "@/lib/lesson-draft";
import type { QuotaState } from "@/lib/quota";
import { lessonObjectives, lessonTitle, practicePrompt, teacherImage } from "@/lib/content";
import { t } from "@/lib/i18n";
import type { ChatMode, Lesson, Locale, ProgressState, Teacher } from "@/lib/types";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

const chipModes = [
  ["hint", "chat.hint", "hint"],
  ["example", "chat.example", "book"],
  ["practice", "chat.practice", "check"],
] as const;

export function ChatRoom({
  locale,
  teacher,
  lesson,
  conversationId,
  initialMessages,
  initialProgress,
  initialQuota,
  isGuest,
}: {
  locale: Locale;
  teacher: Teacher;
  lesson: Lesson;
  conversationId: string;
  initialMessages: ChatMessage[];
  initialProgress: ProgressState;
  initialQuota: QuotaState;
  isGuest: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [progress, setProgress] = useState(initialProgress);
  const [quota, setQuota] = useState(initialQuota);
  const [draft, setDraft] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [retry, setRetry] = useState<{ id: string; mode: ChatMode; text: string } | null>(null);
  const [stick, setStick] = useState(true);
  const [unseen, setUnseen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const authPath = `/login?next=${encodeURIComponent(`/learn/${lesson.id}`)}`;
  const scroller = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant")?.text ?? "";
  const objectives = lessonObjectives(lesson, locale);
  const current = lesson.practice[progress.practiceIndex];

  useEffect(() => {
    setDraft(readLessonDraft(lesson.id));
    setDraftReady(true);
  }, [lesson.id]);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (stick) end.current?.scrollIntoView({ block: "end" });
    else setUnseen(true);
  }, [messages, sending, stick]);

  useEffect(() => {
    const node = field.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 128)}px`;
  }, [draft]);

  async function send(mode: ChatMode, text: string, clientMessageId?: string) {
    if (isGuest) { setAuthOpen(true); return; }
    if (sending || quota.blocked) return;
    if (mode === "teach" && !text.trim()) return;
    if (text.length > 2000) {
      setError(t(locale, "chat.limit"));
      return;
    }
    const id = clientMessageId || crypto.randomUUID();
    setSending(true);
    setError(null);
    setStick(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientMessageId: id, text, mode }),
      });
      if (response.status === 401) { setAuthOpen(true); setRetry(null); return; }
      const data = (await response.json()) as { message?: string; messages?: ChatMessage[]; progress?: ProgressState; quota?: QuotaState };
      if (data.quota) setQuota(data.quota);
      if (!response.ok || !data.messages || !data.progress) {
        setRetry({ id, mode, text });
        setError(data.message || t(locale, "chat.error"));
        return;
      }
      setMessages(data.messages);
      setProgress(data.progress);
      setRetry(null);
      if (mode === "teach") {
        clearLessonDraft(lesson.id);
        setDraft("");
      }
    } catch {
      setRetry({ id, mode, text });
      setError(offline ? t(locale, "chat.offline") : t(locale, "chat.error"));
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    if (desktop && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send("teach", draft);
    }
  }

  function userText(text: string) {
    const labels = { hint: "chat.hint", example: "chat.example", practice: "chat.practice" } as const;
    if (text === "hint" || text === "example" || text === "practice") return t(locale, labels[text]);
    return text;
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-1 md:px-5 md:py-2">
        <Link href={`/teachers/${teacher.id}`} className="grid size-11 shrink-0 place-items-center rounded-full text-primary" aria-label={t(locale, "common.back")}>
          <Icon name="back" />
        </Link>
        <Face teacher={teacher} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{teacher.name[locale]}</p>
          <p className="truncate text-xs text-muted-foreground md:text-sm">
            {t(locale, "teacher.ai")} · {lessonTitle(lesson, locale)}
          </p>
        </div>
      </header>

      {isGuest ? (
        <div className="shrink-0 border-b border-border bg-muted/40 px-4 py-2">
          <div className="mx-auto flex w-full max-w-[760px] flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="text-sm text-muted-foreground">{t(locale, "chat.previewBanner")}</p>
            <Button type="button" variant="link" size="sm" className="h-8 shrink-0 px-0" onClick={() => setAuthOpen(true)}>
              {t(locale, "auth.register")}
            </Button>
          </div>
        </div>
      ) : null}

      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={(event) => {
          const node = event.currentTarget;
          const near = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
          setStick(near);
          if (near) setUnseen(false);
        }}
      >
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-4 py-4 md:gap-6 md:px-6 md:py-6">
          {messages.map((message) =>
            message.role === "assistant" ? (
              <article key={message.id} className="flex gap-3">
                <div className="hidden md:block"><Face teacher={teacher} size={32} /></div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="hidden text-sm font-semibold leading-none md:block">{teacher.name[locale]}</p>
                  <div className="md:mt-2"><MessageMarkdown text={message.text} /></div>
                </div>
              </article>
            ) : (
              <article key={message.id} className="flex justify-end">
                <p className="max-w-[min(100%,32rem)] whitespace-pre-wrap rounded-[18px] bg-secondary px-4 py-2.5 text-[15px] leading-6 text-secondary-foreground">
                  <span className="sr-only">{t(locale, "chat.you")}: </span>
                  {userText(message.text)}
                </p>
              </article>
            ),
          )}
          {sending ? (
            <article className="flex gap-3" aria-hidden>
              <div className="hidden md:block"><Face teacher={teacher} size={32} /></div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="hidden text-sm font-semibold leading-none md:block">{teacher.name[locale]}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t(locale, "chat.thinking")}</p>
              </div>
            </article>
          ) : null}
          <div ref={end} />
        </div>
      </div>

      <div aria-live="polite" className="sr-only">
        {sending ? t(locale, "chat.thinking") : lastAssistant}
      </div>

      <div className="relative shrink-0 bg-background px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-1 md:px-4">
        {unseen ? (
          <div className="absolute inset-x-0 bottom-full z-10 flex justify-center pb-2">
            <button type="button" className="min-h-11 rounded-full bg-action px-4 text-sm font-semibold text-action-foreground shadow-[0_8px_24px_rgba(54,85,214,0.28)]" onClick={() => end.current?.scrollIntoView({ block: "end" })}>
              {t(locale, "chat.newMessages")}
            </button>
          </div>
        ) : null}
        <div className="mx-auto w-full max-w-[760px]">
          {progress.status === "completed" ? (
            <section className="mb-3 rounded-[20px] border border-border bg-muted p-4">
              <h2 className="text-[18px]">{t(locale, "lesson.complete")}</h2>
              <p className="mt-2 text-sm font-semibold">{t(locale, "chat.goals")}</p>
              <ul className="mt-1 grid gap-1 text-sm">
                {objectives.map((goal, index) => (
                  <li key={goal} className="flex items-center gap-2">
                    <Icon name={progress.results[index] ? "check" : "close"} className="size-4" />
                    {goal}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(locale, "chat.attempts")}: {progress.attempts} · {t(locale, "chat.hints")}: {progress.hintsUsed}
              </p>
              <Link href="/chats" className="mt-3 inline-flex min-h-12 items-center font-semibold text-primary">
                {t(locale, "chat.next")}
              </Link>
            </section>
          ) : null}
          {progress.phase === "awaiting" && current ? (
            <section className="mb-3 rounded-[20px] border border-border bg-muted px-4 py-3">
              <p className="text-sm font-semibold text-primary">{t(locale, "chat.practiceCard")}</p>
              <p className="mt-1">{practicePrompt(current, locale)}</p>
            </section>
          ) : null}
          {offline ? (
            <Alert className="mb-2">
              <AlertDescription>{t(locale, "chat.offline")}</AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive" className="mb-2">
              <AlertDescription>
                {error}{" "}
                {retry ? (
                  <Button type="button" variant="link" className="h-auto px-0" onClick={() => send(retry.mode, retry.text, retry.id)}>
                    {t(locale, "chat.retry")}
                  </Button>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
          {!isGuest ? (
            <p className="mb-2 text-xs text-muted-foreground">
              {quota.blocked
                ? `${t(locale, "quota.blocked")} ${formatWhen(quota.resetAt, locale)}`
                : `${t(locale, "quota.left")} ${quota.remaining}/${quota.limit} ${t(locale, "quota.prompts")}`}
            </p>
          ) : null}
          <div className="mb-1 grid grid-cols-3 gap-1 md:mb-2 md:flex md:gap-2">
            {chipModes.map(([mode, key, icon]) => (
              <Button key={mode} type="button" variant="ghost" size="sm" disabled={sending || (!isGuest && quota.blocked)} onClick={() => send(mode, "")} className="h-11 min-w-0 gap-1.5 px-1 text-xs md:gap-2 md:px-3 md:text-sm">
                <Icon name={icon} className="size-4" />
                {t(locale, key)}
              </Button>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send("teach", draft);
            }}
          >
            <InputGroup className="rounded-xl bg-card">
              <InputGroupTextarea
                ref={field}
                value={draft}
                onChange={(event) => {
                  const next = event.target.value;
                  setDraft(next);
                  if (draftReady) writeLessonDraft(lesson.id, next);
                }}
                onKeyDown={onKeyDown}
                placeholder={t(locale, "chat.placeholder")}
                rows={1}
                maxLength={4000}
                aria-label={t(locale, "chat.placeholder")}
                className="max-h-32 min-h-12 px-3 py-3 text-base leading-6 [field-sizing:fixed] md:text-[15px]"
              />
              <InputGroupAddon align="inline-end" className="self-end py-1">
                <InputGroupButton type="submit" size="icon-sm" variant="default" disabled={sending || (!isGuest && quota.blocked) || !draft.trim()} className="size-11 rounded-full" aria-label={t(locale, "chat.send")}>
                  <Icon name="send" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
          {draft.length >= 1600 ? <p className={`pt-1 text-right text-xs ${draft.length > 2000 ? "text-destructive" : "text-muted-foreground"}`}>{draft.length}/2000</p> : null}
          <p className="px-2 pt-2 text-center text-xs text-muted-foreground">{t(locale, "chat.aiNotice")}</p>
        </div>
      </div>
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="gap-5 p-5 sm:max-w-[400px]">
          <DialogHeader className="gap-3">
            <DialogTitle className="pr-6 text-xl leading-snug">
              {t(locale, "chat.gateTitle")}
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              {t(locale, "chat.gateBody")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-w-0 items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Face teacher={teacher} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{teacher.name[locale]}</p>
              <p className="break-words text-sm text-muted-foreground">{lessonTitle(lesson, locale)}</p>
            </div>
          </div>
          <DialogFooter className="-mx-5 -mb-5 flex-col gap-2 p-5 sm:flex-col">
            <Button asChild className="min-h-11 w-full">
              <Link href={authPath}>
                {t(locale, "auth.login")}
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
            <DialogClose asChild>
              <Button className="min-h-11 w-full" variant="outline">{t(locale, "chat.keepDraft")}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Face({ teacher, size }: { teacher: Teacher; size: 32 | 40 }) {
  const portrait = teacherImage(teacher);
  const box = size === 40 ? "size-10" : "size-8";
  if (portrait) {
    return <Image src={portrait} alt="" width={size} height={size} className={`${box} shrink-0 rounded-full object-cover`} style={{ objectPosition: "50% 20%" }} />;
  }
  return (
    <span className={`grid ${box} shrink-0 place-items-center rounded-full text-sm font-semibold`} style={{ background: teacher.accentBackground }}>
      {teacher.name.en.slice(-1)}
    </span>
  );
}
