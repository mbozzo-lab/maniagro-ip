"use client";

import { useState } from "react";
import { toast } from "sonner";
import Button from "../components/Button";

function SyncIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

export function SyncFromSheetButton() {
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    const toastId = toast.loading("Sincronizando desde Sheet…");
    try {
      const [importData, syncData, actData] = await Promise.all([
        fetch("/api/import-missing").then((r) => r.json()),
        fetch("/api/sync-from-sheet").then((r) => r.json()),
        fetch("/api/sync-actividades").then((r) => r.json()),
      ]);

      const parts: string[] = [];
      if (importData.imported > 0)
        parts.push(`${importData.imported} nuevas`);
      if (syncData.updated > 0)
        parts.push(`${syncData.updated} actualizadas`);
      if ((actData.created ?? 0) + (actData.updated ?? 0) > 0)
        parts.push(`${(actData.created ?? 0) + (actData.updated ?? 0)} actividades`);

      toast.success("Sincronización completada", {
        id: toastId,
        description: parts.length > 0 ? parts.join(", ") : "Todo al día",
      });
    } catch {
      toast.error("Error al sincronizar", {
        id: toastId,
        description: "Intentá nuevamente",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleSync}
      variant="outline"
      size="sm"
      loading={loading}
      icon={<SyncIcon />}
    >
      {loading ? "Sincronizando…" : "Traer desde Sheet"}
    </Button>
  );
}

export function SyncToSheetButton() {
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    const toastId = toast.loading("Subiendo a Sheet…");
    try {
      const data = await fetch("/api/sync-to-sheet").then((r) => r.json());
      const parts: string[] = [];
      if (data.updated > 0) parts.push(`${data.updated} actualizadas`);
      if (data.created > 0) parts.push(`${data.created} nuevas`);

      toast.success("Sheet actualizado", {
        id: toastId,
        description: parts.length > 0 ? parts.join(", ") : "Todo al día",
      });
    } catch {
      toast.error("Error al subir", {
        id: toastId,
        description: "Intentá nuevamente",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleSync}
      variant="secondary"
      size="sm"
      loading={loading}
      icon={<UploadIcon />}
    >
      {loading ? "Subiendo…" : "Subir a Sheet"}
    </Button>
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
