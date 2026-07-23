"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ShieldCheck, MailCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { verifyEmail } from "@/lib/api";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

export default function LoginPage() {
  const { login, completeMfaLogin } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verifyToken, setVerifyToken] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function completeLogin() {
    const result = await login(email, password);
    if (result.mfaRequired) {
      setNeedsVerification(false);
      setMfaToken(result.mfaToken);
      setStatus("idle");
    } else {
      router.push("/");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      await completeLogin();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      if (message === "Email not verified") {
        setNeedsVerification(true);
        setStatus("idle");
      } else {
        setError(message);
        setStatus("error");
      }
    }
  }

  async function handleMfaSubmit(e: FormEvent) {
    e.preventDefault();
    if (!mfaToken) return;
    setStatus("submitting");
    setError(null);
    try {
      await completeMfaLogin(mfaToken, mfaCode);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
      setStatus("error");
    }
  }

  async function handleVerifySubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      await verifyEmail(verifyToken);
      await completeLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid verification token");
      setStatus("error");
    }
  }

  if (mfaToken) {
    return (
      <main className="mx-auto max-w-sm px-6 py-16">
        <Card>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <ShieldCheck className="size-5 text-brand" aria-hidden="true" />
            Two-factor authentication
          </h1>
          <p className="mt-1 text-sm text-muted">Enter the 6-digit code from your authenticator app.</p>
          <form onSubmit={handleMfaSubmit} className="mt-6 flex flex-col gap-4">
            <Input
              name="mfaCode"
              label="Authentication code"
              required
              placeholder="123456"
              inputMode="numeric"
              autoFocus
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
            />
            {error && <Alert variant="error">{error}</Alert>}
            <Button type="submit" isLoading={status === "submitting"} className="w-full">
              {status === "submitting" ? "Verifying..." : "Verify"}
            </Button>
          </form>
        </Card>
      </main>
    );
  }

  if (needsVerification) {
    return (
      <main className="mx-auto max-w-sm px-6 py-16">
        <Card>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <MailCheck className="size-5 text-brand" aria-hidden="true" />
            Verify your email
          </h1>
          <p className="mt-1 text-sm text-muted">
            Your email isn&apos;t verified yet. Enter the token logged to the backend server
            console after you registered, and we&apos;ll log you straight in.
          </p>
          <form onSubmit={handleVerifySubmit} className="mt-6 flex flex-col gap-4">
            <Input
              name="verifyToken"
              label="Verification token"
              required
              placeholder="Paste token here"
              autoFocus
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
            />
            {error && <Alert variant="error">{error}</Alert>}
            <Button type="submit" isLoading={status === "submitting"} className="w-full">
              {status === "submitting" ? "Verifying..." : "Verify and log in"}
            </Button>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <Card>
        <h1 className="text-xl font-semibold text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Log in to manage your events and tickets.</p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            type="email"
            name="email"
            label="Email"
            required
            placeholder="you@example.com"
            icon={<Mail className="size-4" aria-hidden="true" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            name="password"
            label="Password"
            required
            placeholder="Your password"
            icon={<Lock className="size-4" aria-hidden="true" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" isLoading={status === "submitting"} className="mt-2 w-full">
            {status === "submitting" ? "Logging in..." : "Log in"}
          </Button>
        </form>
      </Card>
      <p className="mt-6 text-center text-sm text-muted">
        No account?{" "}
        <Link href="/register" className="font-medium text-brand hover:underline">
          Register
        </Link>
      </p>
    </main>
  );
}
