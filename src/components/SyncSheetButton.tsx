"use client";

import { useState } from "react";

export default function SyncSheetButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [result, setResult] = useState<{ updated: number; skipped: number } | null>(null);

  async function handleSync() {
    setStatus("loading");
    setResult(null);
    try {
      const res = await fetch("/api/sync-from-sheet", {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setResult({ updated: data.updated, skipped: data.skipped });
      setStatus("ok");
    } catch {
      setStatus("error");
    } finally {
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={status === "loading"}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm"
      >
        {status === "loading" ? (
          <>
            <svg className="animate-spin h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Sincronizando...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sincronizar desde Sheet
          </>
        )}
      </button>

      {status === "ok" && result && (
        <span className="text-xs text-green-600 font-medium">
          ✓ {result.updated} actualizadas{result.skipped > 0 ? `, ${result.skipped} omitidas` : ""}
        </span>
      )}
      {status === "error" && (
        <span className="text-xs text-red-500 font-medium">
          ✗ Error al sincronizar
        </span>
      )}
    </div>
  );
}
