"use client";

// System status (was the Week 1 home page): /status
// Browser (React) → fetch → Express /api/health → PostgreSQL + MongoDB → JSON → React state → UI
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

function StatusRow({ label, value }) {
  const ok = value === "ok" || value === "connected";
  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border border-line px-4 py-3">
      <span className="font-medium">{label}</span>
      <span className={`text-sm text-right ${ok ? "text-success" : "text-danger"}`}>
        {ok ? "● " : "○ "}
        {value}
      </span>
    </li>
  );
}

export default function StatusPage() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function checkHealth() {
    setLoading(true);
    setError("");
    try {
      setHealth(await api("/api/health"));
    } catch (err) {
      setHealth(null);
      setError(`Can't reach the API. Is the server running? (${err.message})`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <main className="mx-auto max-w-md px-4 py-10 font-sans">
      <h1 className="text-2xl font-bold">System status</h1>
      <p className="mt-1 text-sm opacity-70">Is the frontend connected to the API and both databases?</p>

      <ul className="mt-6 space-y-3">
        {loading && <li className="text-sm opacity-70">Checking…</li>}
        {error && <li className="text-sm text-danger">{error}</li>}
        {health && (
          <>
            <StatusRow label="Express API" value={health.status} />
            <StatusRow label="PostgreSQL" value={health.databases.postgres} />
            <StatusRow label="MongoDB" value={health.databases.mongo} />
          </>
        )}
      </ul>

      <button
        onClick={checkHealth}
        className="mt-6 w-full rounded-lg bg-foreground text-background py-2.5 font-medium hover:opacity-90"
      >
        Check again
      </button>
    </main>
  );
}
