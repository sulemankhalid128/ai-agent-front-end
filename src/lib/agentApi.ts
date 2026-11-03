import type {
  AgentApiMessage,
  AgentChatResult,
  AgentStatus,
  ApprovalView,
  ChatMessage,
  PendingTool,
  SessionChatTurn,
  SessionMessagesResponse,
} from "@/types/chat";
import { API_BASE, readApiError } from "./apiBase";
import { authHeaders, clearAuth } from "./auth";

const SESSION_KEY = "personal-agent-session-id";

export type AgentSession = {
  sessionId: string;
  goal: string;
  status: AgentStatus;
  answer?: string;
  approval: ApprovalView | null;
  pendingTool: PendingTool | null;
  toolHistory: unknown[];
  chatHistory: SessionChatTurn[];
  messages?: AgentApiMessage[];
};

export function getStoredSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function storeSessionId(sessionId: string) {
  window.localStorage.setItem(SESSION_KEY, sessionId);
}

export function clearStoredSessionId() {
  window.localStorage.removeItem(SESSION_KEY);
}

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  if (response.status === 401) {
    clearAuth();
    clearStoredSessionId();
  }
  throw new Error(await readApiError(response));
}

/** POST / — start or continue a chat turn */
export async function sendChatMessage(
  query: string,
  sessionId?: string | null,
): Promise<AgentChatResult> {
  const body: { query: string; sessionId?: string } = { query };
  if (sessionId) body.sessionId = sessionId;

  const response = await fetch(`${API_BASE}/`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(body),
  });

  await ensureOk(response);
  return (await response.json()) as AgentChatResult;
}

function normalizeSession(data: AgentSession): AgentSession {
  return {
    ...data,
    sessionId: data.sessionId,
    chatHistory: data.chatHistory ?? [],
    approval: data.approval ?? null,
    pendingTool: data.pendingTool ?? null,
    toolHistory: data.toolHistory ?? [],
  };
}

/**
 * GET /chats/:id — preferred: one chat + messages/history.
 * Falls back to GET /sessions/:id for older backends.
 */
export async function fetchSession(sessionId: string): Promise<AgentSession> {
  const chatUrl = `${API_BASE}/chats/${encodeURIComponent(sessionId)}`;
  const chatResponse = await fetch(chatUrl, {
    method: "GET",
    headers: authHeaders(false),
  });

  if (chatResponse.ok) {
    const data = (await chatResponse.json()) as AgentSession & {
      id?: string;
    };
    return normalizeSession({
      ...data,
      sessionId: data.sessionId ?? data.id ?? sessionId,
    });
  }

  if (chatResponse.status === 401) {
    await ensureOk(chatResponse);
  }

  const sessionResponse = await fetch(
    `${API_BASE}/sessions/${encodeURIComponent(sessionId)}`,
    { method: "GET", headers: authHeaders(false) },
  );

  await ensureOk(sessionResponse);

  const data = (await sessionResponse.json()) as AgentSession;
  return normalizeSession({
    ...data,
    sessionId: data.sessionId ?? sessionId,
  });
}

/** GET /sessions/:id/messages — messages only; fall back to full chat */
export async function fetchSessionChat(
  sessionId: string,
): Promise<SessionChatTurn[]> {
  const messagesUrl = `${API_BASE}/sessions/${encodeURIComponent(sessionId)}/messages`;
  const messagesResponse = await fetch(messagesUrl, {
    method: "GET",
    headers: authHeaders(false),
  });

  if (messagesResponse.ok) {
    const data = (await messagesResponse.json()) as SessionMessagesResponse;
    if (data.chatHistory?.length) return data.chatHistory;
    if (data.messages?.length) return toChatTurnsFromMessages(data.messages);
  }

  const session = await fetchSession(sessionId);
  if (session.chatHistory?.length) return session.chatHistory;

  return toChatTurnsFromMessages(session.messages ?? []);
}

function extractText(content: AgentApiMessage["content"]): string {
  if (typeof content === "string") return content.trim();

  return content
    .filter(
      (block): block is { type: "text"; text: string } =>
        block.type === "text" && typeof block.text === "string",
    )
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function toChatTurnsFromMessages(
  apiMessages: AgentApiMessage[],
): SessionChatTurn[] {
  const turns: SessionChatTurn[] = [];

  apiMessages.forEach((message) => {
    const text = extractText(message.content);
    if (!text) return;
    turns.push({
      role: message.role,
      content: text,
      at: new Date().toISOString(),
    });
  });

  return turns;
}

/** Map backend chatHistory into UI bubbles */
export function toChatMessagesFromHistory(
  chatHistory: SessionChatTurn[],
): ChatMessage[] {
  return chatHistory
    .filter((turn) => turn.content?.trim())
    .map((turn, index) => ({
      id: `${turn.role}-${turn.at ?? index}-${turn.content.slice(0, 24)}`,
      role: turn.role === "user" ? "user" : "agent",
      content: turn.content.trim(),
      createdAt: turn.at ? Date.parse(turn.at) || Date.now() + index : Date.now() + index,
    }));
}

/**
 * Build UI messages from session/result.
 * When an approval card is shown, drop the trailing duplicate approval text.
 */
export function messagesFromChatPayload(payload: {
  chatHistory?: SessionChatTurn[];
  messages?: AgentApiMessage[];
  status?: AgentStatus;
  answer?: string;
  approval?: ApprovalView | null;
}): ChatMessage[] {
  const turns =
    payload.chatHistory && payload.chatHistory.length > 0
      ? [...payload.chatHistory]
      : toChatTurnsFromMessages(payload.messages ?? []);

  if (
    payload.status === "waiting_for_approval" &&
    payload.approval &&
    payload.answer?.trim()
  ) {
    const answer = payload.answer.trim();
    while (
      turns.length > 0 &&
      turns[turns.length - 1]?.role === "assistant" &&
      turns[turns.length - 1]?.content.trim() === answer
    ) {
      turns.pop();
    }
  }

  return toChatMessagesFromHistory(turns);
}
