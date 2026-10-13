ALTER TABLE public.submissions ADD COLUMN files jsonb NOT NULL DEFAULT '[]'::jsonb;
UPDATE public.submissions SET files = jsonb_build_array(jsonb_build_object('path', file_path, 'name', file_name)) WHERE file_path IS NOT NULL AND files = '[]'::jsonb;
COMMENT ON COLUMN public.submissions.file_path IS 'DEPRECATED: replaced by files jsonb array';
COMMENT ON COLUMN public.submissions.file_name IS 'DEPRECATED: replaced by files jsonb array';