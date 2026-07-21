"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff, KeyRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import QrCode from "@/components/QrCode";

export default function MfaSetupPage() {
  const { user, accessToken, loading, refreshUser } = useAuth();
  const router = useRouter();

  const [setupData, setSetupData] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (loading) {
    return <p className="mx-auto max-w-sm px-6 py-16 text-muted">Loading...</p>;
  }

  if (!user || !accessToken) {
    return (
      <main className="mx-auto max-w-sm px-6 py-16 text-center">
        <p className="text-muted">You need to log in to manage two-factor authentication.</p>
        <Button className="mt-4" onClick={() => router.push("/login")}>
          Log in
        </Button>
      </main>
    );
  }

  async function handleStartSetup() {
    setError(null);
    try {
      const data = await api.setupMfa(accessToken as string);
      setSetupData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start MFA setup");
    }
  }

  async function handleEnable(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      await api.enableMfa(accessToken as string, code);
      await refreshUser();
      setSetupData(null);
      setCode("");
      setMessage("Two-factor authentication is now enabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setStatus("idle");
    }
  }

  async function handleDisable(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      await api.disableMfa(accessToken as string, password);
      await refreshUser();
      setPassword("");
      setMessage("Two-factor authentication has been disabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable MFA");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <Card>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          {user.mfaEnabled ? (
            <ShieldCheck className="size-5 text-success" aria-hidden="true" />
          ) : (
            <ShieldOff className="size-5 text-muted" aria-hidden="true" />
          )}
          Two-factor authentication
        </h1>
        <p className="mt-1 text-sm text-muted">
          {user.mfaEnabled
            ? "MFA is currently enabled on your account."
            : "Add an extra layer of security using an authenticator app."}
        </p>

        {message && (
          <div className="mt-4">
            <Alert variant="success">{message}</Alert>
          </div>
        )}
        {error && (
          <div className="mt-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {user.mfaEnabled ? (
          <form onSubmit={handleDisable} className="mt-6 flex flex-col gap-4">
            <Input
              type="password"
              name="password"
              label="Confirm your password to disable MFA"
              required
              icon={<KeyRound className="size-4" aria-hidden="true" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" variant="secondary" isLoading={status === "submitting"} className="w-full">
              Disable MFA
            </Button>
          </form>
        ) : setupData ? (
          <div className="mt-6 flex flex-col items-center gap-4">
            <QrCode value={setupData.otpauthUrl} size={180} />
            <p className="text-center text-xs text-muted">
              Scan with your authenticator app, or enter this code manually:
            </p>
            <code className="rounded-control bg-border/30 px-3 py-1.5 text-xs text-foreground">
              {setupData.secret}
            </code>
            <form onSubmit={handleEnable} className="flex w-full flex-col gap-4">
              <Input
                name="code"
                label="Enter the 6-digit code to confirm"
                required
                placeholder="123456"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button type="submit" isLoading={status === "submitting"} className="w-full">
                Enable MFA
              </Button>
            </form>
          </div>
        ) : (
          <Button onClick={handleStartSetup} className="mt-6 w-full">
            Set up MFA
          </Button>
        )}
      </Card>
    </main>
  );
}
