"use client";

import SyncButtons from "@/shared/ui/sync/SyncButtons";
import TopbarProfileButton from "@/components/TopbarProfileButton";
import { signOutAction } from "@/app/(dashboard)/sign-out-action";

interface TopbarProps {
  user: { id: string; name: string; email: string; image: string | null };
  profilePicture: string | null;
  onMenuClick: () => void;
}

export default function Topbar({ user, profilePicture, onMenuClick }: TopbarProps) {
  return (
    <header className="h-14 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Abrir menú"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-slate-800 hidden sm:block">Maniagro – Ingeniería de Procesos</h1>
      </div>

      <div className="flex items-center gap-3">
        <SyncButtons />

        <div className="w-px h-5 bg-slate-200" />

        <TopbarProfileButton
          name={user.name}
          email={user.email}
          profilePicture={profilePicture}
        />

        <span className="text-xs text-slate-600 hidden sm:block">{user.name}</span>

        <form action={signOutAction}>
          <button
            type="submit"
            title="Cerrar sesión"
            className="p-1.5 text-slate-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </form>
      </div>
    </header>
  );
}
