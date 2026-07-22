"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentStatus,
  ChatHistoryItem,
  ChatMessage,
  PendingTool,
} from "@/types/chat";
import {
  clearStoredSessionId,
  fetchSessionMessages,
  getStoredSessionId,
  sendChatMessage,
  storeSessionId,
  toChatMessages,
} from "@/lib/agentApi";
import {
  getChatHistory,
  makeChatTitle,
  removeChatHistory,
  upsertChatHistory,
} from "@/lib/chatHistory";
import { ChatInput } from "./ChatInput";
import { ChatSidebar } from "./ChatSidebar";
import { MessageBubble } from "./MessageBubble";
import { ThinkingIndicator } from "./ThinkingIndicator";

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ChatApp() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [pendingTool, setPendingTool] = useState<PendingTool | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  }, [messages, isSending, pendingTool]);

  const rememberChat = useCallback((id: string, titleSource: string) => {
    const next = upsertChatHistory({
      sessionId: id,
      title: makeChatTitle(titleSource),
      updatedAt: Date.now(),
    });
    setHistory(next);
  }, []);

  const syncMessages = useCallback(async (id: string) => {
    const apiMessages = await fetchSessionMessages(id);
    const mapped = toChatMessages(apiMessages);
    if (mapped.length > 0) {
      setMessages(mapped);
    }
    return mapped;
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
        const mapped = await syncMessages(storedId);
        if (!cancelled) {
          setSessionId(storedId);
          if (mapped[0]?.content) {
            rememberChat(storedId, mapped[0].content);
          }
        }
      } catch {
        clearStoredSessionId();
        if (!cancelled) {
          setSessionId(null);
          setMessages([]);
        }
      } finally {
        if (!cancelled) setIsLoadingSession(false);
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, [rememberChat, syncMessages]);

  function startNewChat() {
    clearStoredSessionId();
    sessionIdRef.current = null;
    setSessionId(null);
    setMessages([]);
    setStatus(null);
    setPendingTool(null);
    setError(null);
    setIsSending(false);
  }

  async function openChat(id: string) {
    if (id === sessionIdRef.current || isSending) return;

    setError(null);
    setIsLoadingSession(true);
    setStatus(null);
    setPendingTool(null);

    try {
      const mapped = await syncMessages(id);
      storeSessionId(id);
      sessionIdRef.current = id;
      setSessionId(id);

      if (mapped.length === 0) {
        setMessages([]);
        setError("This chat has no messages yet, or the session expired.");
      } else {
        rememberChat(id, mapped[0]?.content ?? "Previous chat");
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
      setPendingTool(result.pendingTool);
      rememberChat(result.sessionId, result.goal || content);

      try {
        const apiMessages = await fetchSessionMessages(result.sessionId);
        const mapped = toChatMessages(apiMessages);

        if (mapped.length > 0) {
          setMessages(mapped);
        } else if (result.answer?.trim()) {
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
    } catch (err) {
      setMessages((current) =>
        current.filter((message) => message.id !== optimisticUser.id),
      );
      setError(err instanceof Error ? err.message : "Failed to reach the agent");
    } finally {
      setIsSending(false);
    }
  }

  const waitingForApproval = status === "waiting_for_approval";

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
          <div className="mb-1 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="absolute left-0 top-3 rounded-xl bg-surface px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border lg:hidden"
            >
              Chats
            </button>
            <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-accent uppercase">
              Always on
            </p>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Personal Agent
          </h1>
        </header>

        <section
          aria-label="Chat messages"
          className="relative mb-3 min-h-0 flex-1 overflow-y-auto rounded-[1.5rem] bg-panel px-3 py-4 shadow-[var(--panel-shadow)] ring-1 ring-border sm:px-5"
        >
          {isLoadingSession ? (
            <div className="flex h-full min-h-64 items-center justify-center text-sm text-muted">
              Restoring conversation…
            </div>
          ) : messages.length === 0 && !isSending ? (
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
                Type a message below to begin chatting with your personal agent.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {isSending ? <ThinkingIndicator /> : null}

              {waitingForApproval && pendingTool ? (
                <div className="rounded-2xl bg-accent-soft px-4 py-3 text-sm text-foreground ring-1 ring-border">
                  <p className="font-medium">Approval needed</p>
                  <p className="mt-1 text-muted">
                    The agent wants to run{" "}
                    <span className="font-medium text-foreground">
                      {pendingTool.name}
                    </span>
                    . Reply with <strong>yes</strong> or <strong>no</strong>.
                  </p>
                </div>
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
    </div>
  );
}
