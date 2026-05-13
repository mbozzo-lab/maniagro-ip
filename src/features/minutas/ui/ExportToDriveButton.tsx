"use client";

import { useState } from "react";
import Button from "@/shared/ui/components/Button";
import { toast } from "sonner";

interface ExportToDriveButtonProps {
  minutaId: number;
  folderId?: string | null;
}

export default function ExportToDriveButton({ minutaId, folderId }: ExportToDriveButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // 1. Generar PDF en el servidor
      const pdfRes = await fetch(`/api/minutas/${minutaId}/export-drive`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ folderId: folderId ?? null }),
      });

      if (!pdfRes.ok) {
        const err = await pdfRes.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Error al generar PDF");
      }

      const { pdfBase64, filename, folderId: targetFolder } = await pdfRes.json() as {
        pdfBase64: string;
        filename:  string;
        folderId:  string | null;
      };

      // 2. Subir a Google Drive
      const uploadRes = await fetch("/api/google-drive/upload-pdf", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pdfBase64, filename, folderId: targetFolder }),
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({})) as { details?: string };
        throw new Error(err.details ?? "Error al subir a Drive");
      }

      const { webViewLink, fileName } = await uploadRes.json() as {
        webViewLink: string;
        fileName:    string;
      };

      toast.success(`${fileName} subido a Google Drive`, {
        duration: 8000,
        action: {
          label:   "Abrir en Drive",
          onClick: () => window.open(webViewLink, "_blank"),
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al exportar";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      loading={loading}
      icon={
        <svg className="w-4 h-4" viewBox="0 0 87.3 78" fill="currentColor">
          <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
          <path d="M43.65 25L29.9 0c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9.1 9.1 0 000 53h27.5z" fill="#00ac47"/>
          <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.5c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#ea4335"/>
          <path d="M43.65 25L57.4 0H29.9z" fill="#00832d"/>
          <path d="M59.8 53H87.3L73.55 28.5H46.05z" fill="#2684fc"/>
          <path d="M43.65 25L30.1 48.5 59.8 53 46.05 25z" fill="#00ac47"/>
        </svg>
      }
    >
      Drive
    </Button>
  );
}
