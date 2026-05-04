import { auth, signOut } from "@/lib/auth";
import SyncSheetButton from "@/components/SyncSheetButton";

export default async function Topbar({ title }: { title: string }) {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-sm font-semibold text-gray-800">{title}</h1>

      <div className="flex items-center gap-3">
        <SyncSheetButton />

        <div className="w-px h-5 bg-gray-200" />

        {user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name ?? ""}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-brand-blue-light flex items-center justify-center text-brand-blue text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}

        <span className="text-xs text-gray-600 hidden sm:block">{user?.name}</span>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
