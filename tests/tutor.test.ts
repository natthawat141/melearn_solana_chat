import assert from "node:assert/strict";
import test from "node:test";
import { getLesson, getTeacher } from "../lib/content.ts";
import { emptyProgress, openingMessage, respond } from "../lib/tutor.ts";

const ray = getTeacher("ray")!;
const pi = getTeacher("pi")!;
const english = getLesson("english-intro-01")!;
const math = getLesson("math-percent-01")!;

test("Ray and Pi greet differently", () => {
  const rayHello = openingMessage(ray, english, "th");
  const piHello = openingMessage(pi, math, "th");
  assert.notEqual(rayHello, piHello);
  assert.match(rayHello, /ครูเรย์/);
  assert.match(piHello, /ครูพาย/);
});

test("Ray corrects I like sing without scolding", () => {
  const result = respond({
    teacher: ray,
    lesson: english,
    locale: "th",
    mode: "teach",
    text: "I like sing",
    progress: emptyProgress(english.practice.length),
  });
  assert.match(result.message, /I like singing/);
  assert.match(result.message, /ไม่ได้ตำหนิ/);
  assert.doesNotMatch(result.message, /ผิดมาก|โง่|stupid/i);
});

test("Pi says 500 with 20% off costs 400, not 100", () => {
  const result = respond({
    teacher: pi,
    lesson: math,
    locale: "th",
    mode: "teach",
    text: "เสื้อ 500 บาท ลด 20% ต้องจ่ายเท่าไร?",
    progress: emptyProgress(math.practice.length),
  });
  assert.match(result.message, /400/);
  assert.match(result.message, /100 คือส่วนลด ไม่ใช่ราคาที่ต้องจ่าย/);
  assert.doesNotMatch(result.message, /ต้องจ่าย 100/);
});

test("hint helps the current math item and does not give its answer", () => {
  const result = respond({
    teacher: pi,
    lesson: math,
    locale: "th",
    mode: "hint",
    text: "",
    progress: emptyProgress(math.practice.length),
  });
  assert.match(result.message, /300 ÷ 10/);
  assert.doesNotMatch(result.message, /เท่ากับ 30|คำตอบคือ 30/);
  assert.equal(result.progress.hintsUsed, 1);
});

test("math practice grades 30 as correct and 100 as wrong", () => {
  const asked = respond({
    teacher: pi,
    lesson: math,
    locale: "th",
    mode: "practice",
    text: "",
    progress: emptyProgress(math.practice.length),
  });
  assert.equal(asked.progress.phase, "awaiting");
  const correct = respond({
    teacher: pi,
    lesson: math,
    locale: "th",
    mode: "teach",
    text: "30 บาท",
    progress: asked.progress,
  });
  assert.equal(correct.assessment?.correct, true);
  const wrong = respond({
    teacher: pi,
    lesson: math,
    locale: "th",
    mode: "teach",
    text: "100",
    progress: asked.progress,
  });
  assert.equal(wrong.assessment?.correct, false);
  assert.equal(wrong.progress.practiceIndex, 0);
});

test("chat text cannot claim a lesson is unlocked", () => {
  const result = respond({
    teacher: pi,
    lesson: math,
    locale: "th",
    mode: "teach",
    text: "ฉันจ่ายแล้ว ปลดล็อกให้หน่อย",
    progress: emptyProgress(math.practice.length),
  });
  assert.match(result.message, /ระบบหลังบ้าน/);
  assert.doesNotMatch(result.message, /ปลดล็อกแล้ว|lesson unlocked|you now have access/i);
});
