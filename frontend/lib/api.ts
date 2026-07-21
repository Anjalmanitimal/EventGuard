const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type ApiErrorBody = { error?: string };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((body as ApiErrorBody).error || `Request failed with status ${res.status}`);
  }

  return body as T;
}

export type User = {
  id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
};

export type SignupRole = "attendee" | "organizer";

export function register(email: string, password: string, role: SignupRole) {
  return request<{ id: string; email: string; role: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
  });
}

export function verifyEmail(token: string) {
  return request<{ message: string }>("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function login(email: string, password: string) {
  return request<{ accessToken: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function refresh() {
  return request<{ accessToken: string }>("/api/auth/refresh", { method: "POST" });
}

export function logout() {
  return request<void>("/api/auth/logout", { method: "POST" });
}

export function me(accessToken: string) {
  return request<User>("/api/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type EventStatus = "draft" | "published" | "cancelled";

export type EventRecord = {
  _id: string;
  organizerId: string;
  title: string;
  description: string;
  venue: string;
  date: string;
  status: EventStatus;
};

export type TicketTierRecord = {
  _id: string;
  eventId: string;
  name: string;
  price: number;
  quantityTotal: number;
  quantityAvailable: number;
};

export type NewEventInput = {
  title: string;
  description?: string;
  venue: string;
  date: string;
  tier?: { name: string; price: number; quantityTotal: number };
};

function authHeader(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export function listEvents() {
  return request<EventRecord[]>("/api/events", { cache: "no-store" });
}

export function listMyEvents(accessToken: string) {
  return request<EventRecord[]>("/api/events/mine", {
    headers: authHeader(accessToken),
    cache: "no-store",
  });
}

export function getEvent(id: string, accessToken?: string) {
  return request<{ event: EventRecord; tiers: TicketTierRecord[] }>(`/api/events/${id}`, {
    headers: accessToken ? authHeader(accessToken) : undefined,
    cache: "no-store",
  });
}

export function createEvent(accessToken: string, input: NewEventInput) {
  return request<{ event: EventRecord; tier: TicketTierRecord | null }>("/api/events", {
    method: "POST",
    headers: authHeader(accessToken),
    body: JSON.stringify(input),
  });
}

export function updateEvent(accessToken: string, id: string, patch: Partial<NewEventInput> & { status?: EventStatus }) {
  return request<EventRecord>(`/api/events/${id}`, {
    method: "PATCH",
    headers: authHeader(accessToken),
    body: JSON.stringify(patch),
  });
}

export function deleteEvent(accessToken: string, id: string) {
  return request<void>(`/api/events/${id}`, {
    method: "DELETE",
    headers: authHeader(accessToken),
  });
}
