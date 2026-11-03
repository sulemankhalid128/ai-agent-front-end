"use client";

import type { ChatHistoryItem } from "@/types/chat";

type ChatSidebarProps = {
  items: ChatHistoryItem[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onDelete: (sessionId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  open: boolean;
  onClose: () => void;
};

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function ChatSidebar({
  items,
  activeSessionId,
  onSelect,
  onNewChat,
  onDelete,
  disabled = false,
  loading = false,
  open,
  onClose,
}: ChatSidebarProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Close chat list"
        className={`fixed inset-0 z-30 bg-black/25 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[17.5rem] flex-col border-r border-border bg-[rgba(247,248,245,0.96)] shadow-[var(--panel-shadow)] backdrop-blur-md transition-transform duration-200 lg:static lg:z-0 lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4">
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-accent uppercase">
              History
            </p>
            <h2 className="font-display text-lg text-foreground">Chats</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            disabled={disabled}
            className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            New chat
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {loading ? (
            <p className="px-3 py-6 text-center text-sm leading-relaxed text-muted">
              Loading chats…
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm leading-relaxed text-muted">
              Your previous chats will appear here.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {items.map((item) => {
                const isActive = item.sessionId === activeSessionId;

                return (
                  <li key={item.sessionId}>
                    <div
                      className={`group flex items-start gap-1 rounded-xl px-2 py-2 transition-colors ${
                        isActive ? "bg-accent-soft" : "hover:bg-surface"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          onSelect(item.sessionId);
                          onClose();
                        }}
                        className="min-w-0 flex-1 rounded-lg px-1.5 py-1 text-left disabled:opacity-50"
                      >
                        <p
                          className={`truncate text-sm font-medium ${
                            isActive ? "text-accent" : "text-foreground"
                          }`}
                        >
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-[0.7rem] text-muted">
                          {formatTime(item.updatedAt)}
                        </p>
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${item.title}`}
                        disabled={disabled}
                        onClick={() => onDelete(item.sessionId)}
                        className="rounded-lg px-2 py-1 text-xs text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface hover:text-foreground disabled:opacity-40"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
