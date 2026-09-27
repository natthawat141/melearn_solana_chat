"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <h1>โหลดไม่สำเร็จ</h1>
      <p className="mt-2 text-muted-foreground">Could not load this page.</p>
      <button type="button" onClick={reset} className="mt-4 inline-flex min-h-12 items-center rounded-[14px] bg-primary px-4 font-semibold text-white">
        ลองอีกครั้ง
      </button>
    </div>
  );
}
