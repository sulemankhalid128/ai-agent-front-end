export function ThinkingIndicator() {
  return (
    <div
      className="message-enter flex justify-start"
      role="status"
      aria-live="polite"
      aria-label="Agent is thinking"
    >
      <div className="flex max-w-[min(100%,36rem)] flex-col gap-1.5 items-start">
        <span className="px-1 text-[0.7rem] font-medium tracking-[0.08em] text-muted uppercase">
          Agent
        </span>
        <div className="rounded-2xl rounded-bl-md bg-surface px-4 py-3 text-[0.95rem] leading-relaxed text-foreground shadow-[var(--bubble-shadow)] ring-1 ring-border">
          <p className="flex items-center gap-0.5">
            Thinking
            <span className="thinking-blink" aria-hidden="true">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
