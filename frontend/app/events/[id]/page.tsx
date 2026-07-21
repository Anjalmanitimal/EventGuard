import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { getEvent } from "@/lib/api";

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
        <div className="mt-3 flex flex-col gap-3">
          {tiers.length === 0 && <p className="text-sm text-muted">No ticket tiers configured yet.</p>}
          {tiers.map((tier) => (
            <div
              key={tier._id}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4"
            >
              <div className="flex items-center gap-2">
                <Ticket className="size-4 text-brand" aria-hidden="true" />
                <span className="font-medium text-foreground">{tier.name}</span>
              </div>
              <div className="text-sm text-muted">
                ${tier.price.toFixed(2)} · {tier.quantityAvailable}/{tier.quantityTotal} available
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
