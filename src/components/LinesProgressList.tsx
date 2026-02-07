import { Line } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { List } from 'lucide-react';

interface LinesProgressListProps {
  lines: Line[];
}

export function LinesProgressList({ lines }: LinesProgressListProps) {
  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="h-5 w-5 text-primary" />
          Recording Progress
        </CardTitle>
        <CardDescription>
          Track which lines have been recorded
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {lines.map((line) => (
            <div 
              key={line.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <span className="text-xs font-mono text-muted-foreground w-6">
                {line.line_index + 1}
              </span>
              <span className="font-medium text-primary text-sm w-24 truncate">
                {line.character_name}
              </span>
              <span className="flex-1 text-sm font-mono truncate">
                "{line.dialogue_text}"
              </span>
              <StatusBadge 
                status={line.audio_file_path ? 'uploaded' : 'pending'} 
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
