import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { StitchingProgress, StitchingResult } from '@/lib/audioStitcher';
import { Download, Headphones, Loader2, MoreVertical, Pause, Play } from 'lucide-react';

interface FinalTableReadHeroProps {
  title?: string;
  result: StitchingResult | null;
  isGenerating: boolean;
  progress: StitchingProgress | null;
  canGenerate: boolean;
  missingCount: number;
  onGenerate: () => void;
  onDownload: () => void;
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function progressPercent(progress: StitchingProgress | null) {
  if (!progress) return 0;
  return Math.round((progress.current / Math.max(progress.total, 1)) * 100);
}

export function FinalTableReadHero({
  title = 'Final Table Read',
  result,
  isGenerating,
  progress,
  canGenerate,
  missingCount,
  onGenerate,
  onDownload,
}: FinalTableReadHeroProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      void audioRef.current.play();
    }
  };

  const readinessText = result
    ? `Ready • ${formatDuration(result.durationSeconds)}`
    : missingCount > 0
      ? `Waiting on ${missingCount} line${missingCount === 1 ? '' : 's'}`
      : 'Ready to generate';

  return (
    <Card className="border-border bg-card/60 shadow-lg">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-[hsl(var(--cinema-accent))]" />
              <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{readinessText}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onGenerate} disabled={!canGenerate || isGenerating}>
                Regenerate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isGenerating && progress && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--cinema-accent))]" />
              <span className="text-muted-foreground">{progress.message}</span>
            </div>
            <Progress value={progressPercent(progress)} className="h-2" />
          </div>
        )}

        <div className={cn('rounded-2xl border border-border bg-background/20 p-4', !result && 'opacity-90')}>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => {
                if (!result) {
                  onGenerate();
                  return;
                }
                togglePlay();
              }}
              disabled={isGenerating || (!result && !canGenerate)}
              className={cn(
                'h-14 w-14 rounded-full',
                'bg-[hsl(var(--cinema-accent))] text-background hover:bg-[hsl(var(--cinema-accent))]/90',
              )}
              size="icon"
              aria-label={result ? (isPlaying ? 'Pause' : 'Play') : 'Generate'}
            >
              {result ? (isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />) : <Play className="h-5 w-5 ml-0.5" />}
            </Button>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground/90">
                {result ? 'Playback' : 'Generate a stitched table read'}
              </div>
              <div className="text-xs text-muted-foreground">
                {result
                  ? 'Listen, then download or adjust pacing.'
                  : canGenerate
                    ? 'Uses recorded takes in order with cinematic pacing.'
                    : 'Upload at least one take to generate.'}
              </div>
            </div>

            <Button
              onClick={onDownload}
              variant="outline"
              disabled={!result || isGenerating}
              className="rounded-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>

          {result && (
            <audio
              ref={audioRef}
              src={result.url}
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
