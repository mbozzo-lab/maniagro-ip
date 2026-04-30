"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/generated/prisma/client";

const navItems = [
  { href: "/", label: "Dashboard", icon: "⊞" },
  { href: "/solicitudes", label: "Solicitudes", icon: "📋" },
];

const adminItems = [
  { href: "/usuarios", label: "Usuarios", icon: "👥" },
];

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      pathname === href
        ? "bg-brand-green text-white"
        : "text-gray-600 hover:bg-brand-green-light hover:text-brand-green"
    }`;

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="px-5 py-5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">M</span>
          </div>
          <div>
            <p className="text-xs font-bold text-brand-green leading-tight">Maniagro</p>
            <p className="text-xs text-gray-400 leading-tight">Ing. de Procesos</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {role === "REFERENTE" && (
          <>
            <div className="my-2 border-t border-gray-100" />
            {adminItems.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
