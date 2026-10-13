import { createServerFn } from "@tanstack/react-start";
import type {
  Announcement,
  Assignment,
  AssignmentWithMine,
  Member,
  SessionMember,
  Submission,
} from "./aula-types";
import { isValidCode } from "./aula-types";

export type Attachment = { path: string; name: string };

/** Only accept files the caller uploaded into their own folder. */
function cleanAttachment(file: Attachment | null | undefined, memberId: string): Attachment | null {
  if (!file || typeof file.path !== "string" || !file.path.startsWith(`${memberId}/`)) return null;
  if (file.path.includes("..")) return null;
  return { path: file.path, name: String(file.name ?? "archivo").slice(0, 200) };
}

export const MAX_SUBMISSION_FILES = 8;

/** Validate up to MAX_SUBMISSION_FILES attachments uploaded into the caller's folder. */
function cleanAttachments(files: Attachment[] | null | undefined, memberId: string): Attachment[] {
  if (!Array.isArray(files)) return [];
  return files
    .slice(0, MAX_SUBMISSION_FILES)
    .map((file) => cleanAttachment(file, memberId))
    .filter((file): file is Attachment => file !== null);
}

/** Signed one-time upload slot inside the caller's own folder. */
export const prepareUpload = createServerFn({ method: "POST" })
  .inputValidator((data: { fileName: string }) => data)
  .handler(async ({ data }): Promise<{ path: string; token: string }> => {
    const { supabaseAdmin, requireMember } = await import("./aula.server");
    const member = await requireMember();
    const safe = String(data.fileName).replace(/[^\w.\-]+/g, "_").slice(-80) || "archivo";
    const path = `${member.id}/${crypto.randomUUID()}-${safe}`;
    const { data: slot, error } = await supabaseAdmin.storage
      .from("aula-files")
      .createSignedUploadUrl(path);
    if (error || !slot) throw new Error("No se pudo preparar la subida.");
    return { path, token: slot.token };
  });

/** Temporary download link; announcements are class-wide, submissions only for owner or staff. */
export const getFileUrl = createServerFn({ method: "POST" })
  .inputValidator((data: { path: string }) => data)
  .handler(async ({ data }): Promise<{ url: string }> => {
    const { supabaseAdmin, requireMember } = await import("./aula.server");
    const member = await requireMember();
    const { data: ann } = await supabaseAdmin
      .from("announcements")
      .select("id")
      .eq("file_path", data.path)
      .maybeSingle();
    let allowed = Boolean(ann);
    if (!allowed) {
      const { data: sub } = await supabaseAdmin
        .from("submissions")
        .select("member_id")
        .eq("file_path", data.path)
        .maybeSingle();
      allowed = Boolean(sub) && (sub!.member_id === member.id || member.role !== "student");
    }
    if (!allowed) throw new Error("No tienes acceso a este archivo.");
    const { data: link, error } = await supabaseAdmin.storage
      .from("aula-files")
      .createSignedUrl(data.path, 600);
    if (error || !link) throw new Error("No se pudo abrir el archivo.");
    return { url: link.signedUrl };
  });

/** Current signed-in member, or null when the visitor must enter a code. */
export const getSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ member: SessionMember | null }> => {
    const { readSessionMember } = await import("./aula.server");
    return { member: await readSessionMember() };
  },
);

/** Step 1 of the prologue: is this name on the class list and still unregistered? */
export const checkName = createServerFn({ method: "POST" })
  .inputValidator((data: { fullName: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin, normalizeName } = await import("./aula.server");
    const fullName = normalizeName(data.fullName);
    if (fullName.length < 3) return { ok: false, error: "Escribe tu nombre completo." };

    const { data: row } = await supabaseAdmin
      .from("members")
      .select("id, code")
      .ilike("full_name", fullName)
      .maybeSingle();

    if (!row) {
      return {
        ok: false,
        error: "Ese nombre no está en la lista de la clase. Pídele al dueño que te añada.",
      };
    }
    if (row.code) {
      return { ok: false, error: "Ya tienes un código. Entra con él o pide que lo restablezcan." };
    }
    return { ok: true };
  });

