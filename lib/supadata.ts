import type { Locale } from "@/lib/types";
import { runtimeEnv } from "@/lib/runtime-env";

const TRANSCRIPT_LIMIT = 6_000;
const POLL_LIMIT = 3;

export type YoutubeTranscript =
  | { status: "none" }
  | { status: "ready"; url: string; lang: string; transcript: string; truncated: boolean }
  | { status: "unavailable"; url: string };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const idPattern = /(?<![\w.-])(?:https?:\/\/)?(?:(?:www\.|m\.)?youtube\.com\/(?:watch\?[^\s#]*\bv=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})\b/gi;

export function youtubeVideoId(text: string): string | null {
  idPattern.lastIndex = 0;
  const match = idPattern.exec(text);
  return match?.[1] ?? null;
}

export function canonicalYoutubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function transcriptText(content: unknown): { text: string; truncated: boolean } | null {
  const raw = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((part) => (part && typeof part === "object" && "text" in part && typeof part.text === "string" ? part.text : "")).join(" ")
      : "";
  const cleaned = raw.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  const truncated = cleaned.length > TRANSCRIPT_LIMIT;
  return { text: truncated ? cleaned.slice(0, TRANSCRIPT_LIMIT) : cleaned, truncated };
}

function jobId(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,80}$/.test(value) ? value : null;
}

function payloadTranscript(body: unknown): { text: string; lang: string; truncated: boolean } | null {
  if (!body || typeof body !== "object") return null;
  const record = body as { content?: unknown; lang?: unknown; result?: { content?: unknown; lang?: unknown } };
  const content = record.content ?? record.result?.content;
  const parsed = transcriptText(content);
  if (!parsed) return null;
  const lang = typeof record.lang === "string" ? record.lang : typeof record.result?.lang === "string" ? record.result.lang : "";
  return { ...parsed, lang: lang.slice(0, 16) };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function loadYoutubeTranscript(
  text: string,
  locale: Locale,
  deps: { fetch?: FetchLike; sleep?: (ms: number) => Promise<void>; apiKey?: string } = {},
): Promise<YoutubeTranscript> {
  const videoId = youtubeVideoId(text);
  if (!videoId) return { status: "none" };
  const apiKey = (deps.apiKey ?? await runtimeEnv("SUPADATA_API_KEY"))?.trim();
  const url = canonicalYoutubeUrl(videoId);
  if (!apiKey) return { status: "none" };

  const fetchImpl = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const headers = { "x-api-key": apiKey, accept: "application/json" };
  const endpoint = new URL("https://api.supadata.ai/v1/transcript");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("text", "true");
  endpoint.searchParams.set("mode", "native");
  endpoint.searchParams.set("lang", locale === "th" ? "th" : "en");

  try {
    const response = await fetchImpl(endpoint.toString(), { headers, signal: AbortSignal.timeout(8_000) });
    if (response.status === 200) {
      const parsed = payloadTranscript(await readJson(response));
      return parsed ? { status: "ready", url, lang: parsed.lang, transcript: parsed.text, truncated: parsed.truncated } : { status: "unavailable", url };
    }
    if (response.status !== 202) {
      console.warn(`[supadata] transcript failed: ${response.status}`);
      return { status: "unavailable", url };
    }
    const started = jobId((await readJson(response) as { jobId?: unknown } | null)?.jobId);
    if (!started) return { status: "unavailable", url };
    for (let attempt = 0; attempt < POLL_LIMIT; attempt += 1) {
      await sleep(1_000);
      const polled = await fetchImpl(`https://api.supadata.ai/v1/transcript/${started}`, { headers, signal: AbortSignal.timeout(8_000) });
      if (!polled.ok) continue;
      const body = await readJson(polled) as { status?: unknown } | null;
      if (body?.status === "failed") return { status: "unavailable", url };
      if (body?.status === "completed") {
        const parsed = payloadTranscript(body);
        return parsed ? { status: "ready", url, lang: parsed.lang, transcript: parsed.text, truncated: parsed.truncated } : { status: "unavailable", url };
      }
    }
    return { status: "unavailable", url };
  } catch {
    console.warn("[supadata] transcript unavailable");
    return { status: "unavailable", url };
  }
}
