"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export function UpgradeButton({ locale, className }: { locale: Locale; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" className={className} onClick={() => setOpen(true)}>
        {t(locale, "pricing.upgrade")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t(locale, "pricing.proName")} · {t(locale, "pricing.proPrice")}
            </DialogTitle>
            <DialogDescription>{t(locale, "pricing.closed")}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
