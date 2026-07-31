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
    <div className="w-full">
      <div className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-[2rem] shadow-xl shadow-black/10">
        <img
          src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&q=80"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--color-brand-deep) 92%, transparent) 0%, color-mix(in srgb, var(--brand) 80%, transparent) 55%, color-mix(in srgb, var(--color-brand-soft) 55%, transparent) 100%)",
          }}
        />
        <div className="relative px-6 py-20 text-center sm:py-28">
          {!loading && user ? (
            <>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Welcome back, {user.email.split("@")[0]}
              </h1>
              <p className="mt-3 text-white/80">
                You&apos;re logged in as <span className="font-semibold text-white">{user.role}</span>.
              </p>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/30 backdrop-blur">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Penetration tested & hardened
              </span>
              <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Secure, fraud-resistant event ticketing
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-white/85">
                Real-time anti-fraud controls, single-use QR entry, and full audit logging —
                built and penetration tested from the ground up.
              </p>
              <div className="mt-8 flex justify-center gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-white px-5 py-2.5 text-sm font-semibold text-brand-deep shadow-lg shadow-black/20 transition-transform hover:scale-[1.03]"
                >
                  Get started
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-control border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
                >
                  Log in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-5 text-left sm:grid-cols-3">
        {features.map(({ icon: Icon, title, description }, i) => (
          <div
            key={title}
            className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-sm shadow-black/[0.03] transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-brand/10"
          >
            <div
              className="absolute -right-6 -top-6 size-24 rounded-full opacity-[0.08] transition-transform duration-300 group-hover:scale-125"
              style={{ background: "var(--brand)" }}
              aria-hidden="true"
            />
            <div
              className="relative flex size-11 items-center justify-center rounded-xl text-white shadow-md"
              style={{
                background: `linear-gradient(135deg, var(--brand) 0%, var(--color-brand-deep) 100%)`,
              }}
            >
              <Icon className="size-5" aria-hidden="true" />
            </div>
            <span className="mt-4 block text-xs font-semibold text-brand">
              0{i + 1}
            </span>
            <h2 className="mt-1 text-sm font-semibold text-foreground">{title}</h2>
            <p className="mt-1.5 text-sm text-muted">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
