"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AssistantRuntimeProvider, useExternalStoreRuntime } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatWhen } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { QuotaState } from "@/lib/quota";
import type { Locale } from "@/lib/types";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

export function GeneralChatRoom({ locale, conversationId, initialMessages, initialQuota }: {
  locale: Locale;
  conversationId: string;
  initialMessages: ChatMessage[];
  initialQuota: QuotaState;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [quota, setQuota] = useState(initialQuota);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState<{ id: string; text: string } | null>(null);
  const [offline, setOffline] = useState(false);
  const busy = useRef(false);
  const router = useRouter();
  const th = locale === "th";
  const lastAssistant = messages.findLast((message) => message.role === "assistant")?.text ?? "";

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

  async function send(text: string, clientMessageId?: string) {
    const clean = text.trim();
    if (busy.current || quota.blocked || !clean) return;
    if (clean.length > 2000) {
      setError(t(locale, "chat.limit"));
      runtime.thread.composer.setText(text);
      return;
    }
    const id = clientMessageId || crypto.randomUUID();
    busy.current = true;
    const previous = messages;
    setMessages([...previous, { id, role: "user", text: clean }]);
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/chat/${conversationId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientMessageId: id, text: clean }),
      });
      if (response.status === 401) {
        window.location.assign(`/login?next=${encodeURIComponent(`/chat/${conversationId}`)}`);
        return;
      }
      const data = (await response.json()) as { code?: string; message?: string; messages?: ChatMessage[]; quota?: QuotaState };
      if (data.quota) setQuota(data.quota);
      if (!response.ok || !data.messages) {
        setMessages(previous);
        setRetry(data.code === "QUOTA" ? null : { id, text: clean });
        runtime.thread.composer.setText(clean);
        setError(data.message || t(locale, "chat.error"));
        return;
      }
      setMessages(data.messages);
      setRetry(null);
      router.refresh();
    } catch {
      setMessages(previous);
      setRetry({ id, text: clean });
      runtime.thread.composer.setText(clean);
      setError(!navigator.onLine ? t(locale, "chat.offline") : t(locale, "chat.error"));
    } finally {
      busy.current = false;
      setSending(false);
    }
  }

  const runtime = useExternalStoreRuntime<ChatMessage>({
    messages,
    isRunning: sending,
    isSendDisabled: sending || quota.blocked || offline,
    convertMessage: (message) => ({ id: message.id, role: message.role, content: [{ type: "text", text: message.text }] }),
    onNew: async (message) => {
      const text = message.content.filter((part) => part.type === "text").map((part) => part.text).join("\n");
      // A resubmission of the failed draft must reuse its server idempotency key.
      await send(text, retry?.text === text.trim() ? retry.id : undefined);
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background">
        <SidebarTrigger className="absolute left-3 top-[max(12px,env(safe-area-inset-top))] z-20 size-11 rounded-lg bg-background md:hidden" aria-label={th ? "เปิดเมนู" : "Open sidebar"} />
        <div className="sr-only" aria-live="polite">{sending ? "" : lastAssistant}</div>
        <Thread
          welcome={<div className="w-full px-3 text-center md:px-0 md:pb-5"><h2 className="mx-auto! max-w-[22ch] text-[22px]! font-semibold! leading-snug! text-balance md:max-w-none md:text-3xl!">{t(locale, "chat.generalWelcome")}</h2><p className="mx-auto mt-3 max-w-[34ch] text-sm leading-6 text-pretty text-muted-foreground md:max-w-lg md:text-base">{t(locale, "chat.generalDescription")}</p></div>}
          status={<>
            {offline ? <Alert className="mb-3"><AlertDescription>{t(locale, "chat.offline")}</AlertDescription></Alert> : null}
            {error ? <Alert variant="destructive" className="mb-3"><AlertDescription>{error}{retry ? <Button type="button" variant="link" className="ml-2 h-auto px-0" disabled={sending || quota.blocked || offline} onClick={() => { runtime.thread.composer.setText(""); void send(retry.text, retry.id); }}>{t(locale, "chat.retry")}</Button> : null}</AlertDescription></Alert> : null}
            <p className="mb-2 px-1 text-xs text-muted-foreground">{quota.blocked ? `${t(locale, "quota.blocked")} ${formatWhen(quota.resetAt, locale)}` : `${t(locale, "quota.left")} ${quota.remaining}/${quota.limit} ${t(locale, "quota.prompts")}`}</p>
          </>}
          placeholder={t(locale, "chat.generalPlaceholder")}
          sendLabel={t(locale, "chat.send")}
          copyLabel={th ? "คัดลอกคำตอบ" : "Copy response"}
          scrollLabel={th ? "ไปข้อความล่าสุด" : "Scroll to latest message"}
          thinkingLabel={t(locale, "chat.generalThinking")}
          notice={t(locale, "chat.aiNotice")}
        />
      </div>
    </AssistantRuntimeProvider>
  );
}
