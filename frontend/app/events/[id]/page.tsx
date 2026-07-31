import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { getEvent } from "@/lib/api";
import { getEventPhotoUrl } from "@/lib/eventPhoto";
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
      <div className="relative h-56 w-full overflow-hidden rounded-[1.5rem] shadow-lg shadow-black/10 sm:h-72">
        <img
          src={getEventPhotoUrl(event._id, 1200, 600)}
          alt=""
          aria-hidden="true"
          className="size-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(0deg, color-mix(in srgb, var(--color-brand-deep) 85%, transparent) 0%, color-mix(in srgb, var(--color-brand-deep) 10%, transparent) 55%, transparent 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <h1 className="text-2xl font-semibold text-white">{event.title}</h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-white/85">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden="true" />
              {event.venue}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden="true" />
              {new Date(event.date).toLocaleString()}
            </span>
          </div>
        </div>
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
