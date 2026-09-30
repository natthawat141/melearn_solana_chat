import { practicePrompt } from "@/lib/content";
import { gradeEnglishItem, numbersEqual, parseNumericAnswer } from "@/lib/grader";
import type { Lesson, Locale, PracticeItem, ProgressState, Teacher, TutorAssessment } from "@/lib/types";

export type TutorMode = "teach" | "hint" | "example" | "practice";

const VERBS = new Set([
  "sing",
  "dance",
  "read",
  "cook",
  "play",
  "swim",
  "run",
  "draw",
  "write",
  "study",
  "walk",
  "listen",
  "watch",
  "eat",
  "drink",
  "go",
]);

export function emptyProgress(total: number): ProgressState {
  return {
    status: "in_progress",
    attempts: 0,
    hintsUsed: 0,
    phase: "chat",
    practiceIndex: 0,
    results: Array.from({ length: total }, () => false),
  };
}

export function normalizeProgress(progress: ProgressState, total: number): ProgressState {
  const results = Array.from({ length: total }, (_, index) => Boolean(progress.results[index]));
  const firstOpen = results.findIndex((item) => !item);
  return {
    ...progress,
    results,
    practiceIndex: firstOpen === -1 ? total : firstOpen,
    status: results.length > 0 && results.every(Boolean) ? "completed" : progress.status === "not_started" ? "in_progress" : progress.status,
  };
}

function gerund(verb: string) {
  if (verb === "go") return "going";
  if (verb.endsWith("ie")) return `${verb.slice(0, -2)}ying`;
  if (verb.length > 2 && verb.endsWith("e") && !verb.endsWith("ee")) return `${verb.slice(0, -1)}ing`;
  return `${verb}ing`;
}

function paymentClaim(text: string) {
  return /จ่ายแล้ว|ชำระแล้ว|โอนแล้ว|ปลดล็อกให้|i paid|already paid|unlock (this|the) lesson/i.test(text);
}

function jailbreak(text: string) {
  return /system prompt|คำสั่งระบบ|ignore (all|previous)|แสดงข้อมูลลับ|private key|seed phrase/i.test(text);
}

function paymentRefusal(locale: Locale) {
  return locale === "en"
    ? "A chat message cannot confirm a payment or grant access. The server checks a Solana devnet transaction before a lesson unlocks."
    : "ข้อความในแชตยืนยันการชำระหรือให้สิทธิ์บทเรียนไม่ได้ ระบบหลังบ้านจะตรวจธุรกรรมบน Solana devnet ก่อนปลดล็อก";
}

function hiddenRefusal(locale: Locale) {
  return locale === "en"
    ? "I can keep teaching this lesson, and I will not reveal internal instructions, wallet keys, or anyone else's data."
    : "ฉันสอนตามบทเรียนนี้ต่อได้ และจะไม่แสดงคำสั่งภายใน กุญแจกระเป๋า หรือข้อมูลของคนอื่น";
}

function itemText(item: PracticeItem, locale: Locale, field: "prompt" | "hint" | "feedback") {
  if (field === "prompt") return practicePrompt(item, locale);
  if (field === "hint") return (locale === "en" ? item.hintEn : item.hint) || item.hint || item.hintEn || "";
  return (locale === "en" ? item.feedbackEn : item.feedback) || "";
}

function rubricScores(lesson: Lesson, results: boolean[]) {
  return Object.fromEntries(lesson.practice.map((item, index) => [item.id, results[index] ? 1 : 0]));
}

function gradeItem(lesson: Lesson, item: PracticeItem, answer: string) {
  if (typeof item.answer === "number") {
    const parsed = parseNumericAnswer(answer);
    if (!parsed.ok) return false;
    return numbersEqual(parsed.value, item.answer);
  }
  return gradeEnglishItem(item.id, answer);
}

