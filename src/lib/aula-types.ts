export type Role = "owner" | "teacher" | "student";

export type Member = {
  id: string;
  full_name: string;
  role: Role;
  code: string | null;
  last_login_at: string | null;
};

export type SessionMember = {
  id: string;
  full_name: string;
  role: Role;
  code: string;
};

export type Announcement = {
  id: string;
  body: string;
  created_at: string;
  author_name: string | null;
  file_path: string | null;
  file_name: string | null;
};

export type Assignment = {
  id: string;
  title: string;
  subject: string;
  description: string;
  points: number;
  due_at: string | null;
  created_at: string;
};

export type Submission = {
  id: string;
  assignment_id: string;
  member_id: string;
  content: string;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  file_path: string | null;
  file_name: string | null;
};

export type AssignmentWithMine = Assignment & {
  mine: Submission | null;
  submission_count: number;
};

export const SUBJECT_COLORS = ["c1", "c2", "c3", "c4"] as const;

export function subjectAccent(subject: string): "c1" | "c2" | "c3" | "c4" {
  let sum = 0;
  for (let i = 0; i < subject.length; i += 1) sum += subject.charCodeAt(i);
  return SUBJECT_COLORS[sum % SUBJECT_COLORS.length]!;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function isValidCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Dueño",
  teacher: "Profesor",
  student: "Estudiante",
};
