"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <h1>โหลดไม่สำเร็จ</h1>
      <p className="mt-2 text-muted-foreground">Could not load this page.</p>
      <Button type="button" onClick={reset} className="mt-4 min-h-12">
        ลองอีกครั้ง
      </Button>
    </div>
  );
}
