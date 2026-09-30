import assert from "node:assert/strict";
import test from "node:test";
import { groupChatHistory, type ChatHistoryItem } from "../lib/chat-groups.ts";

const now = new Date("2026-09-28T10:00:00+07:00");

function item(id: string, updatedAt: string): ChatHistoryItem {
  return { id, href: `/learn/${id}`, title: id, subtitle: "Ray", preview: "", updatedAt };
}

test("chat history groups by Bangkok calendar day the way a conversation list does", () => {
  const groups = groupChatHistory([
    item("today", "2026-09-28T02:00:00.000Z"),
    item("late", "2026-09-28T17:30:00.000Z"),
    item("yesterday", "2026-09-27T10:00:00+07:00"),
    item("week", "2026-09-21T12:00:00+07:00"),
    item("month", "2026-09-20T12:00:00+07:00"),
    item("older", "2026-08-01T12:00:00+07:00"),
    item("undated", ""),
  ], now);

  const names = groups.map((group) => group.group);
  assert.deepEqual(names, ["today", "yesterday", "week", "month", "older"]);
  assert.deepEqual(groups[0]?.items.map((entry) => entry.id), ["today", "late"]);
  assert.deepEqual(groups.at(-1)?.items.map((entry) => entry.id), ["older", "undated"]);
});
