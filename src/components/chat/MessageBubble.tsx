import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@/types/chat";

type MessageBubbleProps = {
  message: ChatMessage;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`message-enter flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex max-w-[min(100%,36rem)] flex-col gap-1.5 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <span className="px-1 text-[0.7rem] font-medium tracking-[0.08em] text-muted uppercase">
          {isUser ? "You" : "Agent"}
        </span>
        <div
          className={`rounded-2xl px-4 py-3 text-[0.95rem] leading-relaxed shadow-[var(--bubble-shadow)] ${
            isUser
              ? "rounded-br-md bg-accent text-accent-fg"
              : "rounded-bl-md bg-surface text-foreground ring-1 ring-border"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="markdown-body break-words">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
