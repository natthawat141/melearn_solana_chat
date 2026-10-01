import crypto from "crypto";
import { generalReply, modelReply } from "@/lib/ai";
import type { AppDatabase } from "@/lib/db";
import { withTransaction } from "@/lib/db";
import { getLesson, getTeacher } from "@/lib/content";
import { nowIso } from "@/lib/format";
import { consumePrompt, readQuota } from "@/lib/quota";
import { emptyProgress, openingMessage, respond } from "@/lib/tutor";
import type { ChatMode, Locale, OwnerType, ProgressState } from "@/lib/types";

export class LearningError extends Error {
  code: string;
  status: number;
  retryable: boolean;

  resetAt?: string;

  constructor(code: string, status: number, retryable = false, resetAt?: string) {
    super(code);
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.resetAt = resetAt;
  }
}

type ProgressRow = {
  owner_type: string;
  owner_id: string;
  lesson_id: string;
  lesson_version: number;
  status: string;
  attempts: number;
  hints_used: number;
  phase: string;
  practice_index: number;
  results_json: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  text: string;
  client_message_id: string | null;
  mode: string | null;
  created_at: string;
};

export type ConversationRow = {
  id: string;
  title?: string | null;
  owner_type: OwnerType;
  owner_id: string;
  teacher_id: string;
  lesson_id: string;
  created_at: string;
  updated_at: string;
};

export const GENERAL_CHAT_ID = "general";

export async function hasEntitlement(db: AppDatabase, userId: string, lessonId: string) {
  return Boolean(await db.prepare("SELECT id FROM entitlements WHERE user_id = ? AND lesson_id = ?").get(userId, lessonId));
}

export function canEnterLesson(db: AppDatabase, ownerType: OwnerType, ownerId: string, lessonId: string) {
  const lesson = getLesson(lessonId);
  const teacher = lesson ? getTeacher(lesson.teacherId) : null;
  if (!lesson || !teacher) throw new LearningError("NOT_FOUND", 404);
  if (!teacher.mvpEnabled) throw new LearningError("TEACHER_UNAVAILABLE", 403);
  return { lesson, teacher };
}

export async function readProgress(db: AppDatabase, ownerType: OwnerType, ownerId: string, lessonId: string, total: number): Promise<ProgressState | null> {
  const row = await db.prepare("SELECT * FROM progress WHERE owner_type = ? AND owner_id = ? AND lesson_id = ?").get<ProgressRow>(ownerType, ownerId, lessonId);
  if (!row) return null;
  let results: boolean[] = [];
  try {
    const parsed = JSON.parse(row.results_json) as unknown;
    if (Array.isArray(parsed)) results = parsed.map(Boolean);
  } catch {
    results = [];
  }
  return {
    status: row.status === "completed" ? "completed" : "in_progress",
    attempts: row.attempts,
    hintsUsed: row.hints_used,
    phase: row.phase === "awaiting" ? "awaiting" : "chat",
    practiceIndex: row.practice_index,
    results: Array.from({ length: total }, (_, index) => Boolean(results[index])),
  };
}

async function saveProgress(db: AppDatabase, ownerType: OwnerType, ownerId: string, lessonId: string, version: number, progress: ProgressState) {
  await db.prepare(
    `INSERT INTO progress (owner_type, owner_id, lesson_id, lesson_version, status, attempts, hints_used, phase, practice_index, results_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(owner_type, owner_id, lesson_id) DO UPDATE SET
       status = excluded.status,
       attempts = excluded.attempts,
       hints_used = excluded.hints_used,
       phase = excluded.phase,
       practice_index = excluded.practice_index,
       results_json = excluded.results_json,
       updated_at = excluded.updated_at`,
  ).run(ownerType, ownerId, lessonId, version, progress.status, progress.attempts, progress.hintsUsed, progress.phase, progress.practiceIndex, JSON.stringify(progress.results), nowIso());
}

export async function listMessages(db: AppDatabase, conversationId: string) {
  return db.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC, id ASC").all<MessageRow>(conversationId);
}