/** Step 2 of the prologue: choose the personal access code and sign in. */
export const createCode = createServerFn({ method: "POST" })
  .inputValidator((data: { fullName: string; code: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin, normalizeName, startSession } = await import("./aula.server");
    const fullName = normalizeName(data.fullName);
    if (!isValidCode(data.code)) return { ok: false, error: "El código debe tener 6 dígitos." };

    const { data: row } = await supabaseAdmin
      .from("members")
      .select("id, code")
      .ilike("full_name", fullName)
      .maybeSingle();

    if (!row) return { ok: false, error: "Ese nombre no está en la lista de la clase." };
    if (row.code) return { ok: false, error: "Ya tienes un código de acceso." };

    const { data: taken } = await supabaseAdmin
      .from("members")
      .select("id")
      .eq("code", data.code)
      .maybeSingle();
    if (taken) return { ok: false, error: "Ese código ya está en uso. Elige otro." };

    const { error } = await supabaseAdmin
      .from("members")
      .update({ code: data.code })
      .eq("id", row.id);
    if (error) return { ok: false, error: "No se pudo guardar el código. Inténtalo de nuevo." };

    await startSession(row.id);
    return { ok: true };
  });

/** Returning visits: code-only sign in. */
export const loginWithCode = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => data)
  .handler(
    async ({ data }): Promise<{ ok: boolean; error?: string; challenge?: boolean }> => {
      const { supabaseAdmin, startSession, setPendingOwner } = await import("./aula.server");
      if (!isValidCode(data.code)) return { ok: false, error: "El código debe tener 6 dígitos." };

      const { data: row } = await supabaseAdmin
        .from("members")
        .select("id, role")
        .eq("code", data.code)
        .maybeSingle();

      if (!row) return { ok: false, error: "Código incorrecto." };
      if (row.role === "owner") {
        await setPendingOwner(row.id);
        return { ok: true, challenge: true };
      }
      await startSession(row.id);
      return { ok: true };
    },
  );

export const answerOwnerChallenge = createServerFn({ method: "POST" })
  .inputValidator((data: { answer: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { takePendingOwner, startSession } = await import("./aula.server");
    const pending = await takePendingOwner();
    if (!pending) return { ok: false, error: "Vuelve a introducir tu código." };
    if (String(data.answer).toLowerCase() !== "emirates") {
      return { ok: false, error: "Respuesta incorrecta. Vuelve a introducir tu código." };
    }
    await startSession(pending);
    return { ok: true };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { endSession } = await import("./aula.server");
  await endSession();
  return { ok: true };
});

export type DashboardData = {
  member: SessionMember;
  announcements: Announcement[];
  assignments: AssignmentWithMine[];
  average: number | null;
  memberCount: number;
};

export const getDashboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardData> => {
    const { supabaseAdmin, requireMember } = await import("./aula.server");
    const member = await requireMember();

    const [announcementRes, assignmentRes, submissionRes, memberRes] = await Promise.all([
      supabaseAdmin
        .from("announcements")
        .select("id, body, created_at, file_path, file_name, members(full_name)")
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("assignments")
        .select("id, title, subject, description, points, due_at, created_at")
        .order("due_at", { ascending: true, nullsFirst: false }),
      supabaseAdmin
        .from("submissions")
        .select("id, assignment_id, member_id, content, grade, feedback, submitted_at, file_path, file_name"),
      supabaseAdmin.from("members").select("id"),
    ]);

    const submissions = (submissionRes.data ?? []) as Submission[];
    const mine = submissions.filter((s) => s.member_id === member.id);

    const assignments: AssignmentWithMine[] = ((assignmentRes.data ?? []) as Assignment[]).map(
      (a) => ({
        ...a,
        mine: mine.find((s) => s.assignment_id === a.id) ?? null,
        submission_count: submissions.filter((s) => s.assignment_id === a.id).length,
      }),
    );

    const graded = mine.filter((s) => s.grade !== null);
    const average =
      graded.length > 0
        ? Math.round((graded.reduce((sum, s) => sum + Number(s.grade), 0) / graded.length) * 10) / 10
        : null;

    const announcements: Announcement[] = (
      (announcementRes.data ?? []) as Array<{
        id: string;
        body: string;
        created_at: string;
        file_path: string | null;
        file_name: string | null;
        members: { full_name: string } | null;
      }>
    ).map((row) => ({
      id: row.id,
      body: row.body,
      created_at: row.created_at,
      file_path: row.file_path,
      file_name: row.file_name,
      author_name: row.members?.full_name ?? null,
    }));

    return {
      member,
      announcements,
      assignments,
      average,
      memberCount: (memberRes.data ?? []).length,
    };
  },
);

