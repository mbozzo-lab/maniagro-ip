"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import Image from "next/image";

interface AvatarUploadProps {
  currentAvatar?: string | null;
  userName: string;
  onUploadComplete?: (avatarUrl: string) => void;
}

export default function AvatarUpload({ currentAvatar, userName, onUploadComplete }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentAvatar ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function getInitials() {
    return userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen es muy grande (máx 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetch("/api/upload-avatar", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json() as { avatarUrl: string };
      toast.success("Foto actualizada");
      onUploadComplete?.(data.avatarUrl);
    } catch {
      toast.error("Error al subir la foto");
      setPreview(currentAvatar ?? null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        {preview ? (
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary-100">
            <Image src={preview} alt={userName} width={96} height={96} className="object-cover w-full h-full" />
          </div>
        ) : (
          <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-2xl ring-4 ring-primary-100">
            {getInitials()}
          </div>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 bg-slate-900/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
        >
          {uploading ? (
            <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      <p className="text-xs text-slate-500 text-center">
        Click para cambiar foto<br />
        <span className="text-slate-400">(Máx 5MB)</span>
      </p>
    </div>
  );
}
