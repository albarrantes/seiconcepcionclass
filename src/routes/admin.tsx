import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, KeyRound, Search, Users } from "lucide-react";
import { AppShell, LoadingScreen, SectionHeader } from "@/components/aula/AppShell";
import {
  addMembers,
  getAdminData,
  removeMember,
  renameMember,
  resetMemberCode,
  setMemberRole,
} from "@/lib/aula.functions";
import { initials, ROLE_LABEL } from "@/lib/aula-types";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Administración — SEI Concepcion" },
      {
        name: "description",
        content:
          "Lista de la clase: añade nombres, cambia roles y restablece los códigos de acceso.",
      },
      { property: "og:title", content: "Administración — SEI Concepcion" },
      {
        property: "og:description",
        content: "Añade nombres, cambia roles y restablece códigos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["admin"], queryFn: () => getAdminData(), retry: false });

  const [newNames, setNewNames] = useState("");
  const [newRole, setNewRole] = useState<"teacher" | "student">("student");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "student" | "teacher" | "pending">("all");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (query.isError) navigate({ to: "/panel", replace: true });
  }, [query.isError, navigate]);

  if (!query.data) return <LoadingScreen />;
  const { member, members, stats } = query.data;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin"] });

  const add = async () => {
    const fullNames = newNames
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);
    const result = await addMembers({ data: { fullNames, role: newRole } });
    setMessage(
      result.ok
        ? `${result.added} ${result.added === 1 ? "persona añadida" : "personas añadidas"}.`
        : (result.error ?? "Error"),
    );
    if (result.ok) {
      setNewNames("");
      refresh();
    }
  };

  const filteredMembers = members.filter((row) => {
    const matchesSearch = row.full_name.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es"));
    const matchesFilter =
      filter === "all" ||
      (filter === "pending" ? !row.code : row.role === filter);
    return matchesSearch && matchesFilter;
  });

  const students = members.filter((row) => row.role === "student").length;
  const teachers = members.filter((row) => row.role === "teacher").length;

  return (
    <AppShell member={member}>
      <section className="aula-rise">
        <SectionHeader
          index="(d)"
          title="Panel del dueño"
          hint="Alumnos, profesores y actividad de la clase"
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={Users} label="Alumnos" value={students} tone="c1" />
          <Stat icon={Users} label="Profesores" value={teachers} tone="c2" />
          <Stat icon={BookOpen} label="Tareas" value={stats.assignments} tone="c3" />
          <Stat
            icon={CheckCircle2}
            label="Entregas corregidas"
            value={`${stats.graded}/${stats.submissions}`}
            tone="c4"
          />
        </div>

        <div className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="aula-card p-6">
            <div className="mb-4">
              <h3 className="font-display text-xl font-semibold">Añadir personas</h3>
              <p className="mt-1 text-sm text-ink-soft/70">Una persona por línea para añadir una clase completa.</p>
            </div>
            <textarea
              id="nuevo"
              value={newNames}
              onChange={(event) => setNewNames(event.target.value)}
              rows={5}
              placeholder={"Lucía Fernández\nMarco Ruiz\nSara López"}
              className="w-full rounded-xl bg-white/80 px-4 py-3 text-sm ring-1 ring-line focus:ring-2 focus:ring-c1/40 focus:outline-none"
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <select
                aria-label="Rol de las personas nuevas"
                value={newRole}
                onChange={(event) => setNewRole(event.target.value as "teacher" | "student")}
                className="rounded-xl bg-white/80 px-4 py-3 text-sm ring-1 ring-line focus:outline-none"
              >
                <option value="student">Alumnos</option>
                <option value="teacher">Profesores</option>
              </select>
              <button
                type="button"
                onClick={add}
                disabled={!newNames.trim()}
                className="rounded-xl bg-ink px-5 py-3 font-display text-sm font-semibold text-mist transition-colors hover:bg-ink/90 disabled:opacity-40"
              >
                Añadir a la clase
              </button>
            </div>
          </div>

          <div className="aula-card p-6">
            <KeyRound className="size-5 text-c3" aria-hidden="true" />
            <div className="mt-4 font-display text-4xl font-bold">{stats.pendingCodes}</div>
            <div className="mt-1 text-sm font-medium">Sin código de acceso</div>
            <p className="mt-3 text-xs leading-relaxed text-ink-soft/70">
              Estas personas deben entrar por “Es mi primera vez aquí” y elegir sus 6 dígitos.
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft/50" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre"
              className="w-full rounded-xl bg-white/70 py-2.5 pr-4 pl-10 text-sm ring-1 ring-line focus:ring-2 focus:ring-c1/40 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["all", "Todos"],
              ["student", "Alumnos"],
              ["teacher", "Profesores"],
              ["pending", "Sin código"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full px-3 py-2 font-mono text-xs transition-colors ${
                  filter === value ? "bg-ink text-mist" : "bg-white/60 text-ink-soft ring-1 ring-line"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="aula-card overflow-x-auto">
          <div className="min-w-[760px]">
          <div className="grid grid-cols-12 border-b border-line px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft/60">
            <div className="col-span-4">Miembro</div>
            <div className="col-span-2">Código</div>
            <div className="col-span-2">Rol</div>
            <div className="col-span-2">Último acceso</div>
            <div className="col-span-2 text-right">Acción</div>
          </div>

          {filteredMembers.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-12 items-center border-b border-line px-5 py-4 last:border-0"
            >
              <div className="col-span-4 flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-c1/15 font-display text-xs font-semibold text-c1">
                  {initials(row.full_name)}
                </span>
                {row.role === "owner" ? (
                  <span className="text-sm font-medium">{row.full_name}</span>
                ) : (
                  <input
                    defaultValue={row.full_name}
                    aria-label={`Nombre de ${row.full_name}`}
                    onBlur={async (event) => {
                      const fullName = event.target.value.trim();
                      if (fullName === row.full_name) return;
                      const result = await renameMember({ data: { memberId: row.id, fullName } });
                      setMessage(result.ok ? "Nombre actualizado." : (result.error ?? "Error"));
                      if (result.ok) refresh();
                      else event.target.value = row.full_name;
                    }}
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium focus:outline-none"
                  />
                )}
              </div>
              <div className="col-span-2 font-mono text-sm">
                {row.code ?? <span className="text-ink-soft/40">sin código</span>}
              </div>
              <div className="col-span-2">
                {row.role === "owner" ? (
                  <span className="rounded-full bg-ink px-2 py-1 text-xs text-mist">
                    {ROLE_LABEL.owner}
                  </span>
                ) : (
                  <select
                    value={row.role}
                    onChange={async (event) => {
                      await setMemberRole({
                        data: {
                          memberId: row.id,
                          role: event.target.value as "teacher" | "student",
                        },
                      });
                      refresh();
                    }}
                    className="rounded-full bg-c2/15 px-2 py-1 text-xs text-c2 focus:outline-none"
                  >
                    <option value="student">Estudiante</option>
                    <option value="teacher">Profesor</option>
                  </select>
                )}
              </div>
              <div className="col-span-2 font-mono text-[11px] text-ink-soft/60">
                {row.last_login_at ? formatDateTime(row.last_login_at) : "Nunca"}
              </div>
              <div className="col-span-2 flex justify-end gap-3">
                {row.role === "owner" ? (
                  <span className="text-xs text-ink-soft/40">—</span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`¿Restablecer el código de ${row.full_name}?`)) return;
                        const result = await resetMemberCode({ data: { memberId: row.id } });
                        setMessage(
                          result.ok
                            ? `${row.full_name} deberá crear un código nuevo.`
                            : (result.error ?? "Error"),
                        );
                        refresh();
                      }}
                      className="font-mono text-xs text-danger hover:underline"
                    >
                      Resetear
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`¿Quitar a ${row.full_name} de la clase?`)) return;
                        await removeMember({ data: { memberId: row.id } });
                        refresh();
                      }}
                      className="font-mono text-xs text-ink-soft/60 hover:underline"
                    >
                      Quitar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {filteredMembers.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-soft/70">No hay personas con ese filtro.</p>
          ) : null}
          </div>
        </div>

        {message ? <p className="mt-6 font-mono text-xs text-c2">{message}</p> : null}
      </section>
    </AppShell>
  );
}

const statTone = {
  c1: "bg-c1/15 text-c1",
  c2: "bg-c2/15 text-c2",
  c3: "bg-c3/15 text-c3",
  c4: "bg-c4/15 text-c4",
};

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  tone: keyof typeof statTone;
}) {
  return (
    <div className="aula-card flex items-center gap-4 p-5">
      <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${statTone[tone]}`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <div className="font-display text-2xl font-bold">{value}</div>
        <div className="text-xs text-ink-soft/70">{label}</div>
      </div>
    </div>
  );
}