export type AssignmentDetail = {
  member: SessionMember;
  assignment: Assignment;
  mine: Submission | null;
  classSubmissions: Array<Submission & { member_name: string }>;
};

export const getAssignment = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<AssignmentDetail> => {
    const { supabaseAdmin, requireMember } = await import("./aula.server");
    const member = await requireMember();

    const { data: assignment } = await supabaseAdmin
      .from("assignments")
      .select("id, title, subject, description, points, due_at, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (!assignment) throw new Error("Esta tarea ya no existe.");

    const { data: rows } = await supabaseAdmin
      .from("submissions")
      .select("id, assignment_id, member_id, content, grade, feedback, submitted_at, file_path, file_name, members(full_name)")
      .eq("assignment_id", data.id)
      .order("submitted_at", { ascending: true });

    const all = ((rows ?? []) as Array<Submission & { members: { full_name: string } | null }>).map(
      (row) => ({ ...row, member_name: row.members?.full_name ?? "—" }),
    );

    const isStaff = member.role !== "student";
    return {
      member,
      assignment: assignment as Assignment,
      mine: all.find((s) => s.member_id === member.id) ?? null,
      classSubmissions: isStaff ? all : [],
    };
  });

export const submitAssignment = createServerFn({ method: "POST" })
  .inputValidator((data: { assignmentId: string; content: string; file?: Attachment | null }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin, requireMember } = await import("./aula.server");
    const member = await requireMember();
    const content = data.content.trim().slice(0, 5000);
    const file = cleanAttachment(data.file, member.id);
    if (!content && !file) return { ok: false, error: "Escribe tu entrega o adjunta un archivo." };
    const filePatch = file ? { file_path: file.path, file_name: file.name } : {};

    const { error } = await supabaseAdmin
      .from("submissions")
      .upsert(
        { assignment_id: data.assignmentId, member_id: member.id, content, ...filePatch },
        { onConflict: "assignment_id,member_id" },
      );
    if (error) return { ok: false, error: "No se pudo enviar la entrega." };
    return { ok: true };
  });

export const gradeSubmission = createServerFn({ method: "POST" })
  .inputValidator((data: { submissionId: string; grade: number; feedback: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin, requireStaff } = await import("./aula.server");
    await requireStaff();
    if (!Number.isFinite(data.grade) || data.grade < 0 || data.grade > 10) {
      return { ok: false, error: "La nota debe estar entre 0 y 10." };
    }
    const { error } = await supabaseAdmin
      .from("submissions")
      .update({ grade: data.grade, feedback: data.feedback.trim().slice(0, 1000) })
      .eq("id", data.submissionId);
    if (error) return { ok: false, error: "No se pudo guardar la nota." };
    return { ok: true };
  });

export const createAssignment = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      title: string;
      subject: string;
      description: string;
      points: number;
      dueAt: string | null;
    }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin, requireStaff } = await import("./aula.server");
    const member = await requireStaff();
    const title = data.title.trim().slice(0, 140);
    if (!title) return { ok: false, error: "La tarea necesita un título." };

    const { error } = await supabaseAdmin.from("assignments").insert({
      title,
      subject: data.subject.trim().slice(0, 40) || "General",
      description: data.description.trim().slice(0, 4000),
      points: Math.max(1, Math.min(100, Math.round(data.points || 10))),
      due_at: data.dueAt ? new Date(data.dueAt).toISOString() : null,
      created_by: member.id,
    });
    if (error) return { ok: false, error: "No se pudo crear la tarea." };
    return { ok: true };
  });

export const deleteAssignment = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { supabaseAdmin, requireStaff } = await import("./aula.server");
    await requireStaff();
    await supabaseAdmin.from("assignments").delete().eq("id", data.id);
    return { ok: true };
  });

export const createAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((data: { body: string; file?: Attachment | null }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin, requireStaff } = await import("./aula.server");
    const member = await requireStaff();
    const file = cleanAttachment(data.file, member.id);
    const body = data.body.trim().slice(0, 1000) || (file ? "Archivo adjunto" : "");
    if (!body) return { ok: false, error: "Escribe el aviso." };
    const { error } = await supabaseAdmin.from("announcements").insert({
      body,
      author_id: member.id,
      file_path: file?.path ?? null,
      file_name: file?.name ?? null,
    });
    if (error) return { ok: false, error: "No se pudo publicar el aviso." };
    return { ok: true };
  });

