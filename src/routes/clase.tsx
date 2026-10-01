import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell, LoadingScreen, SectionHeader } from "@/components/aula/AppShell";
import {
  createAnnouncement,
  createAssignment,
  deleteAssignment,
  getDashboard,
} from "@/lib/aula.functions";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/clase")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Publicar en la clase — SEI Concepcion" },
      {
        name: "description",
        content: "Crea tareas con fecha de entrega y publica avisos para toda la clase.",
      },
      { property: "og:title", content: "Publicar en la clase — SEI Concepcion" },
      {
        property: "og:description",
        content: "Crea tareas y publica avisos para la clase.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Clase,
});

function Clase() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard(), retry: false });

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(10);
  const [dueAt, setDueAt] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (dashboard.isError) navigate({ to: "/", replace: true });
  }, [dashboard.isError, navigate]);

  useEffect(() => {
    if (dashboard.data && dashboard.data.member.role === "student") {
      navigate({ to: "/panel", replace: true });
    }
  }, [dashboard.data, navigate]);

  if (!dashboard.data) return <LoadingScreen />;
  const { member, assignments } = dashboard.data;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["dashboard"] });

  const submitAssignment = async () => {
    const result = await createAssignment({
      data: { title, subject, description, points, dueAt: dueAt || null },
    });
    setMessage(result.ok ? "Tarea publicada." : (result.error ?? "Error"));
    if (result.ok) {
      setTitle("");
      setSubject("");
      setDescription("");
      setDueAt("");
      setPoints(10);
      refresh();
    }
  };

  const submitAnnouncement = async () => {
    const result = await createAnnouncement({ data: { body } });
    setMessage(result.ok ? "Aviso publicado." : (result.error ?? "Error"));
    if (result.ok) {
      setBody("");
      refresh();
    }
  };

  const inputClass =
    "w-full rounded-xl bg-white/80 px-4 py-3 text-sm ring-1 ring-line focus:ring-2 focus:ring-c1/40 focus:outline-none";

  return (
    <AppShell member={member}>
      <section className="aula-rise">
        <SectionHeader index="(b)" title="Publicar en la clase" hint="Tareas y avisos" />

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="aula-card space-y-4 p-7">
            <h3 className="font-display text-xl font-semibold">Nueva tarea</h3>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Título de la tarea"
              className={inputClass}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Materia"
                className={inputClass}
              />
              <input
                type="number"
                min={1}
                max={100}
                value={points}
                onChange={(event) => setPoints(Number(event.target.value))}
                className={inputClass}
              />
            </div>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              className={inputClass}
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Instrucciones para la clase"
              className={inputClass}
            />
            <button
              type="button"
              onClick={submitAssignment}
              className="w-full rounded-xl bg-ink py-3 font-display text-sm font-semibold text-mist transition-colors hover:bg-ink/90"
            >
              Publicar tarea
            </button>
          </div>

          <div className="space-y-5">
            <div className="aula-card space-y-4 p-7">
              <h3 className="font-display text-xl font-semibold">Nuevo aviso</h3>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={4}
                placeholder="Mañana traed el libro de lectura."
                className={inputClass}
              />
              <button
                type="button"
                onClick={submitAnnouncement}
                className="w-full rounded-xl bg-c1 py-3 font-display text-sm font-semibold text-mist transition-colors hover:bg-c1/90"
              >
                Publicar aviso
              </button>
            </div>

            <div className="aula-card p-7">
              <h3 className="mb-4 font-display text-xl font-semibold">Tareas publicadas</h3>
              <div className="space-y-3">
                {assignments.length === 0 ? (
                  <p className="text-sm text-ink-soft/70">Aún no hay tareas.</p>
                ) : (
                  assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between border-b border-line pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <div className="text-sm font-medium">{assignment.title}</div>
                        <div className="font-mono text-[11px] text-ink-soft/60">
                          {assignment.subject} · {formatDateTime(assignment.due_at)} ·{" "}
                          {assignment.submission_count} entregas
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteAssignment({ data: { id: assignment.id } });
                          refresh();
                        }}
                        className="font-mono text-xs text-danger hover:underline"
                      >
                        Borrar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {message ? <p className="mt-6 font-mono text-xs text-c2">{message}</p> : null}
      </section>
    </AppShell>
  );
}
