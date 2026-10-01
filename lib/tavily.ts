import type { Locale } from "@/lib/types";
import { runtimeEnv } from "@/lib/runtime-env";

type TavilyResult = { title?: unknown; url?: unknown; content?: unknown };
type TavilyResponse = { results?: TavilyResult[] };

const searchIntent = /(?:\b(?:search|look\s*up|find (?:out|information)|research|sources?|references?|latest|current|today|news|price|population|statistics|recent|this year|compare|who is|when did|what is)\b|(?:ค้นหา|ค้นให้|หาข้อมูล|ช่วยหา|ค้นคว้า|สืบค้น|แหล่งข้อมูล|อ้างอิง|ล่าสุด|ปัจจุบัน|วันนี้|ข่าว|ราคา|ประชากร|สถิติ|ปีนี้|เปรียบเทียบ|เท่าไหร่|เท่าไร|กี่คน|เมื่อไหร่|ใครคือ|คืออะไร|คือใคร))/iu;
const webSearchCommand = /^\/(?:search|find|google)\b/i;

export type TavilySource = { title: string; url: string; content: string };

export function cleanSearchQuery(text: string): string {
  let q = text.trim();
  q = q.replace(/^\/(?:search|find|google)\s+/i, "");
  q = q.replace(/^(?:ช่วย|อยากให้)?(?:ค้นหา|ค้น|เสิร์ช|หาข้อมูล)(?:เรื่อง|เกี่ยวกับ|ให้หน่อย)?\s*/iu, "");
  q = q.replace(/^(?:can you )?search (?:for )?/i, "");
  q = q.replace(/\s*(?:ให้หน่อยครับ|ให้หน่อยค่ะ|ให้หน่อย|หน่อยครับ|หน่อยค่ะ|หน่อย|ครับ|ค่ะ|นะ|นะคะ)$/iu, "");
  return q.trim() || text.trim();
}

export function shouldSearchWeb(text: string, enabled = Boolean(process.env.TAVILY_API_KEY?.trim())) {
  const query = text.trim();
  return enabled && (webSearchCommand.test(query) || searchIntent.test(query));
}

function safeSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    return url.href.replaceAll("(", "%28").replaceAll(")", "%29");
  } catch {
    return null;
  }
}

export async function searchTavily(text: string, locale: Locale): Promise<TavilySource[]> {
  const apiKey = await runtimeEnv("TAVILY_API_KEY");
  if (!apiKey || !shouldSearchWeb(text, true)) return [];
  try {
    const query = cleanSearchQuery(text).slice(0, 500);
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: 3,
        include_answer: false,
        include_raw_content: false,
        include_images: false,
        ...(locale === "th" ? { country: "thailand", language: "th" } : { language: "en" }),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      console.warn(`[tavily-search] request failed: ${response.status}`);
      return [];
    }
    const data = (await response.json()) as TavilyResponse;
    return (data.results ?? []).flatMap(result => {
      if (typeof result.title !== "string" || typeof result.url !== "string" || typeof result.content !== "string") return [];
      const url = safeSourceUrl(result.url);
      if (!url) return [];
      return [{ title: result.title.replace(/[\r\n\u0000-\u001f]/g, " ").slice(0, 180), url, content: result.content.slice(0, 1_800) }];
    }).slice(0, 3);
  } catch {
    console.warn("[tavily-search] request unavailable");
    return [];
  }
}

export function formatSearchSources(sources: TavilySource[], locale: Locale) {
  if (!sources.length) return "";
  const heading = locale === "en" ? "Sources" : "แหล่งข้อมูล";
  const links = sources.map(source => `- [${source.title.replace(/[\\[\]()]/g, "\\$&")}](${source.url})`).join("\n");
  return `\n\n**${heading}:**\n${links}`;
}
