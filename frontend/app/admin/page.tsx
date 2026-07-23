"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, CalendarDays, Receipt, Ticket, DollarSign, AlertTriangle, Radio } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";
import type { AdminStats, AuditLogEntry, AdminUser, AssignableRole } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

const ASSIGNABLE_ROLES: AssignableRole[] = ["attendee", "organizer", "admin"];

const STAT_CARDS: { key: keyof AdminStats; label: string; icon: typeof Users; format?: (n: number) => string }[] = [
  { key: "userCount", label: "Users", icon: Users },
  { key: "eventCount", label: "Events", icon: CalendarDays },
  { key: "orderCount", label: "Orders", icon: Receipt },
  { key: "ticketCount", label: "Tickets", icon: Ticket },
  { key: "totalRevenue", label: "Revenue", icon: DollarSign, format: (n) => `$${n.toFixed(2)}` },
];

// Actions that represent a possible attack or failure worth an admin's attention.
const SUSPICIOUS_ACTIONS = new Set([
  "user.login_failed",
  "user.login_locked",
  "user.login_blocked_locked",
  "user.login_mfa_failed",
  "user.refresh_device_mismatch",
  "ticket.scan_rejected_replay",
  "ticket.scan_rejected_unknown",
  "ip_rule.blocked",
]);

const POLL_INTERVAL_MS = 4000;

export default function AdminDashboardPage() {
  const { user, accessToken, loading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newAlertCount, setNewAlertCount] = useState(0);
  const seenIds = useRef<Set<string> | null>(null);

  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const isAdmin = Boolean(user && user.role === "admin");

  useEffect(() => {
    if (!accessToken || !isAdmin) return;
    api
      .getUsers(accessToken)
      .then((res) => setUsers(res.users))
      .catch((err) => setUsersError(err instanceof Error ? err.message : "Failed to load users"));
  }, [accessToken, isAdmin]);

  async function handleRoleChange(userId: string, role: AssignableRole) {
    if (!accessToken) return;
    setSavingUserId(userId);
    setUsersError(null);
    try {
      await api.updateUserRole(accessToken, userId, role);
      setUsers((prev) => prev?.map((u) => (u._id === userId ? { ...u, role } : u)) ?? null);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "Could not change role");
    } finally {
      setSavingUserId(null);
    }
  }

  useEffect(() => {
    if (!accessToken || !isAdmin) return;

    let cancelled = false;

    async function poll() {
      try {
        const [statsRes, logsRes] = await Promise.all([
          api.getAdminStats(accessToken as string),
          api.getAuditLogs(accessToken as string, 100),
        ]);
        if (cancelled) return;

        setStats(statsRes);

        if (seenIds.current) {
          const newSuspicious = logsRes.logs.filter(
            (l) => !seenIds.current!.has(l._id) && SUSPICIOUS_ACTIONS.has(l.action)
          );
          if (newSuspicious.length > 0) {
            setNewAlertCount((c) => c + newSuspicious.length);
          }
        }
        seenIds.current = new Set(logsRes.logs.map((l) => l._id));

        setLogs(logsRes.logs);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load admin data");
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [accessToken, isAdmin]);

  if (loading) {
    return <p className="mx-auto max-w-4xl px-6 py-16 text-muted">Loading...</p>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-muted">You need to log in to view the admin dashboard.</p>
        <Button className="mt-4" onClick={() => router.push("/login")}>
          Log in
        </Button>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <Alert variant="error">Only admins can view this page.</Alert>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Admin dashboard</h1>
          <p className="mt-1 text-sm text-muted">Platform stats and activity log.</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Radio className="size-3.5 animate-pulse text-success" aria-hidden="true" />
          Live - updates every {POLL_INTERVAL_MS / 1000}s
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {newAlertCount > 0 && (
        <div className="mt-4">
          <Alert variant="error">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="size-4" aria-hidden="true" />
                {newAlertCount} new suspicious event{newAlertCount > 1 ? "s" : ""} detected
              </span>
              <button onClick={() => setNewAlertCount(0)} className="text-xs font-medium underline">
                Dismiss
              </button>
            </div>
          </Alert>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {STAT_CARDS.map(({ key, label, icon: Icon, format }) => (
          <Card key={key} className="flex flex-col gap-1 p-4">
            <Icon className="size-4 text-brand" aria-hidden="true" />
            <span className="text-lg font-semibold text-foreground">
              {stats ? (format ? format(stats[key]) : stats[key]) : "..."}
            </span>
            <span className="text-xs text-muted">{label}</span>
          </Card>
        ))}
      </div>

      <h2 className="mt-10 text-sm font-semibold text-foreground">Users</h2>
      {usersError && (
        <div className="mt-3">
          <Alert variant="error">{usersError}</Alert>
        </div>
      )}
      <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Verified</th>
              <th className="px-4 py-3 font-medium">MFA</th>
              <th className="px-4 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {users === null && (
              <tr>
                <td className="px-4 py-3 text-muted" colSpan={4}>
                  Loading...
                </td>
              </tr>
            )}
            {users?.map((u) => {
              const isSelf = u._id === user?.id;
              return (
                <tr key={u._id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">
                    {u.email}
                    {isSelf && <span className="ml-2 text-xs text-muted">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-muted">{u.isEmailVerified ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-muted">{u.mfaEnabled ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={isSelf || savingUserId === u._id}
                      onChange={(e) => handleRoleChange(u._id, e.target.value as AssignableRole)}
                      className="rounded-control border border-border bg-surface px-2 py-1 text-sm text-foreground disabled:opacity-50"
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-sm font-semibold text-foreground">Recent activity</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs === null && (
              <tr>
                <td className="px-4 py-3 text-muted" colSpan={4}>
                  Loading...
                </td>
              </tr>
            )}
            {logs?.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-muted" colSpan={4}>
                  No activity yet.
                </td>
              </tr>
            )}
            {logs?.map((log) => {
              const suspicious = SUSPICIOUS_ACTIONS.has(log.action);
              return (
                <tr
                  key={log._id}
                  className={`border-b border-border last:border-0 ${suspicious ? "bg-danger-bg/40" : ""}`}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    <span className="flex items-center gap-1.5">
                      {suspicious && <AlertTriangle className="size-3.5 text-danger" aria-hidden="true" />}
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{log.userId?.email || "-"}</td>
                  <td className="px-4 py-3 text-muted">{log.ip || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
