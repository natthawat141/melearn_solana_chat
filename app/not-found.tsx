import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <h1>ไม่พบหน้านี้</h1>
      <p className="mt-2 text-muted">This page is not here.</p>
      <Link href="/" className="mt-4 inline-flex min-h-12 items-center font-semibold text-primary">
        Melearn Chat
      </Link>
    </div>
  );
}
