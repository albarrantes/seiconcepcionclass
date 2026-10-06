import { useSession } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Member, Role, SessionMember } from "./aula-types";

type AulaSession = { memberId?: string };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "aula-session",
    maxAge: 60 * 60 * 24 * 30,
    // "none" + partitioned so the session survives inside embedded previews (iframes).
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      partitioned: true,
      path: "/",
    },
  };
}

export async function readSessionMember(): Promise<SessionMember | null> {
  const session = await useSession<AulaSession>(sessionConfig());
  const memberId = session.data.memberId;
  if (!memberId) return null;

  const { data } = await supabaseAdmin
    .from("members")
    .select("id, full_name, role, code")
    .eq("id", memberId)
    .maybeSingle();

  if (!data || !data.code) return null;
  return {
    id: data.id,
    full_name: data.full_name,
    role: data.role as Role,
    code: data.code,
  };
}

export async function startSession(memberId: string) {
  const session = await useSession<AulaSession>(sessionConfig());
  await session.update({ memberId });
  await supabaseAdmin
    .from("members")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", memberId);
}

export async function endSession() {
  const session = await useSession<AulaSession>(sessionConfig());
  await session.clear();
}

export async function requireMember(): Promise<SessionMember> {
  const member = await readSessionMember();
  if (!member) throw new Error("Tu sesión ha caducado. Vuelve a introducir tu código.");
  return member;
}

export async function requireStaff(): Promise<SessionMember> {
  const member = await requireMember();
  if (member.role !== "owner" && member.role !== "teacher") {
    throw new Error("No tienes permisos para hacer esto.");
  }
  return member;
}

export async function requireOwner(): Promise<SessionMember> {
  const member = await requireMember();
  if (member.role !== "owner") throw new Error("Solo el dueño puede hacer esto.");
  return member;
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export async function listMembers(): Promise<Member[]> {
  const { data } = await supabaseAdmin
    .from("members")
    .select("id, full_name, role, code, last_login_at")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });
  return (data ?? []) as Member[];
}

export { supabaseAdmin };
