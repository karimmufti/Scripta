import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Mail, Rocket, Users } from 'lucide-react';
import { CharacterActorMapping } from '@/lib/types';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CharacterActorAssignmentProps {
  characters: string[];
  onSubmit: (mappings: CharacterActorMapping[]) => void;
  isLoading?: boolean;
}

export function CharacterActorAssignment({ 
  characters, 
  onSubmit, 
  isLoading 
}: CharacterActorAssignmentProps) {
  const [mappings, setMappings] = useState<Record<string, string>>(
    characters.reduce((acc, char) => ({ ...acc, [char]: '' }), {})
  );

  const [emails, setEmails] = useState<Record<string, string>>(
    characters.reduce((acc, char) => ({ ...acc, [char]: '' }), {})
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setEmails((prev) => {
      const next = { ...prev };
      for (const character of characters) {
        if (next[character]?.trim()) continue;
        const stored = window.localStorage.getItem(`tableread_email_${character}`);
        if (stored) next[character] = stored;
      }
      return next;
    });
  }, [characters]);

  const handleActorChange = (character: string, actorName: string) => {
    setMappings(prev => ({ ...prev, [character]: actorName }));
  };

  const handleEmailChange = (character: string, email: string) => {
    setEmails((prev) => ({ ...prev, [character]: email }));
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(`tableread_email_${character}`, email.trim());
    } catch {
      // ignore
    }
  };

  const handleSubmit = () => {
    const formattedMappings: CharacterActorMapping[] = characters.map(character => ({
      character,
      actorName: mappings[character] || character, // Default to character name if empty
    }));
    onSubmit(formattedMappings);
  };

  const allMapped = characters.every(char => mappings[char]?.trim());

  const copyEmailList = async () => {
    const lines = characters
      .map((character) => {
        const actorName = (mappings[character] || character).trim();
        const email = (emails[character] || '').trim();
        return email ? `${actorName} (${character}): ${email}` : `${actorName} (${character}):`;
      })
      .join('\n');

    await navigator.clipboard.writeText(lines);
    toast.success('Copied email list');
  };

  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Assign Actors
        </CardTitle>
        <CardDescription>
          Assign a real actor to each character. They'll receive a unique recording link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          {characters.map((character) => (
            <div key={character} className="flex items-center gap-4">
              <div className="w-32 shrink-0">
                <Label className="text-sm font-medium text-primary">
                  {character}
                </Label>
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder={`Actor name for ${character}`}
                  value={mappings[character]}
                  onChange={(e) => handleActorChange(character, e.target.value)}
                  className="bg-muted/50"
                />
                <Input
                  placeholder="Actor email (optional)"
                  value={emails[character]}
                  onChange={(e) => handleEmailChange(character, e.target.value)}
                  className="bg-muted/50"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1"
            size="lg"
          >
            <Rocket className="mr-2 h-4 w-4" />
            {isLoading ? 'Creating Session...' : 'Create Recording Session'}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg" className="rounded-full">
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  void copyEmailList();
                }}
              >
                Copy email list
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  const body =
                    'Recording links are generated after you create the session.\n\n' +
                    'After creation, open Share Roles to email each actor their unique link.';
                  await navigator.clipboard.writeText(body);
                  toast.success('Copied instructions');
                }}
              >
                Copy instructions
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {!allMapped && (
          <p className="text-xs text-muted-foreground text-center">
            Tip: Leave empty to use character name as actor name
          </p>
        )}
      </CardContent>
    </Card>
  );
}
