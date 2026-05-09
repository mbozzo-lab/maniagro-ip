"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type ActivityLog = {
  id: number;
  userName: string;
  action: string;
  entityName: string;
  changes: { field: string; oldValue: unknown; newValue: unknown }[] | null;
  timestamp: string;
};

function ActionIcon({ action }: { action: string }) {
  if (action === "created") {
    return (
      <svg className="w-4 h-4 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    );
  }
  if (action === "status_changed") {
    return (
      <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    );
  }
  if (action === "deleted") {
    return (
      <svg className="w-4 h-4 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

const actionLabel: Record<string, string> = {
  created:        "creó",
  updated:        "actualizó",
  deleted:        "eliminó",
  status_changed: "cambió el estado de",
};

export default function ActivityTimeline({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: number;
}) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/activity-log?entityType=${entityType}&entityId=${entityId}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [entityType, entityId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-slate-100 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Historial de cambios</h3>
        <p className="text-xs text-slate-400 mt-0.5">{logs.length} cambio{logs.length !== 1 ? "s" : ""} registrado{logs.length !== 1 ? "s" : ""}</p>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Sin actividad registrada</p>
      ) : (
        <ol className="relative border-l border-slate-200 ml-3 space-y-4">
          {logs.map((log) => (
            <li key={log.id} className="ml-4">
              <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center">
                <span className="sr-only">{log.action}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <ActionIcon action={log.action} />
                  <p className="text-xs text-slate-700">
                    <span className="font-semibold">{log.userName}</span>{" "}
                    {actionLabel[log.action] ?? "modificó"}{" "}
                    <span className="font-medium">{log.entityName}</span>
                  </p>
                </div>
                {log.changes && log.changes.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {log.changes.map((c, i) => (
                      <p key={i} className="text-xs text-slate-500">
                        <span className="font-medium text-slate-600">{c.field}:</span>{" "}
                        <span className="line-through text-danger-500">{String(c.oldValue ?? "—")}</span>
                        {" → "}
                        <span className="text-success-600">{String(c.newValue ?? "—")}</span>
                      </p>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-1.5">
                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: es })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
