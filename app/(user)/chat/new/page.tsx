import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { openGeneralConversation } from "@/lib/learning";
import { getViewer } from "@/lib/viewer";

export default async function StartNewGeneralChatPage() {
  const viewer = await getViewer();
  if (!viewer.user) redirect("/login?next=%2Fchat%2Fnew");
  if (!viewer.onboarded) redirect("/setup?next=%2Fchat%2Fnew");
  const { conversation } = await openGeneralConversation(await getDb(), viewer.user.id);
  redirect(`/chat/${conversation.id}`);
}
