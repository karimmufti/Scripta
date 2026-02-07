import { useEffect, useMemo, useState } from 'react';
import { Actor } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, ExternalLink, Link2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ShareRolesPanelProps {
  actors: Actor[];
  sessionId: string;
  sessionTitle?: string;
}

function truncateMiddle(s: string, head = 28, tail = 18) {
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export function ShareRolesPanel({ actors, sessionId, sessionTitle }: ShareRolesPanelProps) {
  const [copiedActorId, setCopiedActorId] = useState<string | null>(null);
  const [emailByActorId, setEmailByActorId] = useState<Record<string, string>>({});

  const actorRows = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return actors.map((actor) => {
      const url = `${origin}/actor/${sessionId}/${actor.share_token}`;
      return { actor, url };
    });
  }, [actors, sessionId]);

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const copyActor = async (actorId: string, url: string, name: string) => {
    await copyText(url);
    setCopiedActorId(actorId);
    toast.success(`Copied link for ${name}`);
    window.setTimeout(() => setCopiedActorId(null), 1200);
  };

  const copyAll = async () => {
    const joined = actorRows
      .map(({ actor, url }) => `${actor.name} (${actor.character_name}): ${url}`)
      .join('\n');

    await copyText(joined);
    toast.success('Copied all links');
  };

  const getInviteSubject = (sessionTitle?: string) => {
    const title = sessionTitle?.trim() ? sessionTitle.trim() : 'Table Read';
    return `${title} — recording link`;
  };

  const getInviteBody = (params: { actorName: string; characterName: string; url: string }) => {
    return [
      `Hi ${params.actorName},`,
      '',
      `Here is your TableRead.io recording link for ${params.characterName}:`,
      params.url,
      '',
      'Open the link to record your lines. You can re-record as many times as you want.',
      '',
      'Thanks!',
    ].join('\n');
  };

  const openMailto = (to: string, subject: string, body: string) => {
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setEmailByActorId((prev) => {
        const next = { ...prev };
        for (const actor of actors) {
          if (next[actor.id]?.trim()) continue;
          const key = `tableread_email_${actor.character_name}`;
          const stored = window.localStorage.getItem(key);
          if (!stored) continue;
          next[actor.id] = stored;
        }
        return next;
      });
    } catch {
      // ignore
    }
  }, [actors]);

  return (
    <Card className="border-border bg-card/50">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-[hsl(var(--cinema-accent))]" />
              <h2 className="text-lg font-semibold">Share Roles</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Copy links for each actor. Each link only shows their lines.
            </p>
          </div>

          <Button variant="outline" onClick={copyAll} className="shrink-0 rounded-full">
            <Copy className="mr-2 h-4 w-4" />
            Copy all
          </Button>
        </div>

        <div className="space-y-2">
          {actorRows.map(({ actor, url }) => (
            <div
              key={actor.id}
              className={cn(
                'group rounded-2xl border border-border bg-background/20 px-4 py-3',
                'transition-colors hover:bg-background/30',
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="min-w-0 truncate text-sm font-medium text-foreground">
                      {actor.name}
                    </div>
                    <Badge
                      variant="secondary"
                      className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] tracking-wide"
                    >
                      {actor.character_name.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground truncate">
                    {truncateMiddle(url)}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="rounded-full">
                        <Mail className="mr-2 h-4 w-4" />
                        Email
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={async () => {
                          const existing = emailByActorId[actor.id]?.trim();
                          const next = window.prompt('Recipient email address', existing ?? '');
                          if (typeof next !== 'string') return;
                          const trimmed = next.trim();
                          setEmailByActorId((prev) => ({ ...prev, [actor.id]: trimmed }));
                          try {
                            window.localStorage.setItem(`tableread_email_${actor.character_name}`, trimmed);
                          } catch {
                            // ignore
                          }
                        }}
                      >
                        Set recipient email…
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={async () => {
                          const subject = getInviteSubject(sessionTitle);
                          const body = getInviteBody({ actorName: actor.name, characterName: actor.character_name, url });
                          await copyText(`Subject: ${subject}\n\n${body}`);
                          toast.success(`Copied email template for ${actor.name}`);
                        }}
                      >
                        Copy email template
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const existing = emailByActorId[actor.id]?.trim();
                          const to = existing || window.prompt('Recipient email address', '') || '';
                          if (!to.trim()) return;
                          const trimmed = to.trim();
                          setEmailByActorId((prev) => ({ ...prev, [actor.id]: trimmed }));
                          try {
                            window.localStorage.setItem(`tableread_email_${actor.character_name}`, trimmed);
                          } catch {
                            // ignore
                          }

                          const subject = getInviteSubject(sessionTitle);
                          const body = getInviteBody({ actorName: actor.name, characterName: actor.character_name, url });
                          openMailto(trimmed, subject, body);
                        }}
                      >
                        Open email draft…
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    onClick={() => copyActor(actor.id, url, actor.name)}
                    className="rounded-full"
                    variant={copiedActorId === actor.id ? 'default' : 'outline'}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => window.open(url, '_blank')}
                    aria-label="Open"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
