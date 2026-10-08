import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppShell, LoadingScreen, SectionHeader } from "@/components/aula/AppShell";
import { getDashboard } from "@/lib/aula.functions";
import { subjectAccent } from "@/lib/aula-types";
import { formatDateTime, relativeDue } from "@/lib/format";
import { FileLink } from "@/components/aula/Files";

export const Route = createFileRoute("/panel")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Panel de clase — SEI Concepcion" },
      {
        name: "description",
        content: "Tus tareas, entregas, avisos del profesor y calificaciones de la clase.",
      },
      { property: "og:title", content: "Panel de clase — SEI Concepcion" },
      {
        property: "og:description",
        content: "Tareas, avisos y calificaciones de tu clase.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Panel,
});

const accentRing: Record<string, string> = {
  c1: "bg-c1/15 text-c1",
  c2: "bg-c2/15 text-c2",
  c3: "bg-c3/15 text-c3",
  c4: "bg-c4/15 text-c4",
};

const accentBar: Record<string, string> = {
  c1: "bg-c1",
  c2: "bg-c2",
  c3: "bg-c3",
  c4: "bg-c4",
};

function Panel() {
  const navigate = useNavigate();
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard(), retry: false });

  useEffect(() => {
    if (dashboard.isError) navigate({ to: "/", replace: true });
  }, [dashboard.isError, navigate]);

  if (!dashboard.data) return <LoadingScreen />;
  const { member, assignments, announcements, average, memberCount } = dashboard.data;

  const pending = assignments.filter((a) => !a.mine);
  const graded = assignments.filter((a) => a.mine?.grade !== null && a.mine !== null);

  return (
    <AppShell member={member}>
      <section className="aula-rise">
        <SectionHeader
          index="(a)"
          title={`Hola, ${member.full_name.split(" ")[0]}`}
          hint={`${pending.length} tareas sin entregar · ${memberCount} personas en la clase`}
        />

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="mb-1 font-mono text-xs uppercase tracking-[0.16em] text-ink-soft/60">
              Tareas de la clase
            </div>
            {assignments.length === 0 ? (
              <div className="aula-card p-8 text-sm text-ink-soft/70">
                Todavía no hay tareas publicadas.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {assignments.map((assignment) => {
                  const accent = subjectAccent(assignment.subject);
                  const due = relativeDue(assignment.due_at);
                  return (
                    <Link
                      key={assignment.id}
                      to="/tareas/$id"
                      params={{ id: assignment.id }}
                      className="aula-card block p-5 transition-transform duration-300 hover:-translate-y-1"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span
                          className={`grid size-9 place-items-center rounded-lg font-display font-bold ${accentRing[accent]}`}
                        >
                          {assignment.subject.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-mono text-xs text-ink-soft/60">
                          {assignment.subject}
                        </span>
                      </div>
                      <div className="font-display text-lg font-semibold">{assignment.title}</div>
                      <div className="mt-1 text-sm text-ink-soft/70">
                        Entrega: {formatDateTime(assignment.due_at)}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span
                          className={`font-mono text-xs ${due.urgent ? "text-danger" : "text-ink-soft/60"}`}
                        >
                          {due.label}
                        </span>
                        <span className="font-mono text-xs text-ink-soft/60">
                          {member.role === "student"
                            ? assignment.mine
                              ? assignment.mine.grade !== null
                                ? `Nota ${assignment.mine.grade}`
                                : "Entregada"
                              : "Pendiente"
                            : `${assignment.submission_count} entregas`}
                        </span>
                      </div>
                      <div className={`mt-4 h-1.5 rounded-full ${accentRing[accent]}`}>
                        <div
                          className={`h-full rounded-full ${accentBar[accent]}`}
                          style={{ width: assignment.mine ? "100%" : "18%" }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="aula-card p-5">
            <div className="mb-4 font-mono text-xs uppercase tracking-[0.16em] text-ink-soft/60">
              Próximo
            </div>
            <div className="space-y-4">
              {pending.slice(0, 3).map((assignment) => {
                const accent = subjectAccent(assignment.subject);
                return (
                  <div key={assignment.id} className="flex gap-3">
                    <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${accentBar[accent]}`} />
                    <div>
                      <div className="text-sm font-medium">{assignment.title}</div>
                      <div className="text-xs text-ink-soft/60">
                        {assignment.subject} · {formatDateTime(assignment.due_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              {pending.length === 0 ? (
                <p className="text-sm text-ink-soft/70">Estás al día. Nada pendiente.</p>
              ) : null}

              <div className="border-t border-line pt-4">
                <div className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-ink-soft/60">
                  Avisos
                </div>
                {announcements.length === 0 ? (
                  <p className="text-sm text-ink-soft/70">Sin avisos por ahora.</p>
                ) : (
                  <div className="space-y-3">
                    {announcements.slice(0, 4).map((announcement) => (
                      <div key={announcement.id}>
                        <p className="text-sm text-ink-soft">{announcement.body}</p>
                        <FileLink path={announcement.file_path} name={announcement.file_name} />
                        <p className="mt-1 font-mono text-[11px] text-ink-soft/50">
                          {announcement.author_name ?? "Clase"} ·{" "}
                          {formatDateTime(announcement.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-line pt-4">
                <div className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-ink-soft/60">
                  Calificaciones
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">Promedio general</span>
                  <span className="font-display font-semibold text-c2">{average ?? "—"}</span>
                </div>
                {graded.map((assignment) => (
                  <div key={assignment.id} className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-ink-soft">{assignment.title}</span>
                    <span className="font-display font-semibold">{assignment.mine?.grade}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
