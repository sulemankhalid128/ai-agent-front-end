import type { ApprovalView } from "@/types/chat";

type ApprovalCardProps = {
  approval: ApprovalView;
  disabled?: boolean;
  onApprove: () => void;
  onReject: () => void;
};

export function ApprovalCard({
  approval,
  disabled = false,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const showApprove = approval.actions.includes("approve");
  const showReject = approval.actions.includes("reject");

  return (
    <div className="message-enter rounded-2xl bg-surface px-4 py-4 shadow-[var(--bubble-shadow)] ring-1 ring-border">
      <div className="mb-3">
        <p className="text-[0.7rem] font-semibold tracking-[0.08em] text-accent uppercase">
          Approval needed
        </p>
        <p className="mt-1 font-display text-lg text-foreground">
          {approval.title}
        </p>
        {approval.summary ? (
          <p className="mt-1 text-sm text-muted">{approval.summary}</p>
        ) : null}
      </div>

      <div className="space-y-3 rounded-xl bg-panel px-3.5 py-3 ring-1 ring-border">
        {approval.fields.map((field) => (
          <div key={field.label} className="space-y-1">
            <p className="text-[0.7rem] font-semibold tracking-[0.08em] text-muted uppercase">
              {field.label}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
              {field.value}
            </p>
          </div>
        ))}

        {approval.body ? (
          <div className="space-y-1">
            <p className="text-[0.7rem] font-semibold tracking-[0.08em] text-muted uppercase">
              Body
            </p>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
              {approval.body}
            </p>
          </div>
        ) : null}
      </div>

      {approval.hint ? (
        <p className="mt-3 text-sm text-muted">{approval.hint}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {showApprove ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onApprove}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve
          </button>
        ) : null}
        {showReject ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onReject}
            className="rounded-xl bg-surface px-4 py-2.5 text-sm font-semibold text-foreground ring-1 ring-border transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reject
          </button>
        ) : null}
      </div>
    </div>
  );
}
