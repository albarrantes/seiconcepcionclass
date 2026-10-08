import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell, LoadingScreen, SectionHeader } from "@/components/aula/AppShell";
import { getAssignment, gradeSubmission, submitAssignment } from "@/lib/aula.functions";
import { formatDateTime, relativeDue } from "@/lib/format";
import { initials } from "@/lib/aula-types";
import { FileLink, FilePicker, uploadAttachment } from "@/components/aula/Files";

export const Route = createFileRoute("/tareas/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Tarea — SEI Concepcion" },
      {
        name: "description",
        content: "Detalle de la tarea: instrucciones, tu entrega y la nota del profesor.",
      },
      { property: "og:title", content: "Tarea — SEI Concepcion" },
      { property: "og:description", content: "Instrucciones, entrega y nota." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TareaDetalle,
});

function TareaDetalle() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["assignment", id],
    queryFn: () => getAssignment({ data: { id } }),
    retry: false,
  });

  const [content, setContent] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (query.isError) navigate({ to: "/panel", replace: true });
  }, [query.isError, navigate]);

  useEffect(() => {
    if (query.data && loadedFor !== id) {
      setContent(query.data.mine?.content ?? "");
      setLoadedFor(id);
    }
  }, [query.data, id, loadedFor]);

  if (!query.data) return <LoadingScreen />;
  const { member, assignment, mine, classSubmissions } = query.data;
  const due = relativeDue(assignment.due_at);

  const send = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const uploaded = file ? await uploadAttachment(file) : null;
      const result = await submitAssignment({ data: { assignmentId: id, content, file: uploaded } });
      setMessage(result.ok ? "Entrega guardada." : (result.error ?? "Error"));
      if (result.ok) {
        setFile(null);
        queryClient.invalidateQueries({ queryKey: ["assignment", id] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al subir el archivo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell member={member}>
      <section className="aula-rise">
        <SectionHeader index="(c)" title={assignment.title} hint={assignment.subject} />

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="aula-card space-y-4 p-7 lg:col-span-2">
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-ink-soft/60">
              <span>Entrega: {formatDateTime(assignment.due_at)}</span>
              <span className={due.urgent ? "text-danger" : ""}>{due.label}</span>
              <span>{assignment.points} puntos</span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line text-ink-soft">
              {assignment.description || "Sin instrucciones adicionales."}
            </p>

            <div className="border-t border-line pt-5">
              <h3 className="mb-3 font-display text-lg font-semibold">Tu entrega</h3>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={6}
                placeholder="Escribe aquí tu respuesta o el enlace a tu trabajo."
                className="w-full rounded-xl bg-white/80 px-4 py-3 text-sm ring-1 ring-line focus:ring-2 focus:ring-c1/40 focus:outline-none"
              />
              <div className="mt-3">
                <FilePicker file={file} onChange={setFile} />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={send}
                className="mt-4 rounded-xl bg-ink px-5 py-3 font-display text-sm font-semibold text-mist transition-colors hover:bg-ink/90"
              >
                {busy ? "Enviando…" : mine ? "Actualizar entrega" : "Enviar entrega"}
              </button>
              {message ? <p className="mt-3 font-mono text-xs text-c2">{message}</p> : null}
            </div>
          </div>

          <div className="aula-card p-5">
            <div className="mb-4 font-mono text-xs uppercase tracking-[0.16em] text-ink-soft/60">
              Estado
            </div>
            {mine ? (
              <div className="space-y-2 text-sm">
                <p className="text-ink-soft">Entregada {formatDateTime(mine.submitted_at)}</p>
                <FileLink path={mine.file_path} name={mine.file_name} />
                <p className="font-display text-2xl font-bold text-c2">
                  {mine.grade !== null ? mine.grade : "Sin calificar"}
                </p>
                {mine.feedback ? (
                  <p className="text-sm text-ink-soft">“{mine.feedback}”</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-ink-soft/70">Todavía no has entregado esta tarea.</p>
            )}
            <Link
              to="/panel"
              className="mt-6 inline-block font-mono text-xs text-ink-soft/70 hover:text-ink"
            >
              ← Volver al panel
            </Link>
          </div>
        </div>

        {member.role !== "student" ? (
          <div className="mt-10">
            <h3 className="mb-4 font-display text-xl font-semibold">Entregas de la clase</h3>
            <div className="aula-card overflow-hidden">
              {classSubmissions.length === 0 ? (
                <p className="p-6 text-sm text-ink-soft/70">Nadie ha entregado todavía.</p>
              ) : (
                classSubmissions.map((submission) => (
                  <GradeRow
                    key={submission.id}
                    submission={submission}
                    onSaved={() => {
                      queryClient.invalidateQueries({ queryKey: ["assignment", id] });
                    }}
                  />
                ))
              )}
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

function GradeRow({
  submission,
  onSaved,
}: {
  submission: {
    id: string;
    member_name: string;
    content: string;
    grade: number | null;
    feedback: string | null;
    submitted_at: string;
    file_path: string | null;
    file_name: string | null;
  };
  onSaved: () => void;
}) {
  const [grade, setGrade] = useState(submission.grade !== null ? String(submission.grade) : "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    const result = await gradeSubmission({
      data: { submissionId: submission.id, grade: Number(grade), feedback },
    });
    setSaved(result.ok);
    if (result.ok) onSaved();
  };

  return (
    <div className="border-b border-line p-5 last:border-0">
      <div className="flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-full bg-c4/15 font-display text-xs font-semibold text-c4">
          {initials(submission.member_name)}
        </span>
        <span className="text-sm font-medium">{submission.member_name}</span>
        <span className="font-mono text-[11px] text-ink-soft/50">
          {formatDateTime(submission.submitted_at)}
        </span>
      </div>
      <p className="mt-3 text-sm whitespace-pre-line text-ink-soft">{submission.content}</p>
      <FileLink path={submission.file_path} name={submission.file_name} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          value={grade}
          onChange={(event) => setGrade(event.target.value)}
          inputMode="decimal"
          placeholder="Nota 0-10"
          className="w-28 rounded-lg bg-white/80 px-3 py-2 text-sm ring-1 ring-line focus:outline-none"
        />
        <input
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder="Comentario"
          className="min-w-48 flex-1 rounded-lg bg-white/80 px-3 py-2 text-sm ring-1 ring-line focus:outline-none"
        />
        <button
          type="button"
          onClick={save}
          className="rounded-lg bg-ink px-4 py-2 font-display text-xs font-semibold text-mist"
        >
          Guardar
        </button>
        {saved ? <span className="font-mono text-xs text-c2">Guardado</span> : null}
      </div>
    </div>
  );
}
