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

export type ApprovalField = {
  label: string;
  value: string;
};

export type ApprovalView = {
  kind: "review";
  title: string;
  summary: string;
  body: string;
  fields: ApprovalField[];
  actions: Array<"approve" | "reject" | "modify">;
  hint: string;
};

export type SessionChatTurn = {
  role: "user" | "assistant";
  content: string;
  at: string;
};

export type AgentChatResult = {
  sessionId: string;
  goal: string;
  status: AgentStatus;
  answer: string;
  approval: ApprovalView | null;
  pendingTool: PendingTool | null;
  toolHistory: unknown[];
  chatHistory?: SessionChatTurn[];
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
  messages?: AgentApiMessage[];
  chatHistory?: SessionChatTurn[];
};
