import { Actor } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ActorLinksListProps {
  actors: Actor[];
  sessionId: string;
}

export function ActorLinksList({ actors, sessionId }: ActorLinksListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getActorUrl = (actor: Actor) => {
    return `${window.location.origin}/actor/${sessionId}/${actor.share_token}`;
  };

  const copyToClipboard = async (actor: Actor) => {
    const url = getActorUrl(actor);
    await navigator.clipboard.writeText(url);
    setCopiedId(actor.id);
    toast.success(`Link copied for ${actor.name}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openInNewTab = (actor: Actor) => {
    window.open(getActorUrl(actor), '_blank');
  };

  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5 text-primary" />
          Actor Recording Links
        </CardTitle>
        <CardDescription>
          Share these unique links with your actors. Each link shows only their lines.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {actors.map((actor) => (
          <div key={actor.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {actor.name}
              </span>
              <span className="text-xs text-muted-foreground">
                as {actor.character_name}
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                readOnly
                value={getActorUrl(actor)}
                className="font-mono text-xs bg-muted/50"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(actor)}
              >
                {copiedId === actor.id ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => openInNewTab(actor)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
