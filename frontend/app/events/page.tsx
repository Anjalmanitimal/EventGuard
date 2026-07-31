import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { listEvents } from "@/lib/api";
import { getEventPhotoUrl } from "@/lib/eventPhoto";

export default async function EventsPage() {
  const events = await listEvents().catch(() => []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-xl font-semibold text-foreground">Upcoming events</h1>
      <p className="mt-1 text-sm text-muted">Browse published events open for ticket sales.</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {events.length === 0 && <p className="text-sm text-muted">No events published yet.</p>}
        {events.map((event) => (
          <Link
            key={event._id}
            href={`/events/${event._id}`}
            className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-sm shadow-black/[0.03] transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/10"
          >
            <div className="relative h-36 w-full overflow-hidden">
              <img
                src={getEventPhotoUrl(event._id, 600, 340)}
                alt=""
                aria-hidden="true"
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(0deg, color-mix(in srgb, var(--color-brand-deep) 70%, transparent) 0%, transparent 60%)",
                }}
              />
            </div>
            <div className="p-5">
              <h2 className="font-medium text-foreground">{event.title}</h2>
              <div className="mt-2 flex flex-col gap-1.5 text-sm text-muted">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4 text-brand" aria-hidden="true" />
                  {event.venue}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-brand" aria-hidden="true" />
                  {new Date(event.date).toLocaleString()}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
