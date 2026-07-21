import type { EventStatus } from "@/lib/api";

const STYLES: Record<EventStatus, string> = {
  draft: "bg-muted/15 text-muted",
  published: "bg-success/10 text-success",
  cancelled: "bg-danger-bg text-danger",
};

export default function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STYLES[status]}`}>
      {status}
    </span>
  );
}
