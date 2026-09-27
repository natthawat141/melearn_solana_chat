import teachersJson from "@/content/teachers.json";
import lessonsJson from "@/content/lessons.json";
import paymentsJson from "@/content/payments.json";
import type { Lesson, Locale, Teacher } from "@/lib/types";

const personaEn: Record<string, string> = {
  ray: "Friendly and encouraging. Does not mock mistakes.",
  pi: "Calm and step by step. Cares about how you think.",
  nova: "Curious and bright. Invites you to observe.",
  time: "A storyteller, open to more than one view.",
  bit: "Playful and hands-on.",
};

export const teachers = teachersJson as Teacher[];
export const lessons = lessonsJson as Lesson[];

export function getTeacher(id: string) {
  return teachers.find((teacher) => teacher.id === id) ?? null;
}

export function getLesson(id: string) {
  return lessons.find((lesson) => lesson.id === id) ?? null;
}

export function lessonsForTeacher(teacherId: string) {
  return lessons.filter((lesson) => lesson.teacherId === teacherId);
}

export function teacherImage(teacher: Teacher) {
  if (!teacher.image) return null;
  return `/teachers/${teacher.id}.webp`;
}

export function teacherPersona(teacher: Teacher, locale: Locale) {
  if (locale === "en") return personaEn[teacher.id] ?? teacher.persona;
  return teacher.persona;
}

export function lessonTitle(lesson: Lesson, locale: Locale) {
  return locale === "en" ? lesson.titleEn : lesson.title;
}

export function lessonSummary(lesson: Lesson, locale: Locale) {
  return locale === "en" ? lesson.summaryEn : lesson.summary;
}

export function lessonObjectives(lesson: Lesson, locale: Locale) {
  return locale === "en" ? lesson.objectivesEn : lesson.objectives;
}

export function practicePrompt(item: Lesson["practice"][number], locale: Locale) {
  return locale === "en" && item.promptEn ? item.promptEn : item.prompt;
}

export const payments = paymentsJson;

export function priceLamports(lessonId: string) {
  const value = payments.pricesLamports[lessonId as keyof typeof payments.pricesLamports];
  return typeof value === "number" ? value : null;
}

export function paymentRecipient() {
  return process.env.PAYMENT_RECIPIENT || payments.recipient;
}

export function paymentNetwork() {
  return process.env.SOLANA_NETWORK || payments.network;
}

export function rpcUrl() {
  return process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
}

export function tutorMode() {
  return process.env.AI_API_KEY ? "model" : "lesson";
}
