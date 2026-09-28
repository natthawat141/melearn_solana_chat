import { AppShell } from "@/components/app-shell";
import { getViewer } from "@/lib/viewer";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  return <AppShell locale={viewer.locale}>{children}</AppShell>;
}
