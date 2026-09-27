"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/icon";
import { lessonObjectives, lessonTitle, practicePrompt, teacherImage } from "@/lib/content";
import { t } from "@/lib/i18n";
import type { ChatMode, Lesson, Locale, ProgressState, Teacher } from "@/lib/types";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

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
  }, [messages, stick]);

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

  const portrait = teacherImage(teacher);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-[760px] flex-col px-5 md:min-h-[calc(100dvh-5rem)]">
      <header className="flex items-center gap-3 py-3">
        <Link href={`/teachers/${teacher.id}`} className="grid size-11 place-items-center rounded-full text-primary" aria-label={t(locale, "common.back")}>
          <Icon name="back" />
        </Link>
        {portrait ? (
          <Image src={portrait} alt={teacher.name[locale]} width={44} height={44} className="size-11 rounded-full object-cover" style={{ objectPosition: "50% 20%" }} />
        ) : (
          <span className="grid size-11 place-items-center rounded-full font-semibold" style={{ background: teacher.accentBackground }}>
            {teacher.name.en.slice(-1)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{teacher.name[locale]}</p>
          <p className="truncate text-sm text-muted">
            {t(locale, "teacher.ai")} · {teacher.subject[locale]}
          </p>
        </div>
      </header>
      <p className="rounded-[18px] bg-surface px-4 py-3 text-sm font-semibold">{lessonTitle(lesson, locale)}</p>
      {isGuest ? (
        <p className="mt-3 rounded-[18px] bg-[#E7EDFF] px-4 py-3 text-sm">
          {t(locale, "guest.banner")}{" "}
          <Link href="/profile" className="font-semibold text-primary">
            {t(locale, "guest.signin")}
          </Link>
        </p>
      ) : null}
      <div
        ref={scroller}
        className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto"
        onScroll={(event) => {
          const node = event.currentTarget;
          const near = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
          setStick(near);
          if (near) setUnseen(false);
        }}
      >
        {messages.map((message) => (
          <p
            key={message.id}
            className={`max-w-[90%] whitespace-pre-wrap rounded-[18px] px-4 py-3 ${message.role === "user" ? "ml-auto bg-primary text-white" : ""}`}
            style={message.role === "assistant" ? { background: teacher.accentBackground } : undefined}
          >
            <span className="sr-only">{message.role === "user" ? t(locale, "chat.you") : teacher.name[locale]}: </span>
            {message.text}
          </p>
        ))}
        <div ref={end} />
      </div>
      <div aria-live="polite" className="sr-only">
        {sending ? t(locale, "chat.thinking") : lastAssistant}
      </div>
      {unseen ? (
        <button type="button" className="mx-auto mt-2 min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white" onClick={() => end.current?.scrollIntoView({ block: "end" })}>
          {t(locale, "chat.newMessages")}
        </button>
      ) : null}
      {progress.status === "completed" ? (
        <section className="mt-3 rounded-[20px] border border-border bg-surface p-4">
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
          <p className="mt-2 text-sm text-muted">
            {t(locale, "chat.attempts")}: {progress.attempts} · {t(locale, "chat.hints")}: {progress.hintsUsed}
          </p>
          <Link href="/learning" className="mt-3 inline-flex min-h-12 items-center font-semibold text-primary">
            {t(locale, "chat.next")}
          </Link>
        </section>
      ) : null}
      {progress.phase === "awaiting" && current ? (
        <section className="mt-3 rounded-[20px] bg-[#F4F8FF] p-4">
          <p className="text-sm font-semibold">{t(locale, "chat.practiceCard")}</p>
          <p className="mt-1">{practicePrompt(current, locale)}</p>
        </section>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {([
          ["hint", "chat.hint", "hint"],
          ["example", "chat.example", "book"],
          ["practice", "chat.practice", "check"],
        ] as const).map(([mode, key, icon]) => (
          <button key={mode} type="button" disabled={sending} onClick={() => send(mode, "")} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#E7EDFF] px-3 text-sm font-semibold text-primary disabled:opacity-60">
            <Icon name={icon} className="size-4" />
            {t(locale, key)}
          </button>
        ))}
      </div>
      {offline ? <p className="mt-2 text-sm text-muted">{t(locale, "chat.offline")}</p> : null}
      {error ? (
        <p className="mt-2 text-sm text-error">
          {error}{" "}
          {retry ? (
            <button type="button" className="font-semibold underline" onClick={() => send(retry.mode, retry.text, retry.id)}>
              {t(locale, "chat.retry")}
            </button>
          ) : null}
        </p>
      ) : null}
      {sending ? <p className="mt-2 text-sm text-muted">{t(locale, "chat.thinking")}</p> : null}
      <form
        className="sticky bottom-0 mt-3 flex items-end gap-2 bg-bg pb-[max(12px,env(safe-area-inset-bottom))] pt-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send("teach", draft);
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t(locale, "chat.placeholder")}</span>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t(locale, "chat.placeholder")}
            rows={2}
            maxLength={4000}
            className="w-full resize-none rounded-[12px] border border-border bg-surface px-3 py-3 outline-none"
          />
        </label>
        <button type="submit" disabled={sending || !draft.trim()} className="grid size-12 place-items-center rounded-[14px] bg-primary text-white disabled:bg-border disabled:text-muted" aria-label={t(locale, "chat.placeholder")}>
          <Icon name="send" />
        </button>
      </form>
      {draft.length >= 1600 ? <p className={`text-right text-xs ${draft.length > 2000 ? "text-error" : "text-muted"}`}>{draft.length}/2000</p> : null}
      <p className="pb-2 text-xs text-muted">{t(locale, "chat.aiNotice")}</p>
    </div>
  );
}
