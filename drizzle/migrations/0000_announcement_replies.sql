CREATE TABLE public.announcement_replies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
 author_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
 body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.announcement_replies TO service_role;
ALTER TABLE public.announcement_replies ENABLE ROW LEVEL SECURITY;
CREATE INDEX announcement_replies_thread_idx ON public.announcement_replies(announcement_id, created_at);
COMMENT ON TABLE public.announcement_replies IS 'Private classroom replies; access only through server-validated Aula member sessions.';