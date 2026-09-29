CREATE TABLE public.members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL UNIQUE,
  code text UNIQUE,
  role text NOT NULL DEFAULT 'student',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  subject text NOT NULL DEFAULT 'General',
  description text NOT NULL DEFAULT '',
  points integer NOT NULL DEFAULT 10,
  due_at timestamptz,
  created_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  grade numeric,
  feedback text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, member_id)
);

GRANT ALL ON public.members TO service_role;
GRANT ALL ON public.announcements TO service_role;
GRANT ALL ON public.assignments TO service_role;
GRANT ALL ON public.submissions TO service_role;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

INSERT INTO public.members (full_name, code, role) VALUES ('Dirección del colegio', '061114', 'owner');
