"use client";

import { useState } from "react";
import Image from "next/image";
import AvatarUpload from "@/shared/ui/components/AvatarUpload";

interface Props {
  name: string;
  email: string;
  profilePicture: string | null;
}

export default function TopbarProfileButton({ name, email, profilePicture }: Props) {
  const [open, setOpen]         = useState(false);
  const [avatar, setAvatar]     = useState<string | null>(profilePicture);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative group focus:outline-none"
        title="Ver perfil"
      >
        {avatar ? (
          <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-primary-100 group-hover:ring-primary-300 transition-all">
            <Image src={avatar} alt={name} width={32} height={32} className="object-cover w-full h-full" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold ring-2 ring-primary-200 group-hover:ring-primary-400 transition-all">
            {initials}
          </div>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-80 mx-4 p-6">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-lg font-semibold text-slate-900 mb-5">Mi Perfil</h2>

            <AvatarUpload
              currentAvatar={avatar}
              userName={name}
              onUploadComplete={(url) => setAvatar(url)}
            />

            <div className="mt-5 pt-4 border-t border-slate-200 space-y-3">
              <div>
                <p className="text-xs text-slate-500">Nombre</p>
                <p className="text-sm font-medium text-slate-900">{name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm font-medium text-slate-900">{email}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
