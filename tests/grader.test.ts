import assert from "node:assert/strict";
import test from "node:test";
import { gradeEnglishItem, numbersEqual, parseNumericAnswer } from "../lib/grader.ts";

test("parses baht, commas, and Thai digits", () => {
  assert.deepEqual(parseNumericAnswer("400 บาท"), { ok: true, value: 400 });
  assert.deepEqual(parseNumericAnswer("1,200"), { ok: true, value: 1200 });
  assert.deepEqual(parseNumericAnswer("๔๐๐"), { ok: true, value: 400 });
  assert.equal(parseNumericAnswer("400.0").ok, true);
  assert.equal(numbersEqual(400, 400.0), true);
  assert.equal(parseNumericAnswer("400 หรือ 100").ok, false);
});

test("english rubric accepts understandable answers", () => {
  assert.equal(gradeEnglishItem("name", "My name is Dul."), true);
  assert.equal(gradeEnglishItem("interest", "I like sing"), true);
  assert.equal(gradeEnglishItem("question", "What is your name?"), true);
  assert.equal(gradeEnglishItem("name", "hello"), false);
});
