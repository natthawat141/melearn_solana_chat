import { ProfilePanel } from "@/components/profile-panel";
import { tutorMode } from "@/lib/content";
import { getViewer } from "@/lib/viewer";

export default async function ProfilePage() {
  const viewer = await getViewer();
  return (
    <ProfilePanel
      locale={viewer.locale}
      signedIn={Boolean(viewer.user)}
      displayName={viewer.user?.displayName || ""}
      level={viewer.level}
      goal={viewer.goal}
      walletAddress={viewer.user?.walletAddress || null}
      tutor={tutorMode()}
    />
  );
}
