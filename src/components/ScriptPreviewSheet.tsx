import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface ScriptPreviewSheetProps {
  scriptText: string;
}

export function ScriptPreviewSheet({ scriptText }: ScriptPreviewSheetProps) {
  const preview = scriptText.split('\n').slice(0, 6).join('\n');
  const hasMore = scriptText.split('\n').length > 6;

  return (
    <Sheet>
      <Card className="border-border bg-card/50">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[hsl(var(--cinema-accent))]" />
                <h2 className="text-lg font-semibold">Script Preview</h2>
              </div>
              <p className="text-sm text-muted-foreground">Collapsed by default. Open when you need context.</p>
            </div>
            <SheetTrigger asChild>
              <Button variant="outline" className="rounded-full">Open</Button>
            </SheetTrigger>
          </div>

          <pre className="font-mono text-xs whitespace-pre-wrap text-muted-foreground rounded-2xl border border-border bg-background/20 p-4">
            {preview}
            {hasMore ? '\n…' : ''}
          </pre>
        </CardContent>
      </Card>

      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Script</SheetTitle>
          <SheetDescription>Full script text for reference.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 h-[calc(100vh-10rem)] overflow-y-auto rounded-2xl border border-border bg-background/20 p-4">
          <pre className="font-mono text-sm whitespace-pre-wrap text-foreground/90">{scriptText}</pre>
        </div>
      </SheetContent>
    </Sheet>
  );
}
