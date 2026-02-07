import { Line } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusBadge } from '@/components/StatusBadge';
import { Play, RotateCcw } from 'lucide-react';

interface LineDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: Line | null;
  audioUrl: string | null;
  durationLabel?: string;
}

export function LineDetailsSheet({ open, onOpenChange, line, audioUrl, durationLabel }: LineDetailsSheetProps) {
  const isUploaded = Boolean(line?.audio_file_path);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Take Details</SheetTitle>
          <SheetDescription>
            {line ? `Line ${line.line_index + 1}` : 'Select a line to view details.'}
          </SheetDescription>
        </SheetHeader>

        {!line ? null : (
          <div className="mt-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="secondary" className="rounded-full border border-border bg-secondary/60">
                  {line.character_name.toUpperCase()}
                </Badge>
                <StatusBadge status={isUploaded ? 'uploaded' : 'pending'} />
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {isUploaded ? (durationLabel ?? '–:–') : 'Not recorded'}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/50 p-4">
              <div className="text-sm font-mono text-foreground/90 whitespace-pre-wrap break-words">
                {line.dialogue_text}
              </div>
            </div>

            {audioUrl && isUploaded && (
              <div className="space-y-3">
                <div className="text-sm font-semibold">Playback</div>
                <audio controls src={audioUrl} className="w-full" />
              </div>
            )}

            <div className="space-y-2">
              <div className="text-sm font-semibold">Actions</div>
              <div className="grid grid-cols-2 gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" disabled className="rounded-full">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Re-record
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" disabled className="rounded-full">
                      <Play className="mr-2 h-4 w-4" />
                      Replace
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
