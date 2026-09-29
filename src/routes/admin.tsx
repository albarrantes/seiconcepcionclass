import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell, LoadingScreen, SectionHeader } from "@/components/aula/AppShell";
import {
  addMember,
  getAdminData,
  removeMember,
  resetMemberCode,
  setMemberRole,
} from "@/lib/aula.functions";
import { initials, ROLE_LABEL } from "@/lib/aula-types";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Administración — Aula" },
      {
        name: "description",
        content:
          "Lista de la clase: añade nombres, cambia roles y restablece los códigos de acceso.",
      },
      { property: "og:title", content: "Administración — Aula" },
      {
        property: "og:description",
        content: "Añade nombres, cambia roles y restablece códigos.",
      },
    ],
  }),
  component: Admin,
});

function Admin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["admin"], queryFn: () => getAdminData(), retry: false });

  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"teacher" | "student">("student");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (query.isError) navigate({ to: "/panel", replace: true });
  }, [query.isError, navigate]);

  if (!query.data) return <LoadingScreen />;
  const { member, members } = query.data;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin"] });

  const add = async () => {
    const result = await addMember({ data: { fullName: newName, role: newRole } });
    setMessage(result.ok ? "Nombre añadido a la lista." : (result.error ?? "Error"));
    if (result.ok) {
      setNewName("");
      refresh();
    }
  };

  return (
    <AppShell member={member}>
      <section className="aula-rise">
        <SectionHeader
          index="(d)"
          title="Administración"
          hint={`Solo el dueño · código ${member.code}`}
        />

        <div className="aula-card mb-6 flex flex-wrap items-end gap-3 p-6">
          <div className="min-w-56 flex-1">
            <label htmlFor="nuevo" className="mb-2 block text-sm font-medium text-ink-soft">
              Añadir a la lista de la clase
            </label>
            <input
              id="nuevo"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Nombre y apellidos"
              className="w-full rounded-xl bg-white/80 px-4 py-3 text-sm ring-1 ring-line focus:ring-2 focus:ring-c1/40 focus:outline-none"
            />
          </div>
          <select
            value={newRole}
            onChange={(event) => setNewRole(event.target.value as "teacher" | "student")}
            className="rounded-xl bg-white/80 px-4 py-3 text-sm ring-1 ring-line focus:outline-none"
          >
            <option value="student">Estudiante</option>
            <option value="teacher">Profesor</option>
          </select>
          <button
            type="button"
            onClick={add}
            className="rounded-xl bg-ink px-5 py-3 font-display text-sm font-semibold text-mist transition-colors hover:bg-ink/90"
          >
            Añadir
          </button>
        </div>

        <div className="aula-card overflow-hidden">
          <div className="grid grid-cols-12 border-b border-line px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft/60">
            <div className="col-span-4">Miembro</div>
            <div className="col-span-2">Código</div>
            <div className="col-span-2">Rol</div>
            <div className="col-span-2">Último acceso</div>
            <div className="col-span-2 text-right">Acción</div>
          </div>

          {members.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-12 items-center border-b border-line px-5 py-4 last:border-0"
            >
              <div className="col-span-4 flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-c1/15 font-display text-xs font-semibold text-c1">
                  {initials(row.full_name)}
                </span>
                <span className="text-sm font-medium">{row.full_name}</span>
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
        </div>

        {message ? <p className="mt-6 font-mono text-xs text-c2">{message}</p> : null}
      </section>
    </AppShell>
  );
}
