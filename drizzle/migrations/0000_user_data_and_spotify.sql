CREATE TABLE public.user_data (
  user_id uuid PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_data TO authenticated;
GRANT ALL ON public.user_data TO service_role;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own data select" ON public.user_data FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own data insert" ON public.user_data FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own data update" ON public.user_data FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own data delete" ON public.user_data FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Spotify tokens: server-only (service role). No client access.
CREATE TABLE public.spotify_tokens (
  user_id uuid PRIMARY KEY,
  refresh_token text NOT NULL,
  access_token text,
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.spotify_tokens TO service_role;
ALTER TABLE public.spotify_tokens ENABLE ROW LEVEL SECURITY;