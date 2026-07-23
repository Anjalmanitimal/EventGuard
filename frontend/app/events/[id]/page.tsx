import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { getEvent } from "@/lib/api";
import TicketPurchaseForm from "@/components/TicketPurchaseForm";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getEvent(id).catch(() => null);

  if (!data) {
    notFound();
  }

  const { event, tiers } = data;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-foreground">{event.title}</h1>
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <MapPin className="size-4" aria-hidden="true" />
          {event.venue}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-4" aria-hidden="true" />
          {new Date(event.date).toLocaleString()}
        </span>
      </div>
      {event.description && <p className="mt-6 text-foreground">{event.description}</p>}

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">Ticket tiers</h2>
        <div className="mt-3">
          <TicketPurchaseForm eventId={event._id} tiers={tiers} />
        </div>
      </div>
    </main>
  );
}
