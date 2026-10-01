"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowUpRight, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import type { ChatHistoryItem } from "@/lib/chat-groups";
import type { Locale } from "@/lib/types";

export function ChatHistoryActions({ item, locale, current }: { item: ChatHistoryItem; locale: Locale; current: boolean }) {
  const router = useRouter();
  const [copyState, setCopyState] = useState<"ready" | "copied" | "failed">("ready");
  const [action, setAction] = useState<"rename" | "delete" | null>(null);
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const th = locale === "th";
  const renameLabel = th ? "เปลี่ยนชื่อ" : "Rename";
  const deleteLabel = th ? "ลบแชต" : "Delete chat";

  function open(next: "rename" | "delete") {
    setTitle((item.fullTitle || item.title).slice(0, 100));
    setError(null);
    setAction(next);
  }

  async function submit() {
    if (!action || busy.current || (action === "rename" && !title.trim())) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/chat/${encodeURIComponent(item.id)}`, {
        method: action === "rename" ? "PATCH" : "DELETE",
        ...(action === "rename" ? { headers: { "content-type": "application/json" }, body: JSON.stringify({ title: title.trim() }) } : {}),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || (th ? "ทำรายการไม่สำเร็จ ลองอีกครั้ง" : "Could not complete the action. Try again."));
      }
      setAction(null);
      if (action === "delete" && current) router.replace("/chat");
      else router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (th ? "ทำรายการไม่สำเร็จ ลองอีกครั้ง" : "Could not complete the action. Try again."));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return <>
    <DropdownMenu onOpenChange={(opened) => { if (opened) setCopyState("ready"); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`${th ? "ตัวเลือกแชต" : "Chat options"}: ${item.title}`} className={`absolute right-1 top-1 size-8 rounded-md text-muted-foreground md:opacity-0 md:group-hover/history-row:opacity-100 md:group-focus-within/history-row:opacity-100 data-[state=open]:opacity-100 ${current ? "md:opacity-100" : ""}`}><MoreHorizontal className="size-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="min-w-44" onCloseAutoFocus={(event) => { if (action) event.preventDefault(); }}>
        <DropdownMenuItem onSelect={() => open("rename")}><Pencil />{renameLabel}</DropdownMenuItem>
        <DropdownMenuItem asChild><Link href={item.href} target="_blank" rel="noopener noreferrer"><ArrowUpRight />{th ? "เปิดในแท็บใหม่" : "Open in new tab"}</Link></DropdownMenuItem>
        <DropdownMenuItem onSelect={(event) => {
          event.preventDefault();
          void (navigator.clipboard ? navigator.clipboard.writeText(new URL(item.href, window.location.origin).href) : Promise.reject(new Error("Clipboard unavailable"))).then(() => setCopyState("copied"), () => setCopyState("failed"));
        }}><Copy />{copyState === "copied" ? (th ? "คัดลอกแล้ว" : "Copied") : copyState === "failed" ? (th ? "คัดลอกไม่สำเร็จ ลองอีกครั้ง" : "Copy failed. Try again") : (th ? "คัดลอกลิงก์แชต" : "Copy chat link")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => open("delete")}><Trash2 />{deleteLabel}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={action !== null} onOpenChange={(opened) => { if (!opened && !busy.current) setAction(null); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{action === "rename" ? renameLabel : deleteLabel}</DialogTitle>
            <DialogDescription>{action === "rename" ? (th ? "ตั้งชื่อเพื่อค้นหาแชตนี้ได้ง่ายขึ้น" : "Choose a name that makes this chat easier to find.") : (th ? `ลบ “${item.title}” และข้อความทั้งหมด? การลบย้อนกลับไม่ได้ ความคืบหน้าการเรียนและโควตาจะไม่เปลี่ยน` : `Delete “${item.title}” and all its messages? This cannot be undone. Learning progress and quota stay unchanged.`)}</DialogDescription>
          </DialogHeader>
          {action === "rename" ? <Field><FieldLabel htmlFor={`chat-title-${item.id}`}>{th ? "ชื่อแชต" : "Chat name"}</FieldLabel><Input id={`chat-title-${item.id}`} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required disabled={pending} autoComplete="off" /></Field> : null}
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setAction(null)}>{th ? "ยกเลิก" : "Cancel"}</Button>
            <Button type="submit" variant={action === "delete" ? "destructive" : "default"} disabled={pending || (action === "rename" && !title.trim())}>{pending ? <Spinner /> : null}{action === "rename" ? (th ? "บันทึก" : "Save") : deleteLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
