import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { logout } from "@/lib/aula.functions";
import { initials, type SessionMember } from "@/lib/aula-types";

const navLinkClass = "text-ink-soft transition-colors hover:text-ink";
const activeClass = { className: "text-ink" };

export function AppShell({ member, children }: { member: SessionMember; children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await logout();
    queryClient.clear();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="aula-shell min-h-screen font-body text-ink antialiased">
      <header className="sticky top-0 z-30 border-b border-line bg-white/55 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/panel" className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-ink font-display text-sm font-bold text-mist">
              A
            </div>
            <div className="leading-none">
              <div className="font-display text-lg font-bold tracking-tight">Aula</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft/60">
                Clase única
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
            <Link to="/panel" className={navLinkClass} activeProps={activeClass}>
              Inicio
            </Link>
            {member.role !== "student" ? (
              <Link to="/clase" className={navLinkClass} activeProps={activeClass}>
                Publicar
              </Link>
            ) : null}
            {member.role === "owner" ? (
              <Link to="/admin" className={navLinkClass} activeProps={activeClass}>
                Administración
              </Link>
            ) : null}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-line sm:flex">
              <span className="size-2 rounded-full bg-c2" />
              <span className="font-mono text-xs text-ink-soft">Código {member.code}</span>
            </div>
            <div className="grid size-9 place-items-center rounded-full bg-c1/15 font-display text-sm font-semibold text-c1">
              {initials(member.full_name)}
            </div>
            <button
              type="button"
              onClick={signOut}
              className="font-mono text-xs text-ink-soft/70 transition-colors hover:text-danger"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-16 px-6 py-10">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 md:flex-row">
          <div className="font-display font-bold tracking-tight">Aula</div>
          <div className="font-mono text-xs text-ink-soft/60">
            Acceso por código · {member.full_name}
          </div>
        </div>
      </footer>
    </div>
  );
}

export function SectionHeader({
  index,
  title,
  hint,
}: {
  index: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-baseline gap-4">
      <span className="font-mono text-xs text-c1">{index}</span>
      <h2 className="font-display text-2xl font-bold tracking-tight text-balance md:text-3xl">
        {title}
      </h2>
      {hint ? <span className="text-sm text-ink-soft/70">{hint}</span> : null}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="aula-shell grid min-h-screen place-items-center font-body">
      <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft/60">
        Cargando…
      </span>
    </div>
  );
}
