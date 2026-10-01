"use client";

// Adapted from the official assistant-ui thread registry. Melearn's JSON API
// supports text messages; attachment, voice, branching and tool controls are omitted.
import { createContext, useContext, type ReactNode } from "react";
import { ActionBarPrimitive, ComposerPrimitive, MessagePrimitive, ThreadPrimitive, useAuiState } from "@assistant-ui/react";
import { ArrowDown, ArrowUp, Check, Copy } from "lucide-react";
import { MessageMarkdown } from "@/components/message-markdown";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { TooltipIconButton } from "./tooltip-icon-button";

const CopyLabelContext = createContext("Copy response");

export function Thread({ welcome, status, placeholder, sendLabel, copyLabel, scrollLabel, thinkingLabel, notice }: {
  welcome: ReactNode;
  status: ReactNode;
  placeholder: string;
  sendLabel: string;
  copyLabel: string;
  scrollLabel: string;
  thinkingLabel: string;
  notice: string;
}) {
  const empty = useAuiState((state) => state.thread.messages.length === 0);
  const running = useAuiState((state) => state.thread.isRunning);
  return (
    <ThreadPrimitive.Root className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ThreadPrimitive.Viewport className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 pt-[max(64px,env(safe-area-inset-top))] sm:px-5 md:px-6 md:pt-4" autoScroll>
        <div className={`mx-auto flex min-w-0 w-full max-w-[760px] flex-1 flex-col ${empty ? "md:justify-center" : ""}`}>
          {empty ? <div className="flex flex-1 items-center justify-center py-8 md:flex-none md:py-0">{welcome}</div> : (
            <div className="flex flex-col gap-7 pb-6 pt-3 md:pt-6">
              <CopyLabelContext.Provider value={copyLabel}><ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} /></CopyLabelContext.Provider>
            </div>
          )}
          {running ? <p role="status" className="pb-6 text-sm text-muted-foreground motion-safe:animate-pulse">{thinkingLabel}</p> : null}
          <ThreadPrimitive.ViewportFooter className={`sticky bottom-0 mt-auto w-full shrink-0 bg-background pb-[max(12px,env(safe-area-inset-bottom))] pt-3 ${empty ? "md:static md:mt-0" : ""}`}>
            {!empty ? <ThreadPrimitive.ScrollToBottom asChild><TooltipIconButton tooltip={scrollLabel} className="absolute -top-10 left-1/2 size-9 -translate-x-1/2 rounded-full border bg-card shadow-sm disabled:invisible"><ArrowDown className="size-4" /></TooltipIconButton></ThreadPrimitive.ScrollToBottom> : null}
            {status}
            <ComposerPrimitive.Root>
              <InputGroup className="rounded-2xl bg-card shadow-sm">
                <ComposerPrimitive.Input data-slot="input-group-control" disabled={running} placeholder={placeholder} aria-label={placeholder} rows={1} maxRows={6} maxLength={2000} cancelOnEscape={false} addAttachmentOnPaste={false} unstable_insertNewlineOnTouchEnter className="min-h-14 min-w-0 flex-1 resize-none bg-transparent px-3 py-4 text-base leading-6 outline-none placeholder:text-muted-foreground md:min-h-20 md:px-4 md:py-3 md:text-[15px]" />
                <InputGroupAddon align="inline-end" className="shrink-0 self-end py-1.5 pr-2 md:pb-3 md:pr-3">
                  <ComposerPrimitive.Send asChild><Button type="submit" size="icon" className="size-11 rounded-xl md:size-9" aria-label={sendLabel}><ArrowUp className="size-5" /></Button></ComposerPrimitive.Send>
                </InputGroupAddon>
              </InputGroup>
            </ComposerPrimitive.Root>
            <p className="mx-auto max-w-sm px-2 pt-2 text-center text-[11px] leading-4 text-muted-foreground md:max-w-none md:pt-3 md:text-xs">{notice}</p>
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function UserMessage() {
  return <MessagePrimitive.Root className="flex min-w-0 justify-end"><div className="min-w-0 max-w-[90%] whitespace-pre-wrap [overflow-wrap:anywhere] rounded-2xl bg-secondary px-4 py-2.5 text-[15px] leading-6 text-secondary-foreground md:max-w-[85%]"><MessagePrimitive.Parts /></div></MessagePrimitive.Root>;
}

function AssistantMessage() {
  const copyLabel = useContext(CopyLabelContext);
  const copied = useAuiState((state) => state.message.isCopied);
  return (
    <MessagePrimitive.Root className="min-w-0">
      <MessagePrimitive.Parts components={{ Text: ({ text }) => <MessageMarkdown text={text} /> }} />
      <ActionBarPrimitive.Root hideWhenRunning className="mt-2 flex items-center">
        <ActionBarPrimitive.Copy asChild><TooltipIconButton tooltip={copyLabel} className="size-8 rounded-lg text-muted-foreground">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}</TooltipIconButton></ActionBarPrimitive.Copy>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
}
