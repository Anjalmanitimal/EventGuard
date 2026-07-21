"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Trash2, Megaphone, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";
import type { EventRecord } from "@/lib/api";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import EventStatusBadge from "@/components/EventStatusBadge";

export default function OrganizerDashboardPage() {
  const { user, accessToken, loading } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage = Boolean(user && (user.role === "organizer" || user.role === "admin"));

  useEffect(() => {
    if (!accessToken || !canManage) return;
    api
      .listMyEvents(accessToken)
      .then(setEvents)
      .catch((err) => setActionError(err instanceof Error ? err.message : "Failed to load events"));
  }, [accessToken, canManage]);

  if (loading) {
    return <p className="mx-auto max-w-3xl px-6 py-16 text-muted">Loading...</p>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-muted">You need to log in to manage events.</p>
        <Button className="mt-4" onClick={() => router.push("/login")}>
          Log in
        </Button>
      </main>
    );
  }

  if (!canManage) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <Alert variant="error">Only organizers can manage events.</Alert>
      </main>
    );
  }

  async function refresh() {
    if (!accessToken) return;
    const list = await api.listMyEvents(accessToken);
    setEvents(list);
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken) return;
    setSubmitting(true);
    setFormError(null);

    // Capture the form element now - e.currentTarget is nulled out by React
    // once the synchronous part of the handler finishes, so it can't be
    // read after an `await`.
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const title = String(form.get("title") || "");
    const description = String(form.get("description") || "");
    const venue = String(form.get("venue") || "");
    const date = String(form.get("date") || "");
    const tierName = String(form.get("tierName") || "");
    const tierPrice = form.get("tierPrice");
    const tierQuantity = form.get("tierQuantity");

    try {
      await api.createEvent(accessToken, {
        title,
        description,
        venue,
        date: date ? new Date(date).toISOString() : "",
        tier:
          tierName && tierPrice !== null && tierQuantity !== null
            ? { name: tierName, price: Number(tierPrice), quantityTotal: Number(tierQuantity) }
            : undefined,
      });
      setShowForm(false);
      formEl.reset();
      await refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create event");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublish(id: string) {
    if (!accessToken) return;
    setActionError(null);
    try {
      await api.updateEvent(accessToken, id, { status: "published" });
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not publish event");
    }
  }

  async function handleCancel(id: string) {
    if (!accessToken) return;
    setActionError(null);
    try {
      await api.updateEvent(accessToken, id, { status: "cancelled" });
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not cancel event");
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken) return;
    if (!confirm("Delete this event permanently?")) return;
    setActionError(null);
    try {
      await api.deleteEvent(accessToken, id);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete event");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Your events</h1>
          <p className="mt-1 text-sm text-muted">Create and manage the events you organize.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <PlusCircle className="size-4" aria-hidden="true" />
          New event
        </Button>
      </div>

      {showForm && (
        <Card className="mt-6">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Input name="title" label="Title" required placeholder="Campus Concert" />
            <Textarea name="description" label="Description" rows={3} placeholder="What's this event about?" />
            <Input name="venue" label="Venue" required placeholder="Main Hall" />
            <Input name="date" label="Date & time" type="datetime-local" required />
            <div className="grid grid-cols-3 gap-3">
              <Input name="tierName" label="Ticket tier name" placeholder="General" defaultValue="General" />
              <Input name="tierPrice" label="Price" type="number" min={0} step="0.01" defaultValue={0} />
              <Input name="tierQuantity" label="Quantity" type="number" min={0} step={1} defaultValue={100} />
            </div>
            {formError && <Alert variant="error">{formError}</Alert>}
            <Button type="submit" isLoading={submitting} className="w-full">
              {submitting ? "Creating..." : "Create event"}
            </Button>
          </form>
        </Card>
      )}

      {actionError && (
        <div className="mt-6">
          <Alert variant="error">{actionError}</Alert>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {events === null && <p className="text-sm text-muted">Loading your events...</p>}
        {events !== null && events.length === 0 && (
          <p className="text-sm text-muted">You haven&apos;t created any events yet.</p>
        )}
        {events?.map((event) => (
          <div
            key={event._id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-5"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-medium text-foreground">{event.title}</h2>
                <EventStatusBadge status={event.status} />
              </div>
              <p className="mt-1 text-sm text-muted">
                {event.venue} · {new Date(event.date).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {event.status === "draft" && (
                <Button variant="secondary" onClick={() => handlePublish(event._id)}>
                  <Megaphone className="size-4" aria-hidden="true" />
                  Publish
                </Button>
              )}
              {event.status === "published" && (
                <Button variant="secondary" onClick={() => handleCancel(event._id)}>
                  <XCircle className="size-4" aria-hidden="true" />
                  Cancel
                </Button>
              )}
              <Button variant="ghost" onClick={() => handleDelete(event._id)} aria-label="Delete event">
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
