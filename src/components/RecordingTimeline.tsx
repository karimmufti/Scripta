import { useMemo } from 'react';
import { Line } from '@/lib/types';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';

interface RecordingTimelineProps {
  lines: Line[];
  selectedLineId: string | null;
  onSelectLine: (line: Line) => void;
  durationSecondsByLineId: Record<string, number | undefined>;
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function RecordingTimeline({
  lines,
  selectedLineId,
  onSelectLine,
  durationSecondsByLineId,
}: RecordingTimelineProps) {
  const waveformHeights = useMemo(() => [0.25, 0.55, 0.35, 0.8, 0.45, 0.7, 0.3, 0.6, 0.4, 0.9, 0.5, 0.65], []);

  return (
    <div className="space-y-2">
      {lines.map((line) => {
        const isUploaded = Boolean(line.audio_file_path);
        const duration = durationSecondsByLineId[line.id];
        const isSelected = line.id === selectedLineId;

        return (
          <button
            key={line.id}
            type="button"
            onClick={() => onSelectLine(line)}
            className={cn(
              'w-full text-left rounded-2xl border border-border bg-card/40 px-4 py-3 transition-colors',
              'hover:bg-card/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isSelected && 'bg-card/80 ring-1 ring-[hsl(var(--cinema-accent))]/30',
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 shrink-0 text-xs font-mono text-muted-foreground">
                {String(line.line_index + 1).padStart(2, '0')}
              </div>

              <Badge
                variant="secondary"
                className="shrink-0 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] tracking-wide text-foreground"
              >
                {line.character_name.toUpperCase()}
              </Badge>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-foreground/90">
                  {line.dialogue_text}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-3">
                {isUploaded && (
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="flex items-end gap-0.5 h-4">
                      {waveformHeights.map((h, idx) => (
                        <span
                          key={idx}
                          className="w-0.5 rounded-full bg-muted-foreground/40"
                          style={{ height: `${Math.max(2, Math.round(h * 16))}px` }}
                        />
                      ))}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground w-[44px] text-right">
                      {typeof duration === 'number' ? formatDuration(duration) : '–:–'}
                    </div>
                  </div>
                )}

                <StatusBadge status={isUploaded ? 'uploaded' : 'pending'} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
