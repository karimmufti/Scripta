import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { ProgressBar } from '@/components/ProgressBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { Line, LineWithContext, Actor } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Mic, Pause, Play, RotateCcw, Square, Upload, User } from 'lucide-react';

export default function ActorPage() {
  const { sessionId, actorToken } = useParams<{ sessionId: string; actorToken: string }>();
  
  const [actor, setActor] = useState<Actor | null>(null);
  const [lines, setLines] = useState<LineWithContext[]>([]);
  const [allLines, setAllLines] = useState<Line[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedLineIds, setUploadedLineIds] = useState<Set<string>>(new Set());
  const [activeActorLineId, setActiveActorLineId] = useState<string | null>(null);
  const [narrationLineId, setNarrationLineId] = useState<string | null>(null);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const lineNodeByIdRef = useRef<Record<string, HTMLDivElement | null>>({});
  const narrationRunIdRef = useRef(0);
  const narrationVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const {
    isRecording,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    clearRecording,
    error,
  } = useAudioRecorder();

  const fetchData = useCallback(async () => {
    if (!sessionId || !actorToken) return;
    
    try {
      // Find actor by share token
      const { data: actorData, error: actorError } = await supabase
        .from('actors')
        .select('*')
        .eq('session_id', sessionId)
        .eq('share_token', actorToken)
        .maybeSingle();
      
      if (actorError) throw actorError;
      if (!actorData) {
        toast.error('Invalid actor link');
        return;
      }
      
      setActor(actorData);
      
      // Fetch ALL lines for context
      const { data: allLinesData, error: allLinesError } = await supabase
        .from('lines')
        .select('*')
        .eq('session_id', sessionId)
        .order('line_index');
      
      if (allLinesError) throw allLinesError;
      setAllLines(allLinesData || []);
      
      // Filter to this actor's lines and add context
      const actorLines = allLinesData?.filter(l => l.actor_id === actorData.id) || [];
      
      const linesWithContext: LineWithContext[] = actorLines.map(line => {
        const prevLine = allLinesData?.find(l => l.line_index === line.line_index - 1);
        return {
          ...line,
          previousLine: prevLine ? {
            character_name: prevLine.character_name,
            dialogue_text: prevLine.dialogue_text,
          } : undefined,
        };
      });
      
      setLines(linesWithContext);
      
      // Track which lines are already uploaded
      const uploaded = new Set(
        actorLines.filter(l => l.audio_file_path).map(l => l.id)
      );
      setUploadedLineIds(uploaded);
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load recording session');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, actorToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const actorLineIdsInOrder = useMemo(() => lines.map(l => l.id), [lines]);

  const activeActorLine = useMemo(() => {
    if (!activeActorLineId) return null;
    return lines.find(l => l.id === activeActorLineId) || null;
  }, [activeActorLineId, lines]);

  const activeActorLineIndex = useMemo(() => {
    if (!activeActorLineId) return -1;
    return actorLineIdsInOrder.indexOf(activeActorLineId);
  }, [activeActorLineId, actorLineIdsInOrder]);

  const ensureActiveLine = useCallback(() => {
    if (!lines.length) {
      setActiveActorLineId(null);
      return;
    }

    if (activeActorLineId && actorLineIdsInOrder.includes(activeActorLineId)) {
      return;
    }

    const firstUnuploaded = lines.find(l => !uploadedLineIds.has(l.id));
    setActiveActorLineId(firstUnuploaded?.id || lines[0].id);
  }, [activeActorLineId, actorLineIdsInOrder, lines, uploadedLineIds]);

  useEffect(() => {
    ensureActiveLine();
  }, [ensureActiveLine]);

  const cancelNarration = useCallback(() => {
    narrationRunIdRef.current += 1;
    setIsNarrating(false);
    setNarrationLineId(null);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const advanceToNextUnuploaded = useCallback(() => {
    if (!lines.length) return;

    cancelNarration();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    clearRecording();
    setIsPlaying(false);

    const startIndex = Math.max(0, activeActorLineIndex + 1);
    const next = lines.slice(startIndex).find(l => !uploadedLineIds.has(l.id));
    if (next) {
      setActiveActorLineId(next.id);
      return;
    }

    const wrap = lines.find(l => !uploadedLineIds.has(l.id));
    if (wrap) {
      setActiveActorLineId(wrap.id);
    }
  }, [activeActorLineIndex, clearRecording, lines, uploadedLineIds]);

  const focusLineId = narrationLineId ?? activeActorLineId;

  useEffect(() => {
    if (!focusLineId) return;
    const node = lineNodeByIdRef.current[focusLineId];
    if (!node) return;
    node.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focusLineId]);

  useEffect(() => {
    return () => {
      cancelNarration();
    };
  }, [cancelNarration]);

  const speakUtterance = useCallback(async (text: string, runId: number) => {
    if (runId !== narrationRunIdRef.current) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = async (): Promise<SpeechSynthesisVoice[]> => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) return voices;

      await new Promise<void>((resolve) => {
        let settled = false;
        const timeoutId = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          resolve();
        }, 600);

        const onVoicesChanged = () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeoutId);
          resolve();
        };

        window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged, { once: true });
      });

      return window.speechSynthesis.getVoices();
    };

    const pickVoice = (voices: SpeechSynthesisVoice[]) => {
      if (narrationVoiceRef.current) return narrationVoiceRef.current;

      const normalize = (s: string) => s.toLowerCase();
      const scored = voices.map((v) => {
        const name = normalize(v.name || '');
        const lang = normalize(v.lang || '');
        let score = 0;

        if (v.localService) score += 2;
        if (lang.startsWith('en')) score += 2;
        if (lang.includes('en-us')) score += 2;

        if (name.includes('natural') || name.includes('neural') || name.includes('enhanced')) score += 6;
        if (name.includes('google')) score += 5;
        if (name.includes('samantha') || name.includes('alex') || name.includes('daniel')) score += 5;
        if (name.includes('aria') || name.includes('jenny')) score += 4;

        if (name.includes('novelty') || name.includes('robot')) score -= 10;
        if (name.includes('microsoft david')) score -= 2;

        return { v, score };
      });

      scored.sort((a, b) => b.score - a.score);
      narrationVoiceRef.current = scored[0]?.v ?? null;
      return narrationVoiceRef.current;
    };

    const voices = await loadVoices();
    const voice = pickVoice(voices);

    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }

      // Slightly slower + neutral pitch reads less robotic on most systems
      utterance.rate = 0.98;
      utterance.pitch = 1.0;
      utterance.volume = 1;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const narrateBetweenLinePositions = useCallback(async (fromPos: number, toPos: number, runId: number) => {
    if (runId !== narrationRunIdRef.current) return;
    if (fromPos < 0 || toPos < 0) return;
    if (toPos <= fromPos + 1) return;

    const between = allLines.slice(fromPos + 1, toPos);
    const nonActorLines = between.filter(l => l.actor_id !== actor?.id);
    if (nonActorLines.length === 0) return;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsNarrating(true);
    for (const line of nonActorLines) {
      if (runId !== narrationRunIdRef.current) return;
      setNarrationLineId(line.id);
      // Comma cadence tends to sound more conversational than a hard stop after the name.
      await speakUtterance(line.dialogue_text, runId);
    }
    if (runId !== narrationRunIdRef.current) return;

    setNarrationLineId(null);
    setIsNarrating(false);
  }, [actor?.id, allLines, speakUtterance]);

  const handleUpload = async (lineId: string, blob: Blob) => {
    try {
      const contentType = blob.type || 'audio/webm';
      const ext = contentType.includes('mp4') ? 'mp4' : contentType.includes('ogg') ? 'ogg' : 'webm';

      // Generate unique filename
      const fileName = `${sessionId}/${lineId}-${Date.now()}.${ext}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(fileName, blob, {
          contentType,
          upsert: true,
        });
      
      if (uploadError) throw uploadError;
      
      // Update line record
      const { error: updateError } = await supabase
        .from('lines')
        .update({
          audio_file_path: fileName,
          audio_uploaded_at: new Date().toISOString(),
        })
        .eq('id', lineId);
      
      if (updateError) throw updateError;
      
      // Update local state
      setUploadedLineIds(prev => new Set([...prev, lineId]));
      toast.success('Recording uploaded!');
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed. Please try again.');
      throw error;
    }
  };

  const handleUploadActiveLine = useCallback(async () => {
    if (!activeActorLineId || !audioBlob) return;
    if (!sessionId) return;

    cancelNarration();
    setIsUploading(true);
    try {
      await handleUpload(activeActorLineId, audioBlob);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      clearRecording();
      setIsPlaying(false);

      if (!actor) {
        advanceToNextUnuploaded();
        return;
      }

      const uploadedNow = new Set([...uploadedLineIds, activeActorLineId]);
      const currentPos = allLines.findIndex(l => l.id === activeActorLineId);
      const nextActorLine = allLines.find(l => l.actor_id === actor.id && l.line_index > (activeActorLine?.line_index ?? -1) && !uploadedNow.has(l.id));

      if (!nextActorLine) {
        advanceToNextUnuploaded();
        return;
      }

      setActiveActorLineId(nextActorLine.id);

      const nextPos = allLines.findIndex(l => l.id === nextActorLine.id);
      const runId = narrationRunIdRef.current;
      await narrateBetweenLinePositions(currentPos, nextPos, runId);
    } finally {
      setIsUploading(false);
    }
  }, [activeActorLine, activeActorLineId, actor, advanceToNextUnuploaded, audioBlob, allLines, cancelNarration, clearRecording, handleUpload, narrateBetweenLinePositions, sessionId, uploadedLineIds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;

      if (e.key === ' ') {
        e.preventDefault();
        if (!activeActorLineId) return;
        if (uploadedLineIds.has(activeActorLineId)) return;
        if (isRecording) {
          stopRecording();
        } else {
          if (isNarrating) {
            cancelNarration();
          }
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          if (audioBlob) {
            clearRecording();
            setIsPlaying(false);
          }
          startRecording();
        }
      }

      if (e.key === 'Enter') {
        if (!activeActorLineId) return;
        if (!audioBlob || isRecording) return;
        void handleUploadActiveLine();
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        advanceToNextUnuploaded();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeActorLineId, advanceToNextUnuploaded, audioBlob, cancelNarration, handleUploadActiveLine, isNarrating, isRecording, startRecording, stopRecording, uploadedLineIds]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      void audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const recordedCount = uploadedLineIds.size;
  const totalCount = lines.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading your lines...</p>
        </div>
      </div>
    );
  }

  if (!actor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Invalid Link</h1>
          <p className="text-muted-foreground">This recording link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-primary" />
            <span className="font-medium">{actor.name}</span>
            <span className="text-muted-foreground">as {actor.character_name}</span>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="animate-fade-in space-y-6">
          <div className="mx-auto w-full max-w-5xl">
            <ProgressBar value={recordedCount} max={totalCount} />
          </div>

          <Card className="mx-auto w-full max-w-5xl overflow-hidden shadow-lg">
            <CardContent className="p-0">
              <div className="relative h-[72vh] bg-card">
                {allLines.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No script lines found.
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="px-6 py-10 space-y-3">
                      {allLines.map((line) => {
                        const isActorLine = line.actor_id === actor.id;
                        const isActive = line.id === focusLineId;
                        const isUploaded = uploadedLineIds.has(line.id);

                        return (
                          <div
                            key={line.id}
                            ref={(node) => {
                              lineNodeByIdRef.current[line.id] = node;
                            }}
                            onClick={() => {
                              if (!isActorLine) return;
                              if (isRecording || isUploading) return;
                              if (isUploaded) return;

                              cancelNarration();

                              if (audioRef.current) {
                                audioRef.current.pause();
                                audioRef.current.currentTime = 0;
                              }
                              clearRecording();
                              setIsPlaying(false);
                              setActiveActorLineId(line.id);
                            }}
                            className={cn(
                              'rounded-md px-3 py-2 transition-all duration-300 ease-out',
                              isActive ? 'bg-accent/40' : 'bg-transparent',
                              isActorLine && !isUploaded && 'cursor-pointer hover:bg-accent/20',
                              !isActive && 'opacity-60',
                              isUploaded && 'opacity-35',
                            )}
                          >
                            <div className={cn('text-xs font-medium tracking-wide', isActive ? 'text-foreground/80' : 'text-muted-foreground')}>
                              {line.character_name}
                            </div>
                            <div
                              className={cn(
                                'mt-1 font-mono leading-relaxed break-words transition-all duration-300 ease-out',
                                isActive ? 'text-2xl font-semibold text-foreground' : 'text-lg font-normal text-muted-foreground',
                              )}
                            >
                              {line.dialogue_text}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}

                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-sm">
                  <div className="px-6 py-4">
                    {/* Error display */}
                    {error && (
                      <div className="mb-3 text-sm text-destructive">{error}</div>
                    )}

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                      <div className="text-xs text-muted-foreground justify-self-start">
                        {isNarrating ? 'Robot reading…' : null}
                        {isNarrating ? <span className="mx-2">•</span> : null}
                        {totalCount > 0 && activeActorLine
                          ? `Line ${activeActorLineIndex + 1} of ${totalCount}`
                          : totalCount === 0
                            ? 'No lines assigned.'
                            : 'Select a line.'}
                      </div>

                      <div className="flex items-center justify-center gap-3">
                        {audioBlob && !isRecording && (
                          <Button onClick={handlePlayPause} variant="ghost" size="icon" className="h-10 w-10 rounded-full" aria-label="Play/Pause">
                            {isPlaying ? <Pause /> : <Play />}
                          </Button>
                        )}

                        <Button
                          onClick={async () => {
                            if (!activeActorLineId) return;
                            if (uploadedLineIds.has(activeActorLineId)) return;

                            if (isRecording) {
                              stopRecording();
                              return;
                            }

                            if (isNarrating) {
                              cancelNarration();
                            }

                            if (audioRef.current) {
                              audioRef.current.pause();
                              audioRef.current.currentTime = 0;
                            }

                            if (audioBlob) {
                              clearRecording();
                              setIsPlaying(false);
                            }

                            await startRecording();
                          }}
                          disabled={!activeActorLineId || isUploading}
                          className={cn(
                            'h-14 w-14 rounded-full text-white',
                            isRecording ? 'bg-red-600 hover:bg-red-700 recording-pulse' : 'bg-red-500 hover:bg-red-600',
                          )}
                          size="icon"
                          aria-label={isRecording ? 'Stop recording' : 'Record'}
                        >
                          {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </Button>

                        {audioBlob && !isRecording && (
                          <>
                            <Button
                              onClick={() => {
                                if (audioRef.current) {
                                  audioRef.current.pause();
                                  audioRef.current.currentTime = 0;
                                }
                                clearRecording();
                                setIsPlaying(false);
                              }}
                              variant="ghost"
                              className="h-10 rounded-full"
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Repeat
                            </Button>
                            <Button
                              onClick={handleUploadActiveLine}
                              disabled={isUploading || !activeActorLineId}
                              className="h-10 rounded-full"
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {isUploading ? 'Sending...' : 'Send'}
                            </Button>
                          </>
                        )}
                      </div>

                      <Button
                        onClick={advanceToNextUnuploaded}
                        variant="ghost"
                        disabled={!activeActorLineId || isRecording}
                        className="h-10 justify-self-end"
                      >
                        Next
                      </Button>
                    </div>

                    {/* Hidden audio element for playback */}
                    {audioUrl && (
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
