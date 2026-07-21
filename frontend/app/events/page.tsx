import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { listEvents } from "@/lib/api";

export default async function EventsPage() {
  const events = await listEvents().catch(() => []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-xl font-semibold text-foreground">Upcoming events</h1>
      <p className="mt-1 text-sm text-muted">Browse published events open for ticket sales.</p>

      <div className="mt-6 flex flex-col gap-3">
        {events.length === 0 && <p className="text-sm text-muted">No events published yet.</p>}
        {events.map((event) => (
          <Link
            key={event._id}
            href={`/events/${event._id}`}
            className="block rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-brand/40"
          >
            <h2 className="font-medium text-foreground">{event.title}</h2>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden="true" />
                {event.venue}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden="true" />
                {new Date(event.date).toLocaleString()}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
