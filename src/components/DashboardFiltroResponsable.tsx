"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import MultiSelect from "@/shared/ui/components/MultiSelect";

type Props = { responsables: string[] };

export default function DashboardFiltroResponsable({ responsables }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = (searchParams.get("responsables") ?? "")
    .split(",")
    .filter(Boolean);

  function handleChange(values: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (values.length > 0) {
      params.set("responsables", values.join(","));
    } else {
      params.delete("responsables");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="w-56">
      <MultiSelect
        options={responsables.map((r) => ({ value: r, label: r }))}
        value={current}
        onChange={handleChange}
        placeholder="Todos los responsables"
      />
    </div>
  );
}
