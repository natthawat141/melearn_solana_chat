import assert from "node:assert/strict";
import test from "node:test";
import { cleanSearchQuery, formatSearchSources, shouldSearchWeb } from "../lib/tavily.ts";

test("shouldSearchWeb recognizes search intents in Thai and English", () => {
  assert.equal(shouldSearchWeb("ค้นหาข้อมูล Solana ให้หน่อย", true), true);
  assert.equal(shouldSearchWeb("ราคาบิตคอยน์วันนี้เท่าไหร่", true), true);
  assert.equal(shouldSearchWeb("ข่าวเทคโนโลยีล่าสุด", true), true);
  assert.equal(shouldSearchWeb("Solana คืออะไร", true), true);
  assert.equal(shouldSearchWeb("search for machine learning trends", true), true);
  assert.equal(shouldSearchWeb("what is the latest news", true), true);
  assert.equal(shouldSearchWeb("who is the president", true), true);
});

test("shouldSearchWeb ignores text when disabled or without search intent", () => {
  assert.equal(shouldSearchWeb("สวัสดีครับ", true), false);
  assert.equal(shouldSearchWeb("ขอบคุณครับ", true), false);
  assert.equal(shouldSearchWeb("เข้าใจแล้ว", true), false);
  assert.equal(shouldSearchWeb("ขอคำใบ้", true), false);
  assert.equal(shouldSearchWeb("ค้นหาข้อมูล", false), false);
});

test("cleanSearchQuery removes search command words and polite noise", () => {
  assert.equal(cleanSearchQuery("/search Next.js 15"), "Next.js 15");
  assert.equal(cleanSearchQuery("ช่วยค้นหาเรื่อง Solana ให้หน่อยครับ"), "Solana");
  assert.equal(cleanSearchQuery("เสิร์ชข่าว AI วันนี้หน่อยค่ะ"), "ข่าว AI วันนี้");
  assert.equal(cleanSearchQuery("can you search for python tutorials"), "python tutorials");
});

test("formatSearchSources renders Markdown citations with locale headers", () => {
  const sources = [
    {
      title: "Solana Official",
      url: "https://solana.com",
      content: "Solana is high speed.",
    },
  ];

  const thai = formatSearchSources(sources, "th");
  assert.match(thai, /\*\*แหล่งข้อมูล:\*\*/);
  assert.match(thai, /\[Solana Official\]\(https:\/\/solana\.com\)/);

  const english = formatSearchSources(sources, "en");
  assert.match(english, /\*\*Sources:\*\*/);
  assert.match(english, /\[Solana Official\]\(https:\/\/solana\.com\)/);

  assert.equal(formatSearchSources([], "th"), "");
});
