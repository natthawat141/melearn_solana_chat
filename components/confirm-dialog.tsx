"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#17234A]/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(100%-2rem,440px)] -translate-x-1/2 -translate-y-1/2 rounded-[20px] bg-surface p-5 shadow-xl">
          <Dialog.Title className="text-[22px] font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-muted">{body}</Dialog.Description>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button variant="secondary" type="button">
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button type="button" variant="primary" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
