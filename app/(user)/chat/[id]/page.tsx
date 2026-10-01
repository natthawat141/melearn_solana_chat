import { notFound, redirect } from "next/navigation";
import { GeneralChatRoom } from "@/components/general-chat-room";
import { getDb } from "@/lib/db";
import { getGeneralConversation } from "@/lib/learning";
import { readQuota } from "@/lib/quota";
import { getViewer } from "@/lib/viewer";

export default async function GeneralChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  const returnTo = `/chat/${id}`;
  if (!viewer.user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (!viewer.onboarded) redirect(`/setup?next=${encodeURIComponent(returnTo)}`);

  const db = await getDb();
  const opened = await getGeneralConversation(db, id, viewer.user.id);
  if (!opened) notFound();

  return (
    <GeneralChatRoom
      key={opened.conversation.id}
      locale={viewer.locale}
      conversationId={opened.conversation.id}
      initialMessages={opened.messages.map(({ id: messageId, role, text }) => ({ id: messageId, role, text }))}
      initialQuota={await readQuota(db, "user", viewer.user.id)}
    />
  );
}
