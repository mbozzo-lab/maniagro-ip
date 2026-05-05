"use client";

import { useState } from "react";

function SyncIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function Spinner({ className = "text-gray-500" }: { className?: string }) {
  return (
    <svg className={`animate-spin h-4 w-4 ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export function SyncFromSheetButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [result, setResult] = useState("");

  async function handleSync() {
    setStatus("loading");
    setResult("");
    try {
      const importData = await fetch("/api/import-missing").then((r) => r.json());
      const syncData   = await fetch("/api/sync-from-sheet").then((r) => r.json());
      const actData    = await fetch("/api/sync-actividades").then((r) => r.json());

      const parts: string[] = [];
      if (importData.imported > 0)                                    parts.push(`${importData.imported} nuevas`);
      if (syncData.updated > 0)                                       parts.push(`${syncData.updated} actualizadas`);
      if ((actData.created ?? 0) + (actData.updated ?? 0) > 0)       parts.push(`${(actData.created ?? 0) + (actData.updated ?? 0)} actividades`);

      setResult(parts.length > 0 ? parts.join(", ") : "Todo al día");
      setStatus("ok");
    } catch {
      setStatus("error");
    } finally {
      setTimeout(() => setStatus("idle"), 5000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={status === "loading"}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm"
      >
        {status === "loading" ? <><Spinner /> Sincronizando...</> : <><SyncIcon /> Traer desde Sheet</>}
      </button>
      {status === "ok"    && <span className="text-xs text-green-600 font-medium">✓ {result}</span>}
      {status === "error" && <span className="text-xs text-red-500 font-medium">✗ Error</span>}
    </div>
  );
}

export function SyncToSheetButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [result, setResult] = useState("");

  async function handleSync() {
    setStatus("loading");
    setResult("");
    try {
      const data = await fetch("/api/sync-to-sheet").then((r) => r.json());
      const parts: string[] = [];
      if (data.updated > 0) parts.push(`${data.updated} actualizadas`);
      if (data.created > 0) parts.push(`${data.created} nuevas`);
      setResult(parts.length > 0 ? parts.join(", ") : "Todo al día");
      setStatus("ok");
    } catch {
      setStatus("error");
    } finally {
      setTimeout(() => setStatus("idle"), 5000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={status === "loading"}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
      >
        {status === "loading" ? <><Spinner className="text-white" /> Subiendo...</> : <><UploadIcon /> Subir a Sheet</>}
      </button>
      {status === "ok"    && <span className="text-xs text-green-600 font-medium">✓ {result}</span>}
      {status === "error" && <span className="text-xs text-red-500 font-medium">✗ Error</span>}
    </div>
  );
}

export default function SyncButtons() {
  return (
    <div className="flex items-center gap-3">
      <SyncFromSheetButton />
      <SyncToSheetButton />
    </div>
  );
}