export async function openConversation(db: AppDatabase, input: { ownerType: OwnerType; ownerId: string; lessonId: string; locale: Locale }) {
  const { lesson, teacher } = canEnterLesson(db, input.ownerType, input.ownerId, input.lessonId);
  const existing = await db
    .prepare("SELECT * FROM conversations WHERE owner_type = ? AND owner_id = ? AND lesson_id = ? ORDER BY updated_at DESC LIMIT 1")
    .get<ConversationRow>(input.ownerType, input.ownerId, lesson.id);
  if (existing) {
    const existingProgress = await readProgress(db, input.ownerType, input.ownerId, lesson.id, lesson.practice.length);
    const progress = existingProgress ?? emptyProgress(lesson.practice.length);
    if (!existingProgress) {
      await saveProgress(db, input.ownerType, input.ownerId, lesson.id, lesson.version, progress);
    }
    return { conversation: existing, messages: await listMessages(db, existing.id), progress, lesson, teacher };
  }
  const id = crypto.randomUUID();
  const created = nowIso();
  const progress = emptyProgress(lesson.practice.length);
  await withTransaction(db, async () => {
    await db.prepare("INSERT INTO conversations (id, owner_type, owner_id, teacher_id, lesson_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      id,
      input.ownerType,
      input.ownerId,
      teacher.id,
      lesson.id,
      created,
      created,
    );
    await db.prepare("INSERT INTO messages (id, conversation_id, role, text, client_message_id, mode, created_at) VALUES (?, ?, 'assistant', ?, NULL, 'teach', ?)").run(
      crypto.randomUUID(),
      id,
      openingMessage(teacher, lesson, input.locale),
      created,
    );
    await saveProgress(db, input.ownerType, input.ownerId, lesson.id, lesson.version, progress);
  });
  const conversation = (await db.prepare("SELECT * FROM conversations WHERE id = ?").get<ConversationRow>(id))!;
  return { conversation, messages: await listMessages(db, id), progress, lesson, teacher };
}

export async function openGeneralConversation(db: AppDatabase, ownerId: string) {
  const id = crypto.randomUUID();
  const created = nowIso();
  await db.prepare(
    "INSERT INTO conversations (id, owner_type, owner_id, teacher_id, lesson_id, created_at, updated_at) VALUES (?, 'user', ?, ?, ?, ?, ?)",
  ).run(id, ownerId, GENERAL_CHAT_ID, GENERAL_CHAT_ID, created, created);
  const conversation = (await db.prepare("SELECT * FROM conversations WHERE id = ?").get<ConversationRow>(id))!;
  return { conversation, messages: await listMessages(db, id) };
}

export async function getGeneralConversation(db: AppDatabase, conversationId: string, ownerId: string) {
  const conversation = await db
    .prepare("SELECT * FROM conversations WHERE id = ? AND owner_type = 'user' AND owner_id = ? AND teacher_id = ? AND lesson_id = ?")
    .get<ConversationRow>(conversationId, ownerId, GENERAL_CHAT_ID, GENERAL_CHAT_ID);
  return conversation ? { conversation, messages: await listMessages(db, conversation.id) } : null;
}

export async function getLatestGeneralConversation(db: AppDatabase, ownerId: string) {
  return db.prepare(
    "SELECT * FROM conversations WHERE owner_type = 'user' AND owner_id = ? AND teacher_id = ? AND lesson_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1",
  ).get<ConversationRow>(ownerId, GENERAL_CHAT_ID, GENERAL_CHAT_ID);
}

function historyFor(messages: MessageRow[]) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({ role: message.role, text: message.text }));
}

