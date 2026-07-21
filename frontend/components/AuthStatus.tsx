"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { buttonClasses } from "@/components/ui/Button";

export default function AuthStatus() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div className="h-9 w-40 animate-pulse rounded-control bg-border/60" />;
  }

  if (user) {
    const canManageEvents = user.role === "organizer" || user.role === "admin";
    const canScanTickets = user.role === "staff" || user.role === "admin";
    return (
      <div className="flex items-center gap-3">
        {canManageEvents && (
          <Link href="/dashboard/organizer" className="text-sm font-medium text-foreground hover:text-brand">
            My events
          </Link>
        )}
        {canScanTickets && (
          <Link href="/dashboard/staff-scan" className="text-sm font-medium text-foreground hover:text-brand">
            Scan tickets
          </Link>
        )}
        {user.role === "admin" && (
          <Link href="/admin" className="text-sm font-medium text-foreground hover:text-brand">
            Admin
          </Link>
        )}
        <Link href="/orders" className="text-sm font-medium text-foreground hover:text-brand">
          My orders
        </Link>
        <Link href="/mfa-setup" className="text-sm font-medium text-foreground hover:text-brand">
          Security
        </Link>
        <span className="text-sm text-muted">
          {user.email}
          <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
            {user.role}
          </span>
        </span>
        <button onClick={() => logout()} className={buttonClasses("secondary")}>
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/login" className="text-sm font-medium text-foreground hover:text-brand">
        Log in
      </Link>
      <Link href="/register" className={buttonClasses("primary")}>
        Register
      </Link>
    </div>
  );
}
