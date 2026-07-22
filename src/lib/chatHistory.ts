import type { ChatHistoryItem } from "@/types/chat";

const HISTORY_KEY = "personal-agent-chat-history";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getChatHistory(): ChatHistoryItem[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatHistoryItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveChatHistory(items: ChatHistoryItem[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

export function upsertChatHistory(item: ChatHistoryItem): ChatHistoryItem[] {
  const current = getChatHistory().filter(
    (entry) => entry.sessionId !== item.sessionId,
  );
  const next = [item, ...current];
  saveChatHistory(next);
  return next;
}

export function removeChatHistory(sessionId: string): ChatHistoryItem[] {
  const next = getChatHistory().filter((entry) => entry.sessionId !== sessionId);
  saveChatHistory(next);
  return next;
}

export function makeChatTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New chat";
  return cleaned.length > 42 ? `${cleaned.slice(0, 42)}…` : cleaned;
}