export async function handleGeneralMessage(
  db: AppDatabase,
  input: {
    ownerId: string;
    conversationId: string;
    clientMessageId: string;
    text: string;
    locale: Locale;
    level: string | null;
    educationStage?: string | null;
    preferredSubject?: string | null;
    goal?: string | null;
  },
) {
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(input.clientMessageId)) throw new LearningError("BAD_MESSAGE_ID", 400);
  const text = input.text.trim();
  if (!text) throw new LearningError("EMPTY", 400);
  if (text.length > 2000) throw new LearningError("TOO_LONG", 400);

  const record = await getGeneralConversation(db, input.conversationId, input.ownerId);
  if (!record) throw new LearningError("NOT_FOUND", 404);

  const existingUser = await db
    .prepare("SELECT * FROM messages WHERE conversation_id = ? AND client_message_id = ? AND role = 'user'")
    .get<MessageRow>(record.conversation.id, input.clientMessageId);
  const existingAssistant = await db
    .prepare("SELECT * FROM messages WHERE conversation_id = ? AND client_message_id = ? AND role = 'assistant'")
    .get<MessageRow>(record.conversation.id, input.clientMessageId);
  if (existingUser && existingAssistant) {
    return { messages: await listMessages(db, record.conversation.id), idempotent: true, quota: await readQuota(db, "user", input.ownerId) };
  }
  if (!existingUser) {
    const gate = await readQuota(db, "user", input.ownerId);
    if (gate.blocked) throw new LearningError("QUOTA", 429, false, gate.resetAt);
  }

  const prior = await listMessages(db, record.conversation.id);
  const reply = await generalReply({
    locale: input.locale,
    level: input.level,
    educationStage: input.educationStage,
    preferredSubject: input.preferredSubject,
    goal: input.goal,
    history: historyFor(prior.filter((message) => message.client_message_id !== input.clientMessageId)),
    text,
  });
  if (!reply) throw new LearningError("AI_UNAVAILABLE", 503, true);

  const createdAt = new Date();
  const userAt = createdAt.toISOString();
  const assistantAt = new Date(createdAt.getTime() + 1).toISOString();
  await withTransaction(db, async () => {
    // The chat can be deleted while the model is generating a response.
    const stillOwned = await db.prepare("SELECT id FROM conversations WHERE id = ? AND owner_type = 'user' AND owner_id = ?").get(record.conversation.id, input.ownerId);
    if (!stillOwned) throw new LearningError("NOT_FOUND", 404);
    if (!existingUser) {
      await db.prepare("INSERT INTO messages (id, conversation_id, role, text, client_message_id, mode, created_at) VALUES (?, ?, 'user', ?, ?, 'teach', ?)").run(
        crypto.randomUUID(), record.conversation.id, text, input.clientMessageId, userAt,
      );
      await consumePrompt(db, "user", input.ownerId, createdAt.getTime());
    }
    await db.prepare("INSERT INTO messages (id, conversation_id, role, text, client_message_id, mode, created_at) VALUES (?, ?, 'assistant', ?, ?, 'teach', ?)").run(
      crypto.randomUUID(), record.conversation.id, reply, input.clientMessageId, assistantAt,
    );
    await db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(assistantAt, record.conversation.id);
  });

  return { messages: await listMessages(db, record.conversation.id), idempotent: false, quota: await readQuota(db, "user", input.ownerId) };
}

