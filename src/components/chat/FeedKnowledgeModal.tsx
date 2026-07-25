"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { feedKnowledge } from "@/lib/feedApi";

type FeedKnowledgeModalProps = {
  open: boolean;
  onClose: () => void;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FeedKnowledgeModal({ open, onClose }: FeedKnowledgeModalProps) {
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("notes.txt");
  const [files, setFiles] = useState<File[]>([]);
  const [useCompanyPolicy, setUseCompanyPolicy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, isSubmitting]);

  useEffect(() => {
    if (!open) {
      setText("");
      setFileName("notes.txt");
      setFiles([]);
      setUseCompanyPolicy(false);
      setError(null);
      setSuccess(null);
      setIsSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  if (!open) return null;

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) return;

    setFiles((current) => {
      const existing = new Set(current.map((file) => `${file.name}-${file.size}`));
      const next = selected.filter(
        (file) => !existing.has(`${file.name}-${file.size}`),
      );
      return [...current, ...next];
    });
    setError(null);
    setSuccess(null);
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = text.trim();
    if (!trimmed && files.length === 0 && !useCompanyPolicy) {
      setError("Add text, a file, or seed the company policy.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await feedKnowledge({
        text: trimmed,
        files,
        fileName: fileName.trim() || "notes.txt",
        useCompanyPolicy,
      });
      setSuccess(result.message ?? "Knowledge fed successfully.");
      setText("");
      setFileName("notes.txt");
      setFiles([]);
      setUseCompanyPolicy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to feed knowledge");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit =
    !isSubmitting &&
    (text.trim().length > 0 || files.length > 0 || useCompanyPolicy);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close feed modal"
        className="absolute inset-0 bg-[rgba(26,33,28,0.35)] backdrop-blur-[2px]"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-lg rounded-[1.35rem] bg-surface p-5 shadow-[var(--panel-shadow)] ring-1 ring-border sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-accent uppercase">
              Knowledge
            </p>
            <h2
              id={titleId}
              className="mt-1 font-display text-2xl text-foreground"
            >
              Feed information
            </h2>
            <p className="mt-1 text-sm text-muted">
              Upload files or ingest text into the agent knowledge base.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="rounded-xl px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-accent-soft hover:text-foreground disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="feed-text"
              className="text-[0.7rem] font-semibold tracking-[0.08em] text-muted uppercase"
            >
              Information
            </label>
            <textarea
              id="feed-text"
              rows={5}
              value={text}
              disabled={isSubmitting}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste notes, policies, or context for the agent…"
              className="w-full resize-y rounded-2xl bg-panel px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none ring-1 ring-border placeholder:text-muted focus:ring-accent/40 disabled:opacity-60"
            />
            <div className="space-y-1.5">
              <label
                htmlFor="feed-file-name"
                className="text-[0.7rem] font-semibold tracking-[0.08em] text-muted uppercase"
              >
                Text file name
              </label>
              <input
                id="feed-file-name"
                type="text"
                value={fileName}
                disabled={isSubmitting || !text.trim()}
                onChange={(event) => setFileName(event.target.value)}
                placeholder="notes.txt"
                className="w-full rounded-xl bg-panel px-3.5 py-2.5 text-sm text-foreground outline-none ring-1 ring-border placeholder:text-muted focus:ring-accent/40 disabled:opacity-60"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-panel px-3.5 py-3 ring-1 ring-border">
            <input
              type="checkbox"
              checked={useCompanyPolicy}
              disabled={isSubmitting}
              onChange={(event) => setUseCompanyPolicy(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                Seed company policy
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                Ingest the built-in company-policy.txt from the backend.
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <p className="text-[0.7rem] font-semibold tracking-[0.08em] text-muted uppercase">
              Files
            </p>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-panel px-4 py-6 text-center transition-colors hover:bg-accent-soft">
              <span className="rounded-xl bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
                Choose files
              </span>
              <span className="text-xs text-muted">
                Each file is uploaded to /rag/upload
              </span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                disabled={isSubmitting}
                onChange={handleFilesChange}
                className="sr-only"
              />
            </label>

            {files.length > 0 ? (
              <ul className="space-y-1.5">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-panel px-3 py-2 ring-1 ring-border"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {file.name}
                      </p>
                      <p className="text-[0.7rem] text-muted">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => removeFile(index)}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-accent" role="status">
              {success}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl bg-surface px-4 py-2.5 text-sm font-semibold text-foreground ring-1 ring-border transition-colors hover:bg-accent-soft disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? "Feeding…" : "Feed knowledge"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
