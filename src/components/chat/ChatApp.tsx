"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentStatus,
  ApprovalView,
  ChatHistoryItem,
  ChatMessage,
} from "@/types/chat";
import {
  clearStoredSessionId,
  fetchSession,
  getStoredSessionId,
  messagesFromChatPayload,
  sendChatMessage,
  storeSessionId,
} from "@/lib/agentApi";
import {
  getChatHistory,
  makeChatTitle,
  removeChatHistory,
  upsertChatHistory,
} from "@/lib/chatHistory";
import { ApprovalCard } from "./ApprovalCard";
import { ChatInput } from "./ChatInput";
import { ChatSidebar } from "./ChatSidebar";
import { FeedKnowledgeModal } from "./FeedKnowledgeModal";
import { MessageBubble } from "./MessageBubble";
import { ThinkingIndicator } from "./ThinkingIndicator";
import type { AuthUser } from "@/lib/auth";
import { logout as clearAuthSession } from "@/lib/auth";

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type ChatAppProps = {
  user: AuthUser;
  onLogout: () => void;
};

export function ChatApp({ user, onLogout }: ChatAppProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [approval, setApproval] = useState<ApprovalView | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    setHistory(getChatHistory());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending, approval]);

  const rememberChat = useCallback((id: string, titleSource: string) => {
    const next = upsertChatHistory({
      sessionId: id,
      title: makeChatTitle(titleSource),
      updatedAt: Date.now(),
    });
    setHistory(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const storedId = getStoredSessionId();
      if (!storedId) {
        setIsLoadingSession(false);
        return;
      }

      try {
        const session = await fetchSession(storedId);
        if (cancelled) return;

        setSessionId(storedId);
        setStatus(session.status);
        setApproval(session.approval);
        const mapped = messagesFromChatPayload(session);
        setMessages(mapped);

        if (mapped[0]?.content) {
          rememberChat(storedId, mapped[0].content);
        } else if (session.goal) {
          rememberChat(storedId, session.goal);
        }
      } catch {
        clearStoredSessionId();
        if (!cancelled) {
          setSessionId(null);
          setMessages([]);
          setStatus(null);
          setApproval(null);
        }
      } finally {
        if (!cancelled) setIsLoadingSession(false);
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, [rememberChat]);

  function startNewChat() {
    clearStoredSessionId();
    sessionIdRef.current = null;
    setSessionId(null);
    setMessages([]);
    setStatus(null);
    setApproval(null);
    setError(null);
    setIsSending(false);
  }

  async function openChat(id: string) {
    if (id === sessionIdRef.current || isSending) return;

    setError(null);
    setIsLoadingSession(true);
    setStatus(null);
    setApproval(null);

    try {
      const session = await fetchSession(id);
      storeSessionId(id);
      sessionIdRef.current = id;
      setSessionId(id);
      setStatus(session.status);
      setApproval(session.approval);

      const mapped = messagesFromChatPayload(session);
      setMessages(mapped);

      if (mapped.length === 0 && !session.approval) {
        setError("This chat has no messages yet, or the session expired.");
      } else {
        rememberChat(id, mapped[0]?.content ?? session.goal ?? "Previous chat");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not open this chat. The session may have expired.",
      );
    } finally {
      setIsLoadingSession(false);
    }
  }

  function deleteChat(id: string) {
    const next = removeChatHistory(id);
    setHistory(next);

    if (sessionIdRef.current === id) {
      startNewChat();
    }
  }

  async function handleSend(content: string) {
    setError(null);
    setIsSending(true);

    const optimisticUser: ChatMessage = {
      id: createId(),
      role: "user",
      content,
      createdAt: Date.now(),
    };
    setMessages((current) => [...current, optimisticUser]);

    try {
      const result = await sendChatMessage(content, sessionIdRef.current);

      storeSessionId(result.sessionId);
      sessionIdRef.current = result.sessionId;
      setSessionId(result.sessionId);
      setStatus(result.status);
      setApproval(result.approval ?? null);
      rememberChat(result.sessionId, result.goal || content);

      if (result.chatHistory?.length) {
        setMessages(messagesFromChatPayload(result));
      } else {
        try {
          const session = await fetchSession(result.sessionId);
          setApproval(session.approval);
          setStatus(session.status);
          setMessages(messagesFromChatPayload(session));
        } catch {
          if (result.answer?.trim()) {
            setMessages((current) => [
              ...current,
              {
                id: createId(),
                role: "agent",
                content: result.answer,
                createdAt: Date.now(),
              },
            ]);
          }
        }
      }
    } catch (err) {
      setMessages((current) =>
        current.filter((message) => message.id !== optimisticUser.id),
      );
      const message =
        err instanceof Error ? err.message : "Failed to reach the agent";
      if (
        message.toLowerCase().includes("authorization") ||
        message.toLowerCase().includes("token") ||
        message.toLowerCase().includes("unauthorized")
      ) {
        clearAuthSession();
        clearStoredSessionId();
        onLogout();
        return;
      }
      setError(message);
    } finally {
      setIsSending(false);
    }
  }

  const waitingForApproval =
    status === "waiting_for_approval" && approval !== null;

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <ChatSidebar
        items={history}
        activeSessionId={sessionId}
        onSelect={openChat}
        onNewChat={startNewChat}
        onDelete={deleteChat}
        disabled={isSending || isLoadingSession}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="mx-auto flex min-w-0 flex-1 flex-col px-4 sm:px-6">
        <header className="brand-enter relative shrink-0 pt-3 pb-2 text-center sm:pt-4 sm:pb-3">
          <div className="relative mb-1 flex min-h-8 items-center justify-center">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="absolute left-0 top-0 rounded-xl bg-surface px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border lg:hidden"
            >
              Chats
            </button>
            <div className="absolute right-0 top-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFeedOpen(true)}
                className="rounded-xl bg-surface px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border transition-colors hover:bg-accent-soft"
              >
                Feed
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAuthSession();
                  clearStoredSessionId();
                  onLogout();
                }}
                className="rounded-xl bg-surface px-3 py-1.5 text-xs font-medium text-muted ring-1 ring-border transition-colors hover:bg-accent-soft hover:text-foreground"
              >
                Log out
              </button>
            </div>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            MSK
          </h1>
          <p className="mt-1 truncate px-16 text-xs text-muted sm:px-24">
            {user.name ? `${user.name} · ` : ""}
            {user.email}
          </p>
        </header>

        <section
          aria-label="Chat messages"
          className="relative mb-3 min-h-0 flex-1 overflow-y-auto rounded-[1.5rem] bg-panel px-3 py-4 shadow-[var(--panel-shadow)] ring-1 ring-border sm:px-5"
        >
          {isLoadingSession ? (
            <div className="flex h-full min-h-64 items-center justify-center text-sm text-muted">
              Restoring conversation…
            </div>
          ) : messages.length === 0 && !isSending && !waitingForApproval ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center px-4 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="h-6 w-6"
                >
                  <path
                    d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8H8l-4 3v-5.2A7.9 7.9 0 0 1 4 12Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="font-display text-xl text-foreground">
                Start a conversation
              </p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
                Type a message below to begin chatting with MSK.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {isSending ? <ThinkingIndicator /> : null}

              {waitingForApproval && approval ? (
                <ApprovalCard
                  approval={approval}
                  disabled={isSending}
                  onApprove={() => void handleSend("yes")}
                  onReject={() => void handleSend("no")}
                />
              ) : null}

              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <div className="shrink-0 space-y-2 pb-4 sm:pb-5">
          {error ? (
            <p className="text-center text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <ChatInput
            onSend={handleSend}
            disabled={isLoadingSession}
            loading={isSending}
          />
        </div>
      </div>
      <FeedKnowledgeModal open={feedOpen} onClose={() => setFeedOpen(false)} />
    </div>
  );
}