export function openingMessage(teacher: Teacher, lesson: Lesson, locale: Locale) {
  if (teacher.id === "pi") {
    return locale === "en"
      ? `Hi, I'm Teacher Pi. Shall we work through ${lesson.titleEn} together, step by step? Tell me where you get stuck.`
      : `${teacher.greeting}\n\nวันนี้เราจะค่อย ๆ ดู${lesson.title} ถ้าติดขั้นตอนไหน บอกได้เลยนะ`;
  }
  if (teacher.id === "ray") {
    return locale === "en"
      ? `Hi, I'm Teacher Ray. Let's practice together.\n\n${lesson.opening || "What would you like to say?"}`
      : `สวัสดีครับ ครูเรย์เอง วันนี้เรามาฝึก${lesson.title}กันนะครับ\n\n${lesson.opening || "ลองทักทายเป็นภาษาอังกฤษได้เลยครับ"}`;
  }
  return locale === "en" ? teacher.exampleResponse : teacher.greeting;
}

export function localizedHistoryText(teacher: Teacher, lesson: Lesson, text: string, locale: Locale) {
  const thai = openingMessage(teacher, lesson, "th");
  const english = openingMessage(teacher, lesson, "en");
  if (text === thai || text === english) return openingMessage(teacher, lesson, locale);
  return text;
}

function workedExampleText(lesson: Lesson, locale: Locale) {
  const example = lesson.workedExample;
  if (!example) return null;
  const question = locale === "en" && example.questionEn ? example.questionEn : example.question;
  const steps = locale === "en" && example.stepsEn ? example.stepsEn : example.steps;
  const payLabel = locale === "en" ? "You pay" : "ราคาที่ต้องจ่าย";
  const discountLabel = locale === "en" ? "That first number in the steps is the discount, not the price you pay." : "ตัวเลขส่วนลดในขั้นแรกไม่ใช่ราคาที่ต้องจ่าย";
  return `${question}\n${steps.join("\n")}\n${payLabel}: ${example.answer}\n${discountLabel}`;
}

function explainDiscount(text: string, locale: Locale) {
  const match = text.match(
    /(\d[\d,]*(?:\.\d+)?)\s*(?:บาท|baht|thb|฿)?[\s\S]{0,40}?(?:ลด|discount(?:ed)?(?:\s+by)?)\s*(\d+(?:\.\d+)?)\s*%/i,
  );
  if (!match) return null;
  const base = Number(match[1].replace(/,/g, ""));
  const pct = Number(match[2]);
  if (!Number.isFinite(base) || !Number.isFinite(pct)) return null;
  const discount = (base * pct) / 100;
  const pay = base - discount;
  const wantsPay = /ต้องจ่าย|จ่ายเท่าไร|จ่ายกี่|ราคาที่ต้อง|how much|what do i pay|do i pay/i.test(text);
  const wantsHint = /ยังไง|วิธี|ใบ้|hint|เริ่มคิด|how do i|help me start/i.test(text);
  if (!wantsPay || wantsHint) {
    return locale === "en"
      ? `Start with 10% of ${base}, then scale it to ${pct}%. The discount and the price you pay are different numbers.`
      : `ลองหา 10% ของ ${base} ก่อน แล้วค่อยหา ${pct}% ส่วนลดกับราคาที่ต้องจ่ายไม่ใช่ตัวเลขเดียวกัน`;
  }
  const discountText = Number.isInteger(discount) ? String(discount) : discount.toFixed(2);
  const payText = Number.isInteger(pay) ? String(pay) : pay.toFixed(2);
  return locale === "en"
    ? `Discount = ${base} × ${pct} ÷ 100 = ${discountText}. You pay ${base} − ${discountText} = ${payText}. ${discountText} is the discount, not the price you pay.`
    : `ส่วนลด = ${base} × ${pct} ÷ 100 = ${discountText} บาท\nราคาที่ต้องจ่าย = ${base} − ${discountText} = ${payText} บาท\n${discountText} คือส่วนลด ไม่ใช่ราคาที่ต้องจ่าย`;
}

