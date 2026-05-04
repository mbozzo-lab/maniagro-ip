"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Props = { responsables: string[] };

export default function DashboardFiltroResponsable({ responsables }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("responsable") ?? "";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("responsable", value);
    } else {
      params.delete("responsable");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green bg-white"
    >
      <option value="">Todos los responsables</option>
      {responsables.map((r) => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  );
}
