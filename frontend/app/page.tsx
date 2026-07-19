import styles from "./page.module.css";

type HealthResponse = {
  status: string;
  db: string;
};

async function getBackendHealth(): Promise<HealthResponse | { error: string }> {
  const apiUrl = process.env.API_URL || "http://localhost:4000";
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
  const ok = "status" in health && health.status === "ok";

  return (
    <main className={styles.main}>
      <h1>EventGuard</h1>
      <p>Frontend → Backend → MongoDB connectivity check</p>
      <pre className={ok ? styles.ok : styles.error}>
        {JSON.stringify(health, null, 2)}
      </pre>
    </main>
  );
}
