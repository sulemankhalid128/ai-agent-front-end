import type { ChatHistoryItem } from "@/types/chat";
import { API_BASE, readApiError } from "./apiBase";
import { authHeaders, clearAuth } from "./auth";

const SESSION_KEY = "personal-agent-session-id";

/** Loose backend chat list entry — normalize field names */
type RawChatListEntry = {
  sessionId?: string;
  id?: string;
  _id?: string;
  title?: string;
  goal?: string;
  name?: string;
  updatedAt?: string | number;
  updated_at?: string | number;
  createdAt?: string | number;
  created_at?: string | number;
};

function toTimestamp(value: string | number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

function normalizeChatListEntry(raw: RawChatListEntry): ChatHistoryItem | null {
  const sessionId = raw.sessionId ?? raw.id ?? raw._id;
  if (!sessionId) return null;

  const titleSource = raw.title ?? raw.goal ?? raw.name ?? "Chat";
  return {
    sessionId,
    title: makeChatTitle(titleSource),
    updatedAt: toTimestamp(
      raw.updatedAt ?? raw.updated_at ?? raw.createdAt ?? raw.created_at,
    ),
  };
}

function extractChatArray(data: unknown): RawChatListEntry[] {
  if (Array.isArray(data)) return data as RawChatListEntry[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["chats", "sessions", "items", "data"]) {
      if (Array.isArray(obj[key])) return obj[key] as RawChatListEntry[];
    }
  }
  return [];
}

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  if (response.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }
  throw new Error(await readApiError(response));
}

/** GET /chats — list all chats for the signed-in user */
export async function fetchChatList(): Promise<ChatHistoryItem[]> {
  const response = await fetch(`${API_BASE}/chats`, {
    method: "GET",
    headers: authHeaders(false),
  });

  await ensureOk(response);

  const data: unknown = await response.json();
  return extractChatArray(data)
    .map(normalizeChatListEntry)
    .filter((item): item is ChatHistoryItem => item !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** DELETE /chats/:sessionId */
export async function deleteChatOnServer(sessionId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/chats/${encodeURIComponent(sessionId)}`,
    { method: "DELETE", headers: authHeaders(false) },
  );

  await ensureOk(response);
}

/** Optimistic local upsert (does not persist — server owns the list) */
export function upsertChatInList(
  items: ChatHistoryItem[],
  item: ChatHistoryItem,
): ChatHistoryItem[] {
  const next = items.filter((entry) => entry.sessionId !== item.sessionId);
  return [item, ...next].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function removeChatFromList(
  items: ChatHistoryItem[],
  sessionId: string,
): ChatHistoryItem[] {
  return items.filter((entry) => entry.sessionId !== sessionId);
}

export function makeChatTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New chat";
  return cleaned.length > 42 ? `${cleaned.slice(0, 42)}…` : cleaned;
}
