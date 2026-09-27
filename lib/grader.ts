const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";

export function toArabicDigits(value: string) {
  return value.replace(/[๐-๙]/g, (digit) => String(THAI_DIGITS.indexOf(digit)));
}

export function parseNumericAnswer(
  raw: string,
): { ok: true; value: number } | { ok: false; reason: "empty" | "ambiguous" | "invalid" } {
  const cleaned = toArabicDigits(raw).trim().toLowerCase().replace(/บาท|baht|thb|฿/g, " ").replace(/,/g, "");
  if (!cleaned) return { ok: false, reason: "empty" };
  const matches = cleaned.match(/-?\d+(?:\.\d+)?/g);
  if (!matches) return { ok: false, reason: "invalid" };
  if (matches.length !== 1) return { ok: false, reason: "ambiguous" };
  const value = Number(matches[0]);
  if (!Number.isFinite(value)) return { ok: false, reason: "invalid" };
  return { ok: true, value };
}

export function numbersEqual(left: number, right: number) {
  return Math.abs(left - right) < 1e-9;
}

export function gradeEnglishItem(itemId: string, answer: string) {
  const text = answer.trim();
  if (itemId === "name") return /\b(my name is|i am|i'm|i’m)\b\s+\S+/i.test(text);
  if (itemId === "interest") return /\bi like\b\s+\S+/i.test(text);
  if (itemId === "question") return /\b(what is your name|what's your name|what’s your name)\b/i.test(text);
  if (itemId === "order") return /\b(i would like|i'd like|i’d like|i want|can i have)\b/i.test(text);
  if (itemId === "size") return /\b(small|medium|large)\b/i.test(text);
  if (itemId === "thanks") return /\b(thank you|thanks)\b/i.test(text);
  return false;
}
