import Hero from "@/components/Hero";
import SystemStatusBadge from "@/components/SystemStatusBadge";

type HealthResponse = {
  status: string;
  db: string;
};

async function getBackendHealth(): Promise<HealthResponse | { error: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${apiUrl}/api/health`, { cache: "no-store" });
    if (!res.ok) {
      return { error: `Backend responded with ${res.status}` };
    }
    return (await res.json()) as HealthResponse;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export default async function Home() {
  const health = await getBackendHealth();
  const ok = "status" in health && health.status === "ok" && health.db === "connected";
  const label = ok ? "All systems connected" : "Backend unreachable";

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <Hero />
      <div className="mt-16">
        <SystemStatusBadge ok={ok} label={label} />
      </div>
    </main>
  );
}
