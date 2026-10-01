import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { getViewer } from "@/lib/viewer";

export default async function ChatsPage() {
  const viewer = await getViewer();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1>{t(viewer.locale, "chats.title")}</h1>
      <p className="max-w-md text-muted-foreground">{viewer.user ? t(viewer.locale, "history.pick") : t(viewer.locale, "chats.guestBody")}</p>
      <Button asChild className="min-h-11">
        <Link href="/chat/new">{t(viewer.locale, "history.new")}</Link>
      </Button>
    </div>
  );
}
