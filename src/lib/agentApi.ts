import type {
  AgentApiMessage,
  AgentChatResult,
  ChatMessage,
  SessionMessagesResponse,
} from "@/types/chat";

const API_BASE = process.env.NEXT_PUBLIC_AGENT_API_BASE ?? "/backend";
const SESSION_KEY = "personal-agent-session-id";

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

  const response = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as AgentChatResult;
}

/** GET /sessions/:id/messages — preferred */
export async function fetchSessionMessages(
  sessionId: string,
): Promise<AgentApiMessage[]> {
  const messagesUrl = `${API_BASE}/sessions/${encodeURIComponent(sessionId)}/messages`;
  const messagesResponse = await fetch(messagesUrl, { method: "GET" });

  if (messagesResponse.ok) {
    const data = (await messagesResponse.json()) as SessionMessagesResponse;
    return data.messages ?? [];
  }

  // Fallback: full session payload (includes messages in current backend)
  if (messagesResponse.status === 404) {
    const sessionResponse = await fetch(
      `${API_BASE}/sessions/${encodeURIComponent(sessionId)}`,
      { method: "GET" },
    );

    if (!sessionResponse.ok) {
      throw new Error(await readError(sessionResponse));
    }

    const session = (await sessionResponse.json()) as {
      messages?: AgentApiMessage[];
    };
    return session.messages ?? [];
  }

  throw new Error(await readError(messagesResponse));
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

/** Map Anthropic-style session messages into UI bubbles */
export function toChatMessages(apiMessages: AgentApiMessage[]): ChatMessage[] {
  const mapped: ChatMessage[] = [];

  apiMessages.forEach((message, index) => {
    const text = extractText(message.content);
    if (!text) return;

    mapped.push({
      id: `${message.role}-${index}-${text.slice(0, 24)}`,
      role: message.role === "user" ? "user" : "agent",
      content: text,
      createdAt: Date.now() + index,
    });
  });

  return mapped;
}
