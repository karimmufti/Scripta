-- Sessions table: stores each table read session
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  script_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'recording', 'generating', 'generated')),
  result_file_path TEXT,
  writer_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Actors table: each actor in a session
CREATE TABLE public.actors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  character_name TEXT NOT NULL,
  share_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lines table: each line of dialogue in a session
CREATE TABLE public.lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.actors(id) ON DELETE SET NULL,
  line_index INTEGER NOT NULL,
  character_name TEXT NOT NULL,
  dialogue_text TEXT NOT NULL,
  audio_file_path TEXT,
  audio_uploaded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_actors_session_id ON public.actors(session_id);
CREATE INDEX idx_lines_session_id ON public.lines(session_id);
CREATE INDEX idx_lines_actor_id ON public.lines(actor_id);
CREATE INDEX idx_sessions_writer_token ON public.sessions(writer_token);
CREATE INDEX idx_actors_share_token ON public.actors(share_token);

-- Enable RLS but with permissive policies for MVP (no auth required)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lines ENABLE ROW LEVEL SECURITY;

-- Permissive policies for MVP (security by obscurity via tokens)
CREATE POLICY "Sessions are publicly accessible" ON public.sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Actors are publicly accessible" ON public.actors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Lines are publicly accessible" ON public.lines FOR ALL USING (true) WITH CHECK (true);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for sessions updated_at
CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for audio recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('recordings', 'recordings', true);

-- Storage policies for the recordings bucket
CREATE POLICY "Recordings are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'recordings');
CREATE POLICY "Anyone can upload recordings" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'recordings');
CREATE POLICY "Anyone can update recordings" ON storage.objects FOR UPDATE USING (bucket_id = 'recordings');
CREATE POLICY "Anyone can delete recordings" ON storage.objects FOR DELETE USING (bucket_id = 'recordings');