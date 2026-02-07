import { useEffect, useMemo, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { Session, Actor, Line } from '@/lib/types';
import { stitchAudio, StitchingProgress, StitchingResult } from '@/lib/audioStitcher';
import { toast } from 'sonner';
import { Copy, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { sessionId, writerToken } = useParams<{ sessionId: string; writerToken: string }>();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<Session | null>(null);
  const [actors, setActors] = useState<Actor[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stitchingProgress, setStitchingProgress] = useState<StitchingProgress | null>(null);
  const [stitchingResult, setStitchingResult] = useState<StitchingResult | null>(null);

  const fetchData = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();
      
      if (sessionError) throw sessionError;
      if (!sessionData) {
        toast.error('Session not found');
        navigate('/');
        return;
      }
      
      // Verify writer token
      if (sessionData.writer_token !== writerToken) {
        toast.error('Invalid access token');
        navigate('/');
        return;
      }
      
      setSession(sessionData as Session);
      
      // Fetch actors
      const { data: actorsData, error: actorsError } = await supabase
        .from('actors')
        .select('*')
        .eq('session_id', sessionId)
        .order('character_name');
      
      if (actorsError) throw actorsError;
      setActors(actorsData || []);
      
      // Fetch lines
      const { data: linesData, error: linesError } = await supabase
        .from('lines')
        .select('*')
        .eq('session_id', sessionId)
        .order('line_index');
      
      if (linesError) throw linesError;
      setLines(linesData || []);
      
    } catch (error) {
      console.error('Failed to fetch session data:', error);
      toast.error('Failed to load session data');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, writerToken, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const recordedLines = lines.filter(l => l.audio_file_path);
  const canGenerate = recordedLines.length > 0;

  const actorCount = actors.length;

  const progressPercent = useMemo(() => {
    if (lines.length <= 0) return 0;
    return Math.round((recordedLines.length / lines.length) * 100);
  }, [lines.length, recordedLines.length]);

  const formattedDate = useMemo(() => {
    if (!session?.created_at) return '';
    const d = new Date(session.created_at);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
  }, [session?.created_at]);

  const actorStatsById = useMemo(() => {
    const stats = new Map<string, { recorded: number; total: number }>();
    for (const actor of actors) {
      stats.set(actor.id, { recorded: 0, total: 0 });
    }
    for (const line of lines) {
      if (!line.actor_id) continue;
      const row = stats.get(line.actor_id);
      if (!row) continue;
      row.total += 1;
      if (line.audio_file_path) row.recorded += 1;
    }
    return stats;
  }, [actors, lines]);

  const copyActorLink = useCallback(async (actor: Actor) => {
    if (!sessionId) return;
    const url = `${window.location.origin}/actor/${sessionId}/${actor.share_token}`;
    await navigator.clipboard.writeText(url);
    toast.success(`Copied link for ${actor.name}`);
  }, [sessionId]);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    
    setIsGenerating(true);
    setStitchingResult(null);
    
    try {
      // Get audio URLs for recorded lines in order
      const audioUrls = lines
        .filter(l => l.audio_file_path)
        .map(l => {
          const { data } = supabase.storage
            .from('recordings')
            .getPublicUrl(l.audio_file_path!);
          return data.publicUrl;
        });
      
      if (audioUrls.length === 0) {
        toast.error('No recorded audio to stitch');
        return;
      }
      
      const result = await stitchAudio(audioUrls, setStitchingProgress, { pauseMs: 600 });
      setStitchingResult(result);
      
      // Update session status
      await supabase
        .from('sessions')
        .update({ status: 'generated' })
        .eq('id', sessionId);
      
      toast.success('Table read generated successfully!');
      
    } catch (error) {
      console.error('Failed to generate table read:', error);
      toast.error('Failed to generate table read. Please try again.');
    } finally {
      setIsGenerating(false);
      setStitchingProgress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070506' }}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[hsl(var(--cinema-accent))] mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const tasksCollectLinesDone = lines.length > 0 && recordedLines.length === lines.length;
  const tasksVerifyTakesDone = tasksCollectLinesDone;
  const tasksReviewFinalDone = session.status === 'generated';

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#070506' }}>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 720px at 20% 15%, rgba(160, 30, 40, 0.28) 0%, rgba(22, 10, 12, 0.92) 52%, rgba(7, 5, 6, 1) 100%), linear-gradient(180deg, rgba(26, 10, 10, 1) 0%, rgba(7, 5, 6, 1) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url('/overlays/grain.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.12,
          mixBlendMode: 'overlay',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 35%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.65) 72%, rgba(0,0,0,0.92) 100%)',
        }}
      />

      <main className="relative z-10 min-h-screen flex items-center justify-center px-4 py-16">
        <Card
          className="card-glow w-full max-w-5xl border border-border/40"
          style={{
            background: 'rgba(16, 14, 15, 0.55)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 30px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.25) inset',
            borderRadius: 22,
          }}
        >
          <CardContent className="p-7 sm:p-10">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground truncate">
                  {session.title || 'Table Read'}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {formattedDate ? `${formattedDate} • ` : ''}
                  {actorCount} actor{actorCount === 1 ? '' : 's'} • {recordedLines.length}/{lines.length} lines
                </div>
              </div>

              <div className="w-40 sm:w-56 shrink-0">
                <Progress value={progressPercent} className="h-1.5 bg-white/10" />
                <div className="mt-2 text-xs text-muted-foreground text-right tabular-nums">{progressPercent}%</div>
              </div>
            </div>

            <div className="mt-9 flex justify-center">
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
                className="h-12 sm:h-14 px-10 sm:px-12 rounded-full bg-[hsl(var(--cinema-accent))] text-background hover:bg-[hsl(var(--cinema-accent))]/90"
              >
                {isGenerating ? <Loader2 className="mr-3 h-4 w-4 animate-spin" /> : null}
                Generate Audio
              </Button>
            </div>

            {isGenerating && stitchingProgress ? (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {stitchingProgress.message}
              </div>
            ) : null}

            <div className="mt-10 space-y-4">
              <Accordion type="single" collapsible className="w-full space-y-4">
                <AccordionItem value="actors" className="border border-border/40 rounded-2xl overflow-hidden bg-background/10">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline">
                    <div className="flex w-full items-center justify-between pr-2">
                      <div className="text-sm font-semibold text-foreground">Actors</div>
                      <div className="text-xs text-muted-foreground">{actorCount}</div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5">
                    <div className="space-y-3">
                      {actors.map((actor) => {
                        const stats = actorStatsById.get(actor.id) ?? { recorded: 0, total: 0 };
                        const initial = (actor.name || actor.character_name || 'A').trim().slice(0, 1).toUpperCase();
                        return (
                          <div
                            key={actor.id}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-border/30 bg-background/10 px-4 py-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                                style={{
                                  background: 'rgba(245, 197, 66, 0.12)',
                                  border: '1px solid rgba(245, 197, 66, 0.18)',
                                  color: 'rgba(245, 197, 66, 0.95)',
                                  fontWeight: 700,
                                }}
                              >
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">{actor.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{actor.character_name}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-xs text-muted-foreground tabular-nums">
                                {stats.recorded}/{stats.total} lines
                              </div>
                              <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => {
                                  void copyActorLink(actor);
                                }}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Link
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tasks" className="border border-border/40 rounded-2xl overflow-hidden bg-background/10">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline">
                    <div className="flex w-full items-center justify-between pr-2">
                      <div className="text-sm font-semibold text-foreground">Tasks</div>
                      <div className="text-xs text-muted-foreground">Optional</div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/30 bg-background/10 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={tasksCollectLinesDone} disabled />
                          <div className="text-sm text-foreground/90">Collect lines</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/30 bg-background/10 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={tasksVerifyTakesDone} disabled />
                          <div className="text-sm text-foreground/90">Verify takes</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/30 bg-background/10 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={tasksReviewFinalDone} disabled />
                          <div className="text-sm text-foreground/90">Review final read</div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
