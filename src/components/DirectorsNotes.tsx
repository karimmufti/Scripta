import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface DirectorsNotesProps {
  pauseMs: number;
  onPauseMsChange: (pauseMs: number) => void;
  onApplyAndRegenerate: () => void;
  disabled?: boolean;
}

const presets: Array<{ label: string; pauseMs: number }> = [
  { label: 'Tighter', pauseMs: 250 },
  { label: 'Normal', pauseMs: 600 },
  { label: 'Dramatic', pauseMs: 1100 },
];

function closestPreset(value: number) {
  let best = presets[0];
  for (const p of presets) {
    if (Math.abs(p.pauseMs - value) < Math.abs(best.pauseMs - value)) best = p;
  }
  return best;
}

export function DirectorsNotes({ pauseMs, onPauseMsChange, onApplyAndRegenerate, disabled }: DirectorsNotesProps) {
  const preset = closestPreset(pauseMs);

  return (
    <Card className="border-border bg-card/50">
      <CardContent className="p-6 space-y-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold">Director’s Notes</div>
          <div className="text-sm text-muted-foreground">
            Pacing: <span className="text-foreground/90 font-medium">{preset.label}</span>
            <span className="text-muted-foreground"> ({pauseMs}ms pause)</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tighter</span>
            <span>More dramatic</span>
          </div>
          <Slider
            value={[pauseMs]}
            min={250}
            max={1100}
            step={50}
            onValueChange={(v) => onPauseMsChange(v[0] ?? 600)}
          />
        </div>

        <Button onClick={onApplyAndRegenerate} disabled={disabled} className="w-full rounded-full">
          Apply & Regenerate
        </Button>
      </CardContent>
    </Card>
  );
}
