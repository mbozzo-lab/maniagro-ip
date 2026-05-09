"use client";

import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import GlobalSearch from "@/shared/ui/components/GlobalSearch";

export type ShellUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export default function DashboardShell({
  children,
  user,
  profilePicture,
}: {
  children: ReactNode;
  user: ShellUser;
  profilePicture: string | null;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleClose = useCallback(() => setSidebarOpen(false), []);
  const handleMenuClick = useCallback(() => setSidebarOpen(true), []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={handleClose} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar
          user={user}
          profilePicture={profilePicture}
          onMenuClick={handleMenuClick}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          {children}
        </main>
        <GlobalSearch />
      </div>
    </div>
  );
}
