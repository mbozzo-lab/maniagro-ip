import { auth, signOut } from "@/lib/auth";
import SyncButtons from "@/shared/ui/sync/SyncButtons";

export default async function Topbar({ title }: { title: string }) {
  const session = await auth();
  const user = session?.user;
  const initials = user?.name?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="h-14 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40 shadow-sm">
      <h1 className="text-sm font-semibold text-slate-800">{title}</h1>

      <div className="flex items-center gap-3">
        <SyncButtons />

        <div className="w-px h-5 bg-slate-200" />

        {/* Avatar */}
        {user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name ?? ""}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-primary-100"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold ring-2 ring-primary-200">
            {initials}
          </div>
        )}

        <span className="text-xs text-slate-600 hidden sm:block">{user?.name}</span>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
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
