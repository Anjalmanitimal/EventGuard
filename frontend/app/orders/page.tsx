"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Receipt, ChevronDown, ChevronUp, Ban } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";
import type { OrderRecord, OrderStatus, TicketRecord } from "@/lib/api";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import QrCode from "@/components/QrCode";

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-muted/15 text-muted",
  paid: "bg-success/10 text-success",
  refunded: "bg-brand/10 text-brand",
  cancelled: "bg-danger-bg text-danger",
};

const TICKET_STATUS_LABEL: Record<TicketRecord["status"], string> = {
  valid: "Not scanned yet",
  used: "Scanned - used",
  revoked: "Revoked",
};

export default function OrdersPage() {
  const { user, accessToken, loading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<OrderRecord[] | null>(null);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([api.listMyOrders(accessToken), api.listMyTickets(accessToken)])
      .then(([orderList, ticketList]) => {
        setOrders(orderList);
        setTickets(ticketList);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load orders"));
  }, [accessToken]);

  if (loading) {
    return <p className="mx-auto max-w-2xl px-6 py-16 text-muted">Loading...</p>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-muted">You need to log in to see your orders.</p>
        <Button className="mt-4" onClick={() => router.push("/login")}>
          Log in
        </Button>
      </main>
    );
  }

  async function handleCancel(id: string) {
    if (!accessToken) return;
    setCancellingId(id);
    setError(null);
    try {
      const updated = await api.cancelOrder(accessToken, id);
      setOrders((prev) => prev?.map((o) => (o._id === id ? updated : o)) ?? null);
      const refreshedTickets = await api.listMyTickets(accessToken);
      setTickets(refreshedTickets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel order");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-xl font-semibold text-foreground">Your orders</h1>
      <p className="mt-1 text-sm text-muted">Tickets you&apos;ve purchased.</p>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {orders === null && <p className="text-sm text-muted">Loading your orders...</p>}
        {orders !== null && orders.length === 0 && (
          <p className="text-sm text-muted">
            No orders yet.{" "}
            <Link href="/events" className="text-brand hover:underline">
              Browse events
            </Link>
            .
          </p>
        )}
        {orders?.map((order) => {
          const orderTickets = tickets.filter((t) => t.orderId === order._id);
          const isExpanded = expandedOrderId === order._id;

          return (
            <div key={order._id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Receipt className="size-4 text-brand" aria-hidden="true" />
                    <span className="font-medium text-foreground">{order.orderNumber}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ORDER_STATUS_STYLES[order.status]}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {order.quantity} ticket{order.quantity > 1 ? "s" : ""} · ${order.totalPrice.toFixed(2)} ·{" "}
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {orderTickets.length > 0 && (
                    <Button
                      variant="ghost"
                      onClick={() => setExpandedOrderId(isExpanded ? null : order._id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-4" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="size-4" aria-hidden="true" />
                      )}
                      Tickets
                    </Button>
                  )}
                  {(order.status === "paid" || order.status === "pending") && (
                    <Button
                      variant="secondary"
                      isLoading={cancellingId === order._id}
                      onClick={() => handleCancel(order._id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-3">
                  {orderTickets.map((ticket, i) => (
                    <div key={ticket._id} className="flex flex-col items-center gap-2 text-center">
                      {ticket.status === "valid" ? (
                        <QrCode value={ticket.qrToken} size={120} />
                      ) : (
                        <div className="flex size-[120px] flex-col items-center justify-center gap-1 rounded-control bg-border/30 text-muted">
                          <Ban className="size-5" aria-hidden="true" />
                          <span className="text-xs">Not scannable</span>
                        </div>
                      )}
                      <span className="text-xs text-muted">
                        Ticket {i + 1} · {TICKET_STATUS_LABEL[ticket.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
