"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ScanLine } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

type ScanResult = { outcome: "accepted" | "rejected"; message: string };

export default function ScanTicketsPage() {
  const { user, accessToken, loading } = useAuth();
  const router = useRouter();

  const [qrToken, setQrToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const canScan = Boolean(user && user.role === "admin");

  if (loading) {
    return <p className="mx-auto max-w-sm px-6 py-16 text-muted">Loading...</p>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-sm px-6 py-16 text-center">
        <p className="text-muted">You need to log in to scan tickets.</p>
        <Button className="mt-4" onClick={() => router.push("/login")}>
          Log in
        </Button>
      </main>
    );
  }

  if (!canScan) {
    return (
      <main className="mx-auto max-w-sm px-6 py-16 text-center">
        <Alert variant="error">Only admins can scan tickets.</Alert>
      </main>
    );
  }

  async function handleScan(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !qrToken) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await api.scanTicket(accessToken, qrToken);
      setResult({ outcome: "accepted", message: `${res.message} - entry granted` });
    } catch (err) {
      setResult({ outcome: "rejected", message: err instanceof Error ? err.message : "Scan failed" });
    } finally {
      setSubmitting(false);
      setQrToken("");
    }
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <Card>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <ScanLine className="size-5 text-brand" aria-hidden="true" />
          Gate scan
        </h1>
        <p className="mt-1 text-sm text-muted">Paste a ticket&apos;s QR token to check it in.</p>
        <form onSubmit={handleScan} className="mt-6 flex flex-col gap-4">
          <Input
            name="qrToken"
            label="QR token"
            required
            placeholder="Paste scanned token"
            autoFocus
            value={qrToken}
            onChange={(e) => setQrToken(e.target.value)}
          />
          <Button type="submit" isLoading={submitting} className="w-full">
            {submitting ? "Checking..." : "Scan"}
          </Button>
        </form>

        {result && (
          <div className="mt-4">
            <Alert variant={result.outcome === "accepted" ? "success" : "error"}>{result.message}</Alert>
          </div>
        )}
      </Card>
    </main>
  );
}
