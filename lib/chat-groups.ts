export type ChatHistoryItem = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  preview: string;
  updatedAt: string;
};

export type HistoryGroup = "today" | "yesterday" | "week" | "month" | "older";

const BANGKOK = "Asia/Bangkok";

function bangkokDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dayIndex(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function groupChatHistory(items: ChatHistoryItem[], now = new Date()) {
  const buckets: Record<HistoryGroup, ChatHistoryItem[]> = {
    today: [],
    yesterday: [],
    week: [],
    month: [],
    older: [],
  };
  const todayIndex = dayIndex(bangkokDateKey(now));

  for (const item of items) {
    if (!item.updatedAt) {
      buckets.older.push(item);
      continue;
    }
    const date = new Date(item.updatedAt);
    if (Number.isNaN(date.getTime())) {
      buckets.older.push(item);
      continue;
    }
    const days = todayIndex - dayIndex(bangkokDateKey(date));
    if (days <= 0) buckets.today.push(item);
    else if (days === 1) buckets.yesterday.push(item);
    else if (days <= 7) buckets.week.push(item);
    else if (days <= 30) buckets.month.push(item);
    else buckets.older.push(item);
  }

  const order: HistoryGroup[] = ["today", "yesterday", "week", "month", "older"];
  return order.filter((group) => buckets[group].length > 0).map((group) => ({ group, items: buckets[group] }));
}