export async function handleMessage(
  db: AppDatabase,
  input: {
    ownerType: OwnerType;
    ownerId: string;
    conversationId: string;
    clientMessageId: string;
    text: string;
    mode: ChatMode;
    locale: Locale;
    level: string | null;
    educationStage?: string | null;
    preferredSubject?: string | null;
    goal?: string | null;
  },
) {
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(input.clientMessageId)) throw new LearningError("BAD_MESSAGE_ID", 400);
  const conversation = await db.prepare("SELECT * FROM conversations WHERE id = ?").get<ConversationRow>(input.conversationId);
  if (!conversation || conversation.owner_type !== input.ownerType || conversation.owner_id !== input.ownerId) {
    throw new LearningError("NOT_FOUND", 404);
  }
  const { lesson, teacher } = canEnterLesson(db, input.ownerType, input.ownerId, conversation.lesson_id);
  const text = input.text.trim();
  if (input.mode === "teach" && !text) throw new LearningError("EMPTY", 400);
  if (text.length > 2000) throw new LearningError("TOO_LONG", 400);

  const existingUser = await db
    .prepare("SELECT * FROM messages WHERE conversation_id = ? AND client_message_id = ? AND role = 'user'")
    .get<MessageRow>(conversation.id, input.clientMessageId);
  const existingAssistant = await db
    .prepare("SELECT * FROM messages WHERE conversation_id = ? AND client_message_id = ? AND role = 'assistant'")
    .get<MessageRow>(conversation.id, input.clientMessageId);
  if (existingUser && existingAssistant) {
    const progress = (await readProgress(db, input.ownerType, input.ownerId, lesson.id, lesson.practice.length)) ?? emptyProgress(lesson.practice.length);
    return { messages: await listMessages(db, conversation.id), progress, assessment: null, idempotent: true, quota: await readQuota(db, input.ownerType, input.ownerId) };
  }
  if (!existingUser) {
    const gate = await readQuota(db, input.ownerType, input.ownerId);
    if (gate.blocked) throw new LearningError("QUOTA", 429, false, gate.resetAt);
  }

  const prior = await listMessages(db, conversation.id);
  const stored = (await readProgress(db, input.ownerType, input.ownerId, lesson.id, lesson.practice.length)) ?? emptyProgress(lesson.practice.length);
  let messageText = text;
  let assessment: Awaited<ReturnType<typeof respond>>["assessment"] = null;
  let nextProgress = stored;

  const grading = input.mode === "teach" && stored.phase === "awaiting";
  const guarded = /จ่ายแล้ว|ชำระแล้ว|โอนแล้ว|ปลดล็อกให้|i paid|already paid|unlock (this|the) lesson|system prompt|คำสั่งระบบ|seed phrase|private key/i.test(text);
  const scripted = input.mode !== "teach" || grading || !text || guarded;
  if (!scripted) {
    const model = await modelReply({
      teacher,
      lesson,
      locale: input.locale,
      level: input.level,
      educationStage: input.educationStage,
      preferredSubject: input.preferredSubject,
      goal: input.goal,
      history: historyFor(prior),
      text,
    });
    if (model) {
      messageText = model;
      nextProgress = { ...stored, status: stored.status === "completed" ? "completed" : "in_progress" };
    }
  }
  if (scripted || messageText === text) {
    const result = respond({ teacher, lesson, locale: input.locale, mode: input.mode, text, progress: stored });
    messageText = result.message;
    nextProgress = result.progress;
    assessment = result.assessment;
  }

  const createdAt = new Date();
  const userAt = createdAt.toISOString();
  const assistantAt = new Date(createdAt.getTime() + 1).toISOString();
  await withTransaction(db, async () => {
    const stillOwned = await db.prepare("SELECT id FROM conversations WHERE id = ? AND owner_type = ? AND owner_id = ?").get(conversation.id, input.ownerType, input.ownerId);
    if (!stillOwned) throw new LearningError("NOT_FOUND", 404);
    if (!existingUser) {
      await db.prepare("INSERT INTO messages (id, conversation_id, role, text, client_message_id, mode, created_at) VALUES (?, ?, 'user', ?, ?, ?, ?)").run(
        crypto.randomUUID(),
        conversation.id,
        text || input.mode,
        input.clientMessageId,
        input.mode,
        userAt,
      );
      await consumePrompt(db, input.ownerType, input.ownerId, createdAt.getTime());
    }
    await db.prepare("INSERT INTO messages (id, conversation_id, role, text, client_message_id, mode, created_at) VALUES (?, ?, 'assistant', ?, ?, ?, ?)").run(
      crypto.randomUUID(),
      conversation.id,
      messageText,
      input.clientMessageId,
      input.mode,
      assistantAt,
    );
    await saveProgress(db, input.ownerType, input.ownerId, lesson.id, lesson.version, nextProgress);
    await db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(assistantAt, conversation.id);
  });

  return {
    messages: await listMessages(db, conversation.id),
    progress: nextProgress,
    assessment,
    idempotent: false,
    quota: await readQuota(db, input.ownerType, input.ownerId),
  };
}

export async function listLearning(db: AppDatabase, ownerType: OwnerType, ownerId: string) {
  return db
    .prepare("SELECT * FROM progress WHERE owner_type = ? AND owner_id = ? ORDER BY updated_at DESC")
    .all<ProgressRow>(ownerType, ownerId);
}

export async function listChats(db: AppDatabase, ownerType: OwnerType, ownerId: string) {
  return db
    .prepare(
      `SELECT c.*, (
       SELECT text FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1
       ) AS last_text,
       (SELECT text FROM messages m WHERE m.conversation_id = c.id AND m.role = 'user' ORDER BY created_at ASC LIMIT 1) AS first_user_text,
       (SELECT text FROM messages m WHERE m.conversation_id = c.id AND m.role = 'user' ORDER BY created_at DESC LIMIT 1) AS last_user_text
       FROM conversations c
       WHERE c.owner_type = ? AND c.owner_id = ?
       ORDER BY c.updated_at DESC`,
    )
    .all<ConversationRow & { last_text: string | null; first_user_text: string | null; last_user_text: string | null }>(ownerType, ownerId);
}

export async function deleteLearningHistory(db: AppDatabase, userId: string) {
  await withTransaction(db, async () => {
    const conversations = await db.prepare("SELECT id FROM conversations WHERE owner_type = 'user' AND owner_id = ?").all<{ id: string }>(userId);
    for (const conversation of conversations) {
      await db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(conversation.id);
    }
    await db.prepare("DELETE FROM conversations WHERE owner_type = 'user' AND owner_id = ?").run(userId);
    await db.prepare("DELETE FROM progress WHERE owner_type = 'user' AND owner_id = ?").run(userId);
  });
}
