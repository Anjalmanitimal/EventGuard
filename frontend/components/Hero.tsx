"use client";

import Link from "next/link";
import { CalendarCheck, ShieldCheck, Ticket } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { buttonClasses } from "@/components/ui/Button";

const features = [
  {
    icon: ShieldCheck,
    title: "Anti-fraud by design",
    description: "Rate limiting, RBAC, and audit logging on every sensitive action.",
  },
  {
    icon: Ticket,
    title: "Single-use QR entry",
    description: "Signed, single-use tickets with real-time invalidation at the gate.",
  },
  {
    icon: CalendarCheck,
    title: "Fair ticket sales",
    description: "Race-condition-safe purchasing for limited-stock events.",
  },
];

export default function Hero() {
  const { user, loading } = useAuth();

  return (
    <div className="text-center">
      {!loading && user ? (
        <>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Welcome back, {user.email.split("@")[0]}
          </h1>
          <p className="mt-3 text-muted">
            You&apos;re logged in as <span className="font-medium text-brand">{user.role}</span>.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Secure, fraud-resistant event ticketing
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            EventGuard protects ticket sales with real-time anti-fraud controls, single-use QR
            entry, and full audit logging — built and penetration tested from the ground up.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/register" className={buttonClasses("primary")}>
              Get started
            </Link>
            <Link href="/login" className={buttonClasses("secondary")}>
              Log in
            </Link>
          </div>
        </>
      )}

      <div className="mx-auto mt-16 grid max-w-3xl gap-4 text-left sm:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <div key={title} className="rounded-2xl border border-border bg-surface p-5">
            <Icon className="size-5 text-brand" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
