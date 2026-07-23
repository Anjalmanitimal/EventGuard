"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { verifyEmail } from "@/lib/api";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

export default function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState(() => searchParams.get("token") || "");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      await verifyEmail(token);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <main className="mx-auto flex max-w-sm flex-col items-center px-6 py-20 text-center">
        <CheckCircle2 className="size-10 text-success" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold text-foreground">Email verified</h1>
        <Link href="/login" className="mt-6 text-sm font-medium text-brand hover:underline">
          Log in →
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <Card>
        <h1 className="text-xl font-semibold text-foreground">Verify your email</h1>
        <p className="mt-1 text-sm text-muted">
          We sent a 6-digit code to your inbox. Click the link in the email, or enter the
          code here.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            name="token"
            label="Verification code"
            required
            placeholder="123456"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            icon={<KeyRound className="size-4" aria-hidden="true" />}
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" isLoading={status === "submitting"} className="mt-2 w-full">
            {status === "submitting" ? "Verifying..." : "Verify"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
