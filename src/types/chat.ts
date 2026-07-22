export type MessageRole = "user" | "agent";

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
};

export type ChatHistoryItem = {
  sessionId: string;
  title: string;
  updatedAt: number;
};

export type AgentStatus = "running" | "waiting_for_approval" | "completed";

export type PendingTool = {
  name: string;
  input: unknown;
  toolUseId: string;
};

export type AgentChatResult = {
  sessionId: string;
  goal: string;
  status: AgentStatus;
  answer: string;
  pendingTool: PendingTool | null;
  toolHistory: unknown[];
};

export type AgentApiMessage = {
  role: "user" | "assistant";
  content: string | AgentContentBlock[];
};

export type AgentContentBlock =
  | { type: "text"; text: string }
  | { type: string; [key: string]: unknown };

export type SessionMessagesResponse = {
  sessionId: string;
  messages: AgentApiMessage[];
};
