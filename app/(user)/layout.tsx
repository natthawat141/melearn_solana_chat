import { AppShell } from "@/components/app-shell";
import { buildChatHistory } from "@/lib/chat-history";
import { getDb } from "@/lib/db";
import { getViewer } from "@/lib/viewer";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const history = buildChatHistory(viewer.user ? getDb() : null, viewer.locale, viewer.user?.id ?? null);
  return <AppShell locale={viewer.locale} history={history} isAuthenticated={Boolean(viewer.user)} user={viewer.user}>{children}</AppShell>;
}
