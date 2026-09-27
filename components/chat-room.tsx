"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  isGuest,
}: {
  locale: Locale;
  teacher: Teacher;
  lesson: Lesson;
  conversationId: string;
  initialMessages: ChatMessage[];
  initialProgress: ProgressState;
  isGuest: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [progress, setProgress] = useState(initialProgress);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [retry, setRetry] = useState<{ id: string; mode: ChatMode; text: string } | null>(null);
  const [stick, setStick] = useState(true);
  const [unseen, setUnseen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant")?.text ?? "";
  const objectives = lessonObjectives(lesson, locale);
  const current = lesson.practice[progress.practiceIndex];

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
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  }, [draft]);

  async function setLocale(next: Locale) {
    if (next === locale) return;
    await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    router.refresh();
  }

  async function send(mode: ChatMode, text: string, clientMessageId?: string) {
    if (sending) return;
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
      const data = (await response.json()) as { message?: string; messages?: ChatMessage[]; progress?: ProgressState };
      if (!response.ok || !data.messages || !data.progress) {
        setRetry({ id, mode, text });
        setError(data.message || t(locale, "chat.error"));
        return;
      }
      setMessages(data.messages);
      setProgress(data.progress);
      setRetry(null);
      if (mode === "teach") setDraft("");
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
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 md:px-5">
        <Link href={`/teachers/${teacher.id}`} className="grid size-11 shrink-0 place-items-center rounded-full text-primary" aria-label={t(locale, "common.back")}>
          <Icon name="back" />
        </Link>
        <Face teacher={teacher} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{teacher.name[locale]}</p>
          <p className="truncate text-sm text-muted-foreground">
            {t(locale, "teacher.ai")} · {lessonTitle(lesson, locale)}
          </p>
        </div>
        <div className="flex shrink-0 rounded-full bg-[#F4F8FF] p-1" role="group" aria-label={t(locale, "profile.locale")}>
          {(["th", "en"] as const).map((item) => (
            <button key={item} type="button" aria-pressed={locale === item} onClick={() => setLocale(item)} className={`min-h-11 rounded-full px-3 text-sm font-semibold ${locale === item ? "bg-primary text-white" : "text-muted-foreground"}`}>
              {item === "th" ? "TH" : "EN"}
            </button>
          ))}
        </div>
      </header>

      {isGuest ? (
        <p className="shrink-0 bg-[#F4F8FF] px-4 py-2 text-center text-sm md:px-6">
          {t(locale, "guest.banner")}{" "}
          <Link href="/profile" className="font-semibold text-primary">
            {t(locale, "guest.signin")}
          </Link>
        </p>
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
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 py-6 md:px-6">
          {messages.map((message) =>
            message.role === "assistant" ? (
              <article key={message.id} className="flex gap-3">
                <Face teacher={teacher} size={32} />
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-semibold leading-none">{teacher.name[locale]}</p>
                  <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7">{message.text}</p>
                </div>
              </article>
            ) : (
              <article key={message.id} className="flex justify-end">
                <p className="max-w-[min(100%,32rem)] whitespace-pre-wrap rounded-[18px] bg-[#E7EDFF] px-4 py-2.5 text-[15px] leading-7 text-ink">
                  <span className="sr-only">{t(locale, "chat.you")}: </span>
                  {userText(message.text)}
                </p>
              </article>
            ),
          )}
          {sending ? (
            <article className="flex gap-3" aria-hidden>
              <Face teacher={teacher} size={32} />
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-semibold leading-none">{teacher.name[locale]}</p>
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

      <div className="relative shrink-0 bg-white px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-1 md:px-4">
        {unseen ? (
          <div className="absolute inset-x-0 bottom-full z-10 flex justify-center pb-2">
            <button type="button" className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(54,85,214,0.28)]" onClick={() => end.current?.scrollIntoView({ block: "end" })}>
              {t(locale, "chat.newMessages")}
            </button>
          </div>
        ) : null}
        <div className="mx-auto w-full max-w-[760px]">
          {progress.status === "completed" ? (
            <section className="mb-3 rounded-[20px] border border-border bg-[#F4F8FF] p-4">
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
              <Link href="/learning" className="mt-3 inline-flex min-h-12 items-center font-semibold text-primary">
                {t(locale, "chat.next")}
              </Link>
            </section>
          ) : null}
          {progress.phase === "awaiting" && current ? (
            <section className="mb-3 rounded-[20px] border border-border bg-[#F4F8FF] px-4 py-3">
              <p className="text-sm font-semibold text-primary">{t(locale, "chat.practiceCard")}</p>
              <p className="mt-1">{practicePrompt(current, locale)}</p>
            </section>
          ) : null}
          {offline ? <p className="mb-2 text-sm text-muted-foreground">{t(locale, "chat.offline")}</p> : null}
          {error ? (
            <p className="mb-2 text-sm text-error">
              {error}{" "}
              {retry ? (
                <button type="button" className="font-semibold underline" onClick={() => send(retry.mode, retry.text, retry.id)}>
                  {t(locale, "chat.retry")}
                </button>
              ) : null}
            </p>
          ) : null}
          <div className="mb-2 flex flex-wrap gap-2">
            {chipModes.map(([mode, key, icon]) => (
              <Button key={mode} type="button" variant="outline" disabled={sending} onClick={() => send(mode, "")} className="h-11 min-h-11 rounded-full border-border bg-white px-3 text-sm font-semibold text-primary">
                <Icon name={icon} className="size-4" />
                {t(locale, key)}
              </Button>
            ))}
          </div>
          <form
            className="overflow-hidden rounded-[24px] border border-border bg-white shadow-[0_8px_28px_rgba(54,85,214,0.08)] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25"
            onSubmit={(event) => {
              event.preventDefault();
              void send("teach", draft);
            }}
          >
            <label className="block">
              <span className="sr-only">{t(locale, "chat.placeholder")}</span>
              <Textarea
                ref={field}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t(locale, "chat.placeholder")}
                rows={1}
                maxLength={4000}
                className="max-h-40 min-h-12 w-full resize-none rounded-none border-0 bg-transparent px-4 pt-3.5 text-[15px] leading-6 shadow-none [field-sizing:fixed] focus-visible:border-transparent focus-visible:ring-0 md:text-[15px]"
              />
            </label>
            <div className="flex items-center justify-between gap-3 px-2 pb-2">
              <p className={`px-2 text-xs ${draft.length > 2000 ? "text-error" : "text-muted-foreground"} ${draft.length >= 1600 ? "" : "invisible"}`} aria-hidden={draft.length < 1600}>
                {draft.length}/2000
              </p>
              <Button type="submit" size="icon" disabled={sending || !draft.trim()} className="size-11 rounded-full" aria-label={t(locale, "chat.send")}>
                <Icon name="send" />
              </Button>
            </div>
          </form>
          <p className="px-2 pt-2 text-center text-xs text-muted-foreground">{t(locale, "chat.aiNotice")}</p>
        </div>
      </div>
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
