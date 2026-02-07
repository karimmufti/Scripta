import { ParsedLine } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { List } from 'lucide-react';

interface ParsedLinesTableProps {
  lines: ParsedLine[];
}

export function ParsedLinesTable({ lines }: ParsedLinesTableProps) {
  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="h-5 w-5 text-primary" />
          Parsed Lines ({lines.length})
        </CardTitle>
        <CardDescription>
          Review the parsed dialogue lines from your script
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-16">#</TableHead>
                <TableHead className="w-32">Character</TableHead>
                <TableHead>Dialogue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.lineIndex} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-muted-foreground">
                    {line.lineIndex + 1}
                  </TableCell>
                  <TableCell className="font-medium text-primary">
                    {line.character}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {line.dialogue}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
