"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSearch() {
    const q = query.trim();
    if (!q) return;
    router.push(`/solicitudes?keyword=${encodeURIComponent(q)}`);
    setIsOpen(false);
    setQuery("");
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4"
      onClick={() => { setIsOpen(false); setQuery(""); }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
          <div className="p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar proyectos, actividades..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 text-sm"
            />
            <kbd className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded font-mono">ESC</kbd>
          </div>
        </form>

        <div className="border-t border-slate-100 px-4 py-3">
          {query.trim() ? (
            <button
              onClick={handleSearch}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Buscar &ldquo;<span className="font-medium text-primary-600">{query}</span>&rdquo; en proyectos
            </button>
          ) : (
            <p className="text-xs text-slate-400 px-3">
              Escribí para buscar · <kbd className="font-mono bg-slate-100 px-1 rounded">↵</kbd> para ir a resultados
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
