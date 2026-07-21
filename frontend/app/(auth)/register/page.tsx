"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail, Lock, MailCheck, User, Megaphone } from "lucide-react";
import { register, type SignupRole } from "@/lib/api";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

const ROLES: { value: SignupRole; label: string; description: string; icon: typeof User }[] = [
  { value: "attendee", label: "Attendee", description: "Buy tickets to events", icon: User },
  { value: "organizer", label: "Organizer", description: "Create and manage events", icon: Megaphone },
];

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SignupRole>("attendee");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      await register(email, password, role);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <main className="mx-auto flex max-w-sm flex-col items-center px-6 py-20 text-center">
        <MailCheck className="size-10 text-brand" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold text-foreground">Check your verification token</h1>
        <p className="mt-2 text-sm text-muted">
          Email sending isn&apos;t wired up yet — the verification token was logged to the
          backend server console.
        </p>
        <Link href="/verify-email" className="mt-6 text-sm font-medium text-brand hover:underline">
          Enter verification token →
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <Card>
        <h1 className="text-xl font-semibold text-foreground">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Register to start buying or organizing events.</p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">I want to</span>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(({ value, label, description, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  aria-pressed={role === value}
                  className={`flex flex-col items-start gap-1 rounded-control border px-3 py-3 text-left transition-colors ${
                    role === value
                      ? "border-brand bg-brand/5"
                      : "border-border hover:bg-border/20"
                  }`}
                >
                  <Icon
                    className={`size-4 ${role === value ? "text-brand" : "text-muted"}`}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <span className="text-xs text-muted">{description}</span>
                </button>
              ))}
            </div>
          </div>
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
            minLength={8}
            placeholder="Min 8 characters"
            icon={<Lock className="size-4" aria-hidden="true" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" isLoading={status === "submitting"} className="mt-2 w-full">
            {status === "submitting" ? "Creating account..." : "Register"}
          </Button>
        </form>
      </Card>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
