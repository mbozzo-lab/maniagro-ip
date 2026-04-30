import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Role } from "@/generated/prisma/client";

async function cambiarRol(userId: string, nuevoRol: Role) {
  "use server";
  await prisma.user.update({ where: { id: userId }, data: { role: nuevoRol } });
  revalidatePath("/usuarios");
}

export default async function UsuariosPage() {
  const session = await auth();
  if (session?.user.role !== "REFERENTE") redirect("/");

  const usuarios = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Usuarios</h2>
        <p className="text-sm text-gray-500">{usuarios.length} cuentas registradas</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Usuario", "Email", "Rol", "Registrado", "Acción"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 flex items-center gap-2">
                  {u.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.image} alt="" className="w-7 h-7 rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-brand-blue-light flex items-center justify-center text-brand-blue text-xs font-bold">
                      {u.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <span>{u.name ?? "—"}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === "REFERENTE"
                        ? "bg-brand-green-light text-brand-green"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {u.createdAt.toLocaleDateString("es-AR")}
                </td>
                <td className="px-4 py-3">
                  <form
                    action={cambiarRol.bind(
                      null,
                      u.id,
                      u.role === "REFERENTE" ? "COLABORADOR" : "REFERENTE"
                    )}
                  >
                    <button
                      type="submit"
                      className="text-xs text-brand-blue hover:underline disabled:opacity-50"
                      disabled={u.id === session.user.id}
                    >
                      {u.role === "REFERENTE" ? "→ Colaborador" : "→ Referente"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
