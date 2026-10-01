import assert from "node:assert/strict";
import test from "node:test";
import { canonicalYoutubeUrl, loadYoutubeTranscript, transcriptText, youtubeVideoId } from "../lib/supadata.ts";

test("youtubeVideoId accepts public YouTube links and ignores other hosts", () => {
  assert.equal(youtubeVideoId("ดูคลิปนี้ https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10"), "dQw4w9WgXcQ");
  assert.equal(youtubeVideoId("https://youtu.be/abcdefghijk"), "abcdefghijk");
  assert.equal(youtubeVideoId("https://m.youtube.com/shorts/12345678901"), "12345678901");
  assert.equal(youtubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(youtubeVideoId("notyoutube.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(youtubeVideoId("https://youtu.be/dQw4w9WgXcQ และ https://youtu.be/abcdefghijk"), "dQw4w9WgXcQ");
});

test("transcriptText collapses whitespace and caps the length", () => {
  const parsed = transcriptText("  hello \n\n world \u0000 ");
  assert.deepEqual(parsed, { text: "hello world", truncated: false });
  const long = transcriptText("a".repeat(6_001));
  assert.equal(long?.truncated, true);
  assert.equal(long?.text.length, 6_000);
  assert.equal(transcriptText([{ text: "one" }, { text: "two" }])?.text, "one two");
  assert.equal(transcriptText(""), null);
});

test("loadYoutubeTranscript requests native captions and keeps the key on the header", async () => {
  const calls: Array<{ url: string; key: string | null }> = [];
  const result = await loadYoutubeTranscript("https://youtu.be/dQw4w9WgXcQ", "th", {
    apiKey: "test-key",
    fetch: async (url, init) => {
      calls.push({ url, key: new Headers(init?.headers).get("x-api-key") });
      return new Response(JSON.stringify({ content: "คำบรรยายของคลิป", lang: "th" }), { status: 200 });
    },
  });
  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    assert.equal(result.url, canonicalYoutubeUrl("dQw4w9WgXcQ"));
    assert.equal(result.transcript, "คำบรรยายของคลิป");
    assert.equal(result.lang, "th");
  }
  const requested = new URL(calls[0].url);
  assert.equal(requested.origin + requested.pathname, "https://api.supadata.ai/v1/transcript");
  assert.equal(requested.searchParams.get("mode"), "native");
  assert.equal(requested.searchParams.get("text"), "true");
  assert.equal(requested.searchParams.get("lang"), "th");
  assert.equal(requested.searchParams.get("url"), canonicalYoutubeUrl("dQw4w9WgXcQ"));
  assert.equal(calls[0].key, "test-key");
});

test("loadYoutubeTranscript reports a linked video when captions are missing", async () => {
  const result = await loadYoutubeTranscript("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "en", {
    apiKey: "test-key",
    fetch: async () => new Response(JSON.stringify({ error: "not-found" }), { status: 404 }),
  });
  assert.deepEqual(result, { status: "unavailable", url: canonicalYoutubeUrl("dQw4w9WgXcQ") });
});

test("loadYoutubeTranscript polls a queued job then reads the completed transcript", async () => {
  let calls = 0;
  const result = await loadYoutubeTranscript("https://www.youtube.com/embed/dQw4w9WgXcQ", "en", {
    apiKey: "test-key",
    sleep: async () => {},
    fetch: async (url) => {
      calls += 1;
      if (calls === 1) return new Response(JSON.stringify({ jobId: "job_12345678" }), { status: 202 });
      assert.equal(url, "https://api.supadata.ai/v1/transcript/job_12345678");
      return new Response(JSON.stringify({ status: "completed", content: "finished caption", lang: "en" }), { status: 200 });
    },
  });
  assert.equal(result.status, "ready");
  if (result.status === "ready") assert.equal(result.transcript, "finished caption");
});

test("loadYoutubeTranscript does nothing without a video link or a key", async () => {
  assert.deepEqual(await loadYoutubeTranscript("ช่วยอธิบายเศษส่วน", "th", { apiKey: "test-key" }), { status: "none" });
  assert.deepEqual(await loadYoutubeTranscript("https://youtu.be/dQw4w9WgXcQ", "th", { apiKey: "  " }), { status: "none" });
});
