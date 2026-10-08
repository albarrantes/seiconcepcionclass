ALTER TABLE public.announcements ADD COLUMN file_path text, ADD COLUMN file_name text;
ALTER TABLE public.submissions ADD COLUMN file_path text, ADD COLUMN file_name text;