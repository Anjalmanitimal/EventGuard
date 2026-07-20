import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import AuthStatus from "@/components/AuthStatus";

export default function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <ShieldCheck className="size-5 text-brand" aria-hidden="true" />
          EventGuard
        </Link>
        <AuthStatus />
      </div>
    </header>
  );
}
