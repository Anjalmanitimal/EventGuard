const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type ApiErrorBody = { error?: string; remainingAttempts?: number };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;

  if (!res.ok) {
    const base = body.error || `Request failed with status ${res.status}`;
    const message =
      typeof body.remainingAttempts === "number"
        ? `${base} (${body.remainingAttempts} attempt${body.remainingAttempts === 1 ? "" : "s"} remaining)`
        : base;
    throw new Error(message);
  }

  return body as T;
}

export type User = {
  id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
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

export type LoginResult =
  | { mfaRequired: false; accessToken: string }
  | { mfaRequired: true; mfaToken: string };

export function login(email: string, password: string) {
  return request<LoginResult>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function verifyMfaLogin(mfaToken: string, code: string) {
  return request<{ accessToken: string }>("/api/auth/mfa/verify", {
    method: "POST",
    body: JSON.stringify({ mfaToken, code }),
  });
}

export function setupMfa(accessToken: string) {
  return request<{ secret: string; otpauthUrl: string }>("/api/auth/mfa/setup", {
    method: "POST",
    headers: authHeader(accessToken),
  });
}

export function enableMfa(accessToken: string, code: string) {
  return request<{ message: string }>("/api/auth/mfa/enable", {
    method: "POST",
    headers: authHeader(accessToken),
    body: JSON.stringify({ code }),
  });
}

export function disableMfa(accessToken: string, password: string) {
  return request<{ message: string }>("/api/auth/mfa/disable", {
    method: "POST",
    headers: authHeader(accessToken),
    body: JSON.stringify({ password }),
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

export type OrderStatus = "pending" | "paid" | "refunded" | "cancelled";

export type OrderRecord = {
  _id: string;
  orderNumber: string;
  userId: string;
  eventId: string;
  tierId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
};

export type TicketStatus = "valid" | "used" | "revoked";

export type TicketRecord = {
  _id: string;
  orderId: string;
  eventId: string;
  userId: string;
  qrToken: string;
  status: TicketStatus;
  scannedAt: string | null;
};

export function createOrder(accessToken: string, input: { eventId: string; tierId: string; quantity: number }) {
  return request<{ order: OrderRecord; tickets: TicketRecord[] }>("/api/orders", {
    method: "POST",
    headers: authHeader(accessToken),
    body: JSON.stringify(input),
  });
}

export function listMyOrders(accessToken: string) {
  return request<OrderRecord[]>("/api/orders/mine", {
    headers: authHeader(accessToken),
    cache: "no-store",
  });
}

export function cancelOrder(accessToken: string, id: string) {
  return request<OrderRecord>(`/api/orders/${id}/cancel`, {
    method: "POST",
    headers: authHeader(accessToken),
  });
}

export function listMyTickets(accessToken: string) {
  return request<TicketRecord[]>("/api/tickets/mine", {
    headers: authHeader(accessToken),
    cache: "no-store",
  });
}

export function scanTicket(accessToken: string, qrToken: string) {
  return request<{ message: string; ticket: TicketRecord }>("/api/tickets/scan", {
    method: "POST",
    headers: authHeader(accessToken),
    body: JSON.stringify({ qrToken }),
  });
}

export type AdminStats = {
  userCount: number;
  eventCount: number;
  orderCount: number;
  ticketCount: number;
  totalRevenue: number;
};

export type AuditLogEntry = {
  _id: string;
  userId: { _id: string; email: string; role: string } | null;
  action: string;
  targetId: string | null;
  ip: string | null;
  createdAt: string;
};

export function getAdminStats(accessToken: string) {
  return request<AdminStats>("/api/admin/stats", {
    headers: authHeader(accessToken),
    cache: "no-store",
  });
}

export function getAuditLogs(accessToken: string, limit = 50) {
  return request<{ logs: AuditLogEntry[]; total: number }>(`/api/admin/audit-logs?limit=${limit}`, {
    headers: authHeader(accessToken),
    cache: "no-store",
  });
}