function explainPercentOf(text: string, locale: Locale) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:ของ|of)\s*(\d[\d,]*(?:\.\d+)?)/i);
  if (!match) return null;
  if (!/เท่าไร|เท่าไหร่|กี่|เท่ากับ|\?|how much|what is/i.test(text)) return null;
  const pct = Number(match[1]);
  const base = Number(match[2].replace(/,/g, ""));
  const value = (base * pct) / 100;
  const shown = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return locale === "en"
    ? `${pct}% of ${base} = ${base} × ${pct} ÷ 100 = ${shown}.`
    : `${pct}% ของ ${base} = ${base} × ${pct} ÷ 100 = ${shown}`;
}

function rayChat(text: string, lesson: Lesson, locale: Locale) {
  const like = text.match(/\bi like\s+([a-z]+)\b/i);
  if (like && VERBS.has(like[1].toLowerCase())) {
    const verb = like[1].toLowerCase();
    const fixed = gerund(verb);
    return locale === "en"
      ? `Close. For an activity, use the -ing form: I like ${fixed}. That is one small change, not a criticism. Can you also tell me your name?`
      : `ใกล้แล้วครับ กิจกรรมใช้รูป -ing: I like ${fixed}. ไม่ได้ตำหนินะ แค่จุดนี้จุดเดียว ลองบอกชื่อของคุณด้วยได้ไหม?`;
  }
  if (/\b(my name is|i am|i'm|i’m)\b/i.test(text)) {
    return locale === "en"
      ? `Nice to meet you. I am Teacher Ray. What do you like? You can start with "I like".`
      : "ยินดีที่ได้รู้จักครับ ครูเรย์เอง แล้วคุณชอบอะไร ลองขึ้นต้นว่า I like";
  }
  if (/\bi like\b/i.test(text)) {
    return locale === "en"
      ? `That is clear. Now try asking my name: What is your name?`
      : "พูดได้เข้าใจครับ ต่อไปลองถามชื่อครูว่า What is your name?";
  }
  const concept = locale === "en" ? lesson.conceptsEn[0] : lesson.concepts[0];
  return locale === "en"
    ? `Let's practice one idea: ${concept}. ${lesson.opening || "What's your name?"}`
    : `เราฝึกทีละเรื่องนะ ${concept}\n${lesson.opening || "ลองทักทายครูเป็นภาษาอังกฤษได้ไหม?"}`;
}

function piChat(text: string, lesson: Lesson, locale: Locale) {
  const discount = explainDiscount(text, locale);
  if (discount) return discount;
  const percent = explainPercentOf(text, locale);
  if (percent) return percent;
  const concept = locale === "en" ? lesson.conceptsEn[0] : lesson.concepts[0];
  return locale === "en"
    ? `We will take one step: ${concept}. Ask for a hint, an example, or press practice when you want a problem.`
    : `เราเดินทีละขั้นนะ ${concept} จะขอคำใบ้ ขอตัวอย่าง หรือกดลองทำเองก็ได้`;
}

function teachOpen(teacher: Teacher, lesson: Lesson, text: string, locale: Locale) {
  if (teacher.id === "pi") return piChat(text, lesson, locale);
  if (teacher.id === "ray") return rayChat(text, lesson, locale);
  return locale === "en" ? teacher.exampleResponse : teacher.greeting;
}

export function respond(input: {
  teacher: Teacher;
  lesson: Lesson;
  locale: Locale;
  mode: TutorMode;
  text: string;
  progress: ProgressState;
}): { message: string; progress: ProgressState; assessment: TutorAssessment } {
  const progress = normalizeProgress(input.progress, input.lesson.practice.length);
  const locale = input.locale;
  const text = input.text.trim();

  if (paymentClaim(text)) {
    return { message: paymentRefusal(locale), progress: { ...progress, status: progress.status === "not_started" ? "in_progress" : progress.status }, assessment: null };
  }
  if (jailbreak(text)) {
    return { message: hiddenRefusal(locale), progress, assessment: null };
  }

  const item = input.lesson.practice[progress.practiceIndex];

  if (input.mode === "hint") {
    const hint = item
      ? itemText(item, locale, "hint")
      : locale === "en"
        ? input.lesson.conceptsEn[0]
        : input.lesson.concepts[0];
    const lead = locale === "en" ? "Here is one step, not the final answer." : "นี่คือขั้นเดียว ไม่ใช่คำตอบสุดท้าย";
    return {
      message: `${lead}\n${hint}`,
      progress: { ...progress, hintsUsed: progress.hintsUsed + 1, status: "in_progress" },
      assessment: null,
    };
  }

  if (input.mode === "example") {
    const example = workedExampleText(input.lesson, locale);
    if (example) {
      const note = locale === "en" ? "This is a worked example. Your practice answer should be your own." : "นี่คือตัวอย่างที่ทำให้ดู คำตอบแบบฝึกให้เขียนเอง";
      return { message: `${note}\n${example}`, progress: { ...progress, status: "in_progress" }, assessment: null };
    }
    const sample = item?.example || input.teacher.exampleResponse;
    const note = locale === "en" ? "Here is an example. Write yours with your own details." : "นี่คือตัวอย่าง ลองเขียนของคุณเอง";
    return { message: `${note}\n${sample}`, progress: { ...progress, status: "in_progress" }, assessment: null };
  }

  if (input.mode === "practice") {
    const finished = progress.results.every(Boolean);
    const results = finished ? progress.results.map(() => false) : progress.results;
    const index = Math.max(results.findIndex((value) => !value), 0);
    const current = input.lesson.practice[index];
    return {
      message: itemText(current, locale, "prompt"),
      progress: { ...progress, results, phase: "awaiting", practiceIndex: index, status: "in_progress" },
      assessment: null,
    };
  }

  if (progress.phase === "awaiting" && item) {
    const correct = gradeItem(input.lesson, item, text);
    const results = [...progress.results];
    const attempts = progress.attempts + 1;
    if (!correct) {
      const hint = itemText(item, locale, "hint");
      const message =
        locale === "en"
          ? `Not this one yet. ${hint} Try the same question again.`
          : `ยังไม่ตรงข้อนี้ ${hint} ลองข้อเดิมอีกครั้งได้เลย`;
      return {
        message,
        progress: { ...progress, attempts, phase: "awaiting", status: "in_progress" },
        assessment: { correct: false, feedback: message, rubricScores: rubricScores(input.lesson, results) },
      };
    }
    results[progress.practiceIndex] = true;
    const done = results.every(Boolean);
    if (done) {
      const message =
        locale === "en"
          ? "You finished every practice item. The card below lists what you actually did. There is no percentage score."
          : "ครบทุกข้อแล้ว การ์ดด้านล่างสรุปสิ่งที่คุณทำให้จริง ไม่มีคะแนนเป็นเปอร์เซ็นต์";
      return {
        message,
        progress: { ...progress, results, attempts, phase: "chat", status: "completed", practiceIndex: results.length },
        assessment: { correct: true, feedback: message, rubricScores: rubricScores(input.lesson, results) },
      };
    }
    const nextIndex = results.findIndex((value) => !value);
    const next = input.lesson.practice[nextIndex];
    const message =
      locale === "en"
        ? `That works. Next: ${itemText(next, locale, "prompt")}`
        : `ข้อนี้ผ่านแล้ว ข้อต่อไป: ${itemText(next, locale, "prompt")}`;
    return {
      message,
      progress: { ...progress, results, attempts, phase: "awaiting", practiceIndex: nextIndex, status: "in_progress" },
      assessment: { correct: true, feedback: message, rubricScores: rubricScores(input.lesson, results) },
    };
  }

  return {
    message: teachOpen(input.teacher, input.lesson, text, locale),
    progress: { ...progress, status: progress.status === "completed" ? "completed" : "in_progress" },
    assessment: null,
  };
}
