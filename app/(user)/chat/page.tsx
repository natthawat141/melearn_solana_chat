import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getLatestGeneralConversation, openGeneralConversation } from "@/lib/learning";
import { getViewer } from "@/lib/viewer";

export default async function NewGeneralChatPage() {
  const viewer = await getViewer();
  if (!viewer.user) redirect("/login?next=%2Fchat");
  if (!viewer.onboarded) redirect("/setup?next=%2Fchat");
  const db = await getDb();
  const latest = await getLatestGeneralConversation(db, viewer.user.id);
  if (latest) redirect(`/chat/${latest.id}`);
  const { conversation } = await openGeneralConversation(db, viewer.user.id);
  redirect(`/chat/${conversation.id}`);
}
