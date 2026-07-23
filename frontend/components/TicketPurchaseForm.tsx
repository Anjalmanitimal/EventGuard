"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ticket, CheckCircle2, BellRing, BellOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";
import type { TicketTierRecord, WaitlistEntry } from "@/lib/api";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

export default function TicketPurchaseForm({
  eventId,
  tiers,
}: {
  eventId: string;
  tiers: TicketTierRecord[];
}) {
  const { user, accessToken } = useAuth();
  const router = useRouter();

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [buyingTierId, setBuyingTierId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<api.OrderRecord | null>(null);

  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [waitlistBusyTierId, setWaitlistBusyTierId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    api
      .getMyWaitlist(accessToken)
      .then(setWaitlist)
      .catch(() => {});
  }, [accessToken]);

  if (tiers.length === 0) {
    return <p className="text-sm text-muted">No ticket tiers configured yet.</p>;
  }

  if (confirmedOrder) {
    return (
      <Alert variant="success">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Order {confirmedOrder.orderNumber} confirmed
          </span>
          <Link href="/orders" className="text-sm underline">
            View your orders
          </Link>
        </div>
      </Alert>
    );
  }

  async function handleBuy(tier: TicketTierRecord) {
    if (!user || !accessToken) {
      router.push("/login");
      return;
    }

    setBuyingTierId(tier._id);
    setError(null);
    try {
      const { order } = await api.createOrder(accessToken, {
        eventId,
        tierId: tier._id,
        quantity: quantities[tier._id] || 1,
      });
      setConfirmedOrder(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete purchase");
    } finally {
      setBuyingTierId(null);
    }
  }

  async function handleJoinWaitlist(tierId: string) {
    if (!user || !accessToken) {
      router.push("/login");
      return;
    }
    setWaitlistBusyTierId(tierId);
    setError(null);
    try {
      const entry = await api.joinWaitlist(accessToken, tierId);
      setWaitlist((prev) => [...prev, entry]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the waitlist");
    } finally {
      setWaitlistBusyTierId(null);
    }
  }

  async function handleLeaveWaitlist(entry: WaitlistEntry) {
    if (!accessToken) return;
    setWaitlistBusyTierId(entry.tierId);
    setError(null);
    try {
      await api.leaveWaitlist(accessToken, entry._id);
      setWaitlist((prev) => prev.filter((e) => e._id !== entry._id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not leave the waitlist");
    } finally {
      setWaitlistBusyTierId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {tiers.map((tier) => {
        const soldOut = tier.quantityAvailable === 0;
        const quantity = quantities[tier._id] || 1;
        const waitlistEntry = waitlist.find((e) => e.tierId === tier._id);
        const waitlistBusy = waitlistBusyTierId === tier._id;

        return (
          <div
            key={tier._id}
            className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-center gap-2">
              <Ticket className="size-4 text-brand" aria-hidden="true" />
              <div>
                <span className="font-medium text-foreground">{tier.name}</span>
                <div className="text-sm text-muted">
                  ${tier.price.toFixed(2)} ·{" "}
                  {soldOut ? "Sold out" : `${tier.quantityAvailable} available`}
                </div>
              </div>
            </div>
            {!soldOut && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={tier.quantityAvailable}
                  value={quantity}
                  onChange={(e) =>
                    setQuantities((q) => ({ ...q, [tier._id]: Number(e.target.value) }))
                  }
                  aria-label={`Quantity for ${tier.name}`}
                  className="w-16 rounded-control border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
                />
                <Button
                  onClick={() => handleBuy(tier)}
                  isLoading={buyingTierId === tier._id}
                >
                  Buy
                </Button>
              </div>
            )}
            {soldOut && waitlistEntry && (
              <Button
                variant="secondary"
                isLoading={waitlistBusy}
                onClick={() => handleLeaveWaitlist(waitlistEntry)}
              >
                <BellOff className="size-4" aria-hidden="true" />
                On waitlist - leave
              </Button>
            )}
            {soldOut && !waitlistEntry && (
              <Button
                variant="secondary"
                isLoading={waitlistBusy}
                onClick={() => handleJoinWaitlist(tier._id)}
              >
                <BellRing className="size-4" aria-hidden="true" />
                Join waitlist
              </Button>
            )}
          </div>
        );
      })}
      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}