export const getAdminData = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    member: SessionMember;
    members: Member[];
    stats: { assignments: number; submissions: number; graded: number; pendingCodes: number };
  }> => {
    const { requireOwner, listMembers, supabaseAdmin } = await import("./aula.server");
    const member = await requireOwner();
    const members = await listMembers();
    const [assignments, submissions, graded] = await Promise.all([
      supabaseAdmin.from("assignments").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("submissions").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .not("grade", "is", null),
    ]);
    return {
      member,
      members,
      stats: {
        assignments: assignments.count ?? 0,
        submissions: submissions.count ?? 0,
        graded: graded.count ?? 0,
        pendingCodes: members.filter((row) => !row.has_code).length,
      },
    };
  },
);

export const addMember = createServerFn({ method: "POST" })
  .inputValidator((data: { fullName: string; role: "teacher" | "student" }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin, requireOwner, normalizeName } = await import("./aula.server");
    await requireOwner();
    const fullName = normalizeName(data.fullName);
    if (fullName.length < 3) return { ok: false, error: "Escribe el nombre completo." };

    const { error } = await supabaseAdmin
      .from("members")
      .insert({ full_name: fullName, role: data.role });
    if (error) return { ok: false, error: "Ese nombre ya está en la lista." };
    return { ok: true };
  });

export const addMembers = createServerFn({ method: "POST" })
  .inputValidator((data: { fullNames: string[]; role: "teacher" | "student" }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; added: number; error?: string }> => {
    const { supabaseAdmin, requireOwner, normalizeName } = await import("./aula.server");
    await requireOwner();
    const names = Array.from(new Set(data.fullNames.map(normalizeName))).filter(
      (name) => name.length >= 3,
    );
    if (names.length === 0) return { ok: false, added: 0, error: "Añade al menos un nombre completo." };
    if (names.length > 100) return { ok: false, added: 0, error: "Puedes añadir hasta 100 personas cada vez." };

    const { error } = await supabaseAdmin
      .from("members")
      .insert(names.map((full_name) => ({ full_name, role: data.role })));
    if (error) {
      return {
        ok: false,
        added: 0,
        error: "Hay nombres repetidos o ya incluidos en la lista.",
      };
    }
    return { ok: true, added: names.length };
  });

export const renameMember = createServerFn({ method: "POST" })
  .inputValidator((data: { memberId: string; fullName: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin, requireOwner, normalizeName } = await import("./aula.server");
    const owner = await requireOwner();
    const fullName = normalizeName(data.fullName);
    if (fullName.length < 3) return { ok: false, error: "Escribe el nombre completo." };
    if (data.memberId === owner.id) return { ok: false, error: "Tu cuenta principal no se puede renombrar aquí." };
    const { error } = await supabaseAdmin
      .from("members")
      .update({ full_name: fullName })
      .eq("id", data.memberId);
    if (error) return { ok: false, error: "Ese nombre ya está en la lista." };
    return { ok: true };
  });

export const resetMemberCode = createServerFn({ method: "POST" })
  .inputValidator((data: { memberId: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin, requireOwner } = await import("./aula.server");
    const owner = await requireOwner();
    if (data.memberId === owner.id) {
      return { ok: false, error: "No puedes restablecer tu propio código." };
    }
    await supabaseAdmin.from("members").update({ code: null }).eq("id", data.memberId);
    return { ok: true };
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .inputValidator((data: { memberId: string; role: "teacher" | "student" }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin, requireOwner } = await import("./aula.server");
    const owner = await requireOwner();
    if (data.memberId === owner.id) return { ok: false, error: "No puedes cambiar tu propio rol." };
    await supabaseAdmin.from("members").update({ role: data.role }).eq("id", data.memberId);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .inputValidator((data: { memberId: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin, requireOwner } = await import("./aula.server");
    const owner = await requireOwner();
    if (data.memberId === owner.id) return { ok: false, error: "No puedes eliminarte a ti mismo." };
    await supabaseAdmin.from("members").delete().eq("id", data.memberId);
    return { ok: true };
  });
