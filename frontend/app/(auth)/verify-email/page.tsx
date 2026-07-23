import { Suspense } from "react";
import VerifyEmailForm from "@/components/VerifyEmailForm";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-sm px-6 py-16 text-muted">Loading...</main>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
