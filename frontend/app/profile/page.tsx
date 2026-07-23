"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User as UserIcon, Lock, ShieldCheck, Download, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import PasswordStrength, { isPasswordValid } from "@/components/ui/PasswordStrength";

export default function ProfilePage() {
  const { user, accessToken, loading, refreshUser, setSessionToken } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(user?.name || "");
  const [nameStatus, setNameStatus] = useState<"idle" | "submitting">("idle");
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "submitting">("idle");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (loading) {
    return <p className="mx-auto max-w-sm px-6 py-16 text-muted">Loading...</p>;
  }

  if (!user || !accessToken) {
    return (
      <main className="mx-auto max-w-sm px-6 py-16 text-center">
        <p className="text-muted">You need to log in to view your profile.</p>
        <Button className="mt-4" onClick={() => router.push("/login")}>
          Log in
        </Button>
      </main>
    );
  }

  async function handleNameSubmit(e: FormEvent) {
    e.preventDefault();
    setNameStatus("submitting");
    setNameError(null);
    setNameMessage(null);
    try {
      await api.updateProfile(accessToken as string, name);
      await refreshUser();
      setNameMessage("Name updated.");
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Could not update name");
    } finally {
      setNameStatus("idle");
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordStatus("submitting");
    setPasswordError(null);
    setPasswordMessage(null);
    try {
      const result = await api.changePassword(accessToken as string, currentPassword, newPassword);
      await setSessionToken(result.accessToken);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage("Password changed. Your other devices have been signed out.");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setPasswordStatus("idle");
    }
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const data = await api.exportMyData(accessToken as string);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "eventguard-my-data.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Could not export your data");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-xl font-semibold text-foreground">Your profile</h1>
      <p className="mt-1 text-sm text-muted">{user.email}</p>

      {user.passwordExpired && (
        <div className="mt-4">
          <Alert variant="info">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="size-4" aria-hidden="true" />
              Your password is over 90 days old. Consider changing it below.
            </span>
          </Alert>
        </div>
      )}

      <Card className="mt-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <UserIcon className="size-4 text-brand" aria-hidden="true" />
          Display name
        </h2>
        <form onSubmit={handleNameSubmit} className="mt-4 flex flex-col gap-4">
          <Input
            name="name"
            label="Name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {nameMessage && <Alert variant="success">{nameMessage}</Alert>}
          {nameError && <Alert variant="error">{nameError}</Alert>}
          <Button type="submit" variant="secondary" isLoading={nameStatus === "submitting"} className="w-full">
            Save name
          </Button>
        </form>
      </Card>

      <Card className="mt-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Lock className="size-4 text-brand" aria-hidden="true" />
          Change password
        </h2>
        <form onSubmit={handlePasswordSubmit} className="mt-4 flex flex-col gap-4">
          <Input
            type="password"
            name="currentPassword"
            label="Current password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            <Input
              type="password"
              name="newPassword"
              label="New password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <PasswordStrength password={newPassword} />
          </div>
          {passwordMessage && <Alert variant="success">{passwordMessage}</Alert>}
          {passwordError && <Alert variant="error">{passwordError}</Alert>}
          <Button
            type="submit"
            variant="secondary"
            isLoading={passwordStatus === "submitting"}
            disabled={Boolean(newPassword) && !isPasswordValid(newPassword)}
            className="w-full"
          >
            Change password
          </Button>
        </form>
      </Card>

      <Card className="mt-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="size-4 text-brand" aria-hidden="true" />
          Two-factor authentication
        </h2>
        <p className="mt-1 text-sm text-muted">
          {user.mfaEnabled ? "Enabled" : "Not enabled"} for this account.
        </p>
        <Link href="/mfa-setup" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
          Manage two-factor authentication →
        </Link>
      </Card>

      <Card className="mt-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Download className="size-4 text-brand" aria-hidden="true" />
          Your data
        </h2>
        <p className="mt-1 text-sm text-muted">
          Download a copy of your profile, orders, and tickets.
        </p>
        {exportError && (
          <div className="mt-3">
            <Alert variant="error">{exportError}</Alert>
          </div>
        )}
        <Button variant="secondary" isLoading={exporting} onClick={handleExport} className="mt-4 w-full">
          Download my data
        </Button>
      </Card>
    </main>
  );
}
