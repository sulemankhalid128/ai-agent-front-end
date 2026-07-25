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

const API_BASE = process.env.NEXT_PUBLIC_AGENT_API_BASE ?? "http://localhost:3001";
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

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (data.error) return data.error;
  } catch {
    // ignore JSON parse errors
  }
  return `Request failed (${response.status})`;
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as AgentChatResult;
}

/** GET /sessions/:id — full session including chatHistory + approval */
export async function fetchSession(sessionId: string): Promise<AgentSession> {
  const response = await fetch(
    `${API_BASE}/sessions/${encodeURIComponent(sessionId)}`,
    { method: "GET" },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const data = (await response.json()) as AgentSession;
  return {
    ...data,
    chatHistory: data.chatHistory ?? [],
    approval: data.approval ?? null,
  };
}

/** Prefer chatHistory; fall back to Anthropic messages if needed */
export async function fetchSessionChat(
  sessionId: string,
): Promise<SessionChatTurn[]> {
  const messagesUrl = `${API_BASE}/sessions/${encodeURIComponent(sessionId)}/messages`;
  const messagesResponse = await fetch(messagesUrl, { method: "GET" });

  if (messagesResponse.ok) {
    const data = (await messagesResponse.json()) as SessionMessagesResponse;
    if (data.chatHistory?.length) return data.chatHistory;
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
