export default function SystemStatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted">
      <span className={`size-2 rounded-full ${ok ? "bg-success" : "bg-danger"}`} aria-hidden="true" />
      {label}
    </div>
  );
}
