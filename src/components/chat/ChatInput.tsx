"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type ChatInputProps = {
  onSend: (content: string) => void;
  disabled?: boolean;
  loading?: boolean;
};

export function ChatInput({
  onSend,
  disabled = false,
  loading = false,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled, loading]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled || loading) return;
    onSend(trimmed);
    setValue("");
    inputRef.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-end gap-3 rounded-2xl bg-surface p-2.5 shadow-[var(--input-shadow)] ring-1 ring-border transition-opacity duration-200 ${
        loading ? "opacity-80" : "opacity-100"
      }`}
    >
      <label htmlFor="chat-input" className="sr-only">
        Message
      </label>
      <textarea
        id="chat-input"
        ref={inputRef}
        rows={1}
        value={value}
        disabled={disabled}
        readOnly={loading}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={loading ? "Waiting for agent…" : "Message your agent…"}
        className="max-h-36 min-h-[2.75rem] flex-1 resize-none bg-transparent px-3 py-2.5 text-[0.95rem] leading-relaxed text-foreground outline-none placeholder:text-muted disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={disabled || loading || !value.trim()}
        aria-label={loading ? "Waiting for response" : "Send message"}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg transition-[transform,opacity,background-color] duration-200 hover:bg-accent-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="h-5 w-5"
        >
          <path
            d="M5 12h12M13 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
}
