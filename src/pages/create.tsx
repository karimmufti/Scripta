import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TypewriterScene } from '@/components/TypewriterScene';
import { getSampleScript, parseScript, extractCharacters } from '@/lib/scriptParser';
import { ParsedLine, CharacterActorMapping } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ParsedLinesTable } from '@/components/ParsedLinesTable';
import { CharacterActorAssignment } from '@/components/CharacterActorAssignment';
import { Mic } from 'lucide-react';

type Step = 'input' | 'review' | 'assign';

const MAX_CHARS = 56;

function isEditableTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((el as any).isContentEditable) return true;
  return false;
}

// DO NOT CHANGE — sound logic preserved exactly
function playKeySound(kind: 'key' | 'return') {
  const keyFallback = ['/sfx/typerwriter_key1.wav', '/sfx/typerwriter_key2.wav', '/sfx/typerwriter_key3.wav'];
  const preferred = kind === 'return' ? '/sfx/typewriter_return.mp3' : '/sfx/typewriter_key.mp3';
  const fallback = kind === 'return' ? '/sfx/typewriter_return.wav' : keyFallback[Math.floor(Math.random() * keyFallback.length)];

  const audio = new Audio(preferred);
  audio.volume = kind === 'return' ? 0.22 : 0.14;
  audio.onerror = () => {
    audio.onerror = null;
    audio.src = fallback;
    void audio.play().catch(() => {});
  };
  void audio.play().catch(() => {
    audio.src = fallback;
    void audio.play().catch(() => {});
  });
}

// --- Inline styles ---
const fogOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1,
  pointerEvents: 'none',
  background: 'radial-gradient(ellipse at 50% 40%, transparent 25%, rgba(26,10,10,0.40) 55%, rgba(26,10,10,0.75) 80%, #1a0a0a 100%)',
};

const grainOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  pointerEvents: 'none',
  backgroundImage: 'url(/overlays/grain.jpg)',
  backgroundRepeat: 'repeat',
  backgroundSize: '256px 256px',
  opacity: 0.10,
  mixBlendMode: 'overlay',
};

const btnChip = (bg: string, border: string, extra?: React.CSSProperties): React.CSSProperties => ({
  pointerEvents: 'auto',
  fontSize: 13,
  fontWeight: 500,
  color: '#F5F5F7',
  background: bg,
  border: `1px solid ${border}`,
  borderRadius: 999,
  padding: '8px 20px',
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  transition: 'background 0.15s',
  ...extra,
});

const glassPanel: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.55)',
  padding: 24,
};

const glassPanelInner: React.CSSProperties = {
  width: '100%',
  maxWidth: 680,
  borderRadius: 16,
  background: 'rgba(20, 20, 27, 0.80)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(245,245,247,0.08)',
  boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
  padding: 28,
  maxHeight: '80vh',
  overflowY: 'auto' as const,
};

export default function CreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('input');

  const [lines, setLines] = useState<string[]>(['']);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [debug, setDebug] = useState(false);
  const [paperFocused, setPaperFocused] = useState(false);

  const scriptText = useMemo(() => lines.join('\n').replace(/\s+$/g, ''), [lines]);
  const lineCount = useMemo(() => lines.filter((l) => l.trim().length > 0).length, [lines]);

  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const [characters, setCharacters] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Cursor blink
  useEffect(() => {
    const id = window.setInterval(() => setCursorVisible((v) => !v), 500);
    return () => window.clearInterval(id);
  }, []);

  // Keyboard capture
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Debug toggle: backtick key (`)
      if (e.key === '`' && !isEditableTarget(e.target)) {
        e.preventDefault();
        setDebug((v) => !v);
        return;
      }

      if (step !== 'input') return;
      if (!paperFocused) return;
      if (isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;

      if (key === 'Tab') {
        e.preventDefault();
        setLines((prev) => {
          const next = [...prev];
          if (next.length === 0) next.push('');
          const last = next[next.length - 1] ?? '';
          next[next.length - 1] = (last + '  ').slice(0, MAX_CHARS);
          return next;
        });
        playKeySound('key');
        return;
      }

      if (key === 'Enter') {
        e.preventDefault();
        setLines((prev) => [...prev, '']);
        playKeySound('return');
        return;
      }

      if (key === 'Backspace') {
        e.preventDefault();
        setLines((prev) => {
          const next = [...prev];
          if (next.length === 0) return [''];

          const lastIdx = next.length - 1;
          const last = next[lastIdx] ?? '';

          if (last.length > 0) {
            next[lastIdx] = last.slice(0, -1);
            return next;
          }

          if (next.length > 1) {
            next.pop();
            return next;
          }

          return [''];
        });
        playKeySound('key');
        return;
      }

      if (key.length === 1) {
        // printable
        e.preventDefault();
        setLines((prev) => {
          const next = [...prev];
          if (next.length === 0) next.push('');

          const lastIdx = next.length - 1;
          const last = next[lastIdx] ?? '';

          if (last.length >= MAX_CHARS) {
            next.push(key);
            return next;
          }

          next[lastIdx] = last + key;
          return next;
        });
        playKeySound('key');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, paperFocused]);

  const handleLoadSample = () => {
    const sample = getSampleScript();
    setLines(sample.split('\n'));
    setPaperFocused(true);
    toast.success('Loaded sample script');
  };

  const handleParse = () => {
    const parsed = parseScript(scriptText);
    if (parsed.length === 0) {
      toast.error('No dialogue lines found. Format each line as: CHARACTER: dialogue');
      return;
    }

    const chars = extractCharacters(parsed);
    setParsedLines(parsed);
    setCharacters(chars);
    setStep('review');
    toast.success(`Parsed ${parsed.length} lines from ${chars.length} characters`);
  };

  const handleCreateSession = async (mappings: CharacterActorMapping[]) => {
    setIsCreating(true);

    try {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          title: `Table Read - ${new Date().toLocaleDateString()}`,
          script_text: scriptText,
          status: 'recording',
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      const actorPromises = mappings.map((mapping) =>
        supabase
          .from('actors')
          .insert({
            session_id: session.id,
            name: mapping.actorName || mapping.character,
            character_name: mapping.character,
          })
          .select()
          .single(),
      );

      const actorResults = await Promise.all(actorPromises);
      const actors = actorResults.map((r) => {
        if (r.error) throw r.error;
        return r.data;
      });

      const actorByCharacter = new Map(actors.map((a) => [a.character_name, a]));

      const lineInserts = parsedLines.map((line) => ({
        session_id: session.id,
        actor_id: actorByCharacter.get(line.character)?.id || null,
        line_index: line.lineIndex,
        character_name: line.character,
        dialogue_text: line.dialogue,
      }));

      const { error: linesError } = await supabase.from('lines').insert(lineInserts);
      if (linesError) throw linesError;

      toast.success('Session created! Redirecting to dashboard…');
      navigate(`/dashboard/${session.id}/${session.writer_token}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('Failed to create session. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="cinema-root"
      onClick={() => { if (step === 'input' && !paperFocused) setPaperFocused(true); }}
    >
      {/* CSS fog: fades edges to background color */}
      <div style={fogOverlay} />
      {/* Film grain overlay */}
      <div style={grainOverlay} />

      {/* ====== STEP 1: Normal document flow — text, then canvas, then buttons ====== */}
      {step === 'input' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px 60px' }}>

          {/* Header text block */}
          <div style={{ textAlign: 'center', maxWidth: 720, width: '100%' }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'rgba(245,245,247,0.70)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 10,
              }}
            >
              <Mic size={15} color="#F5C542" />
              TableRead.io
            </div>

            <div style={{ fontSize: 40, fontWeight: 900, color: '#F5F5F7', letterSpacing: '-1.2px', lineHeight: 1.05 }}>
              Async <span style={{ color: '#F5C542' }}>Table Reads</span> for
              <br />
              Screenwriters
            </div>

            <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(245,245,247,0.60)', marginTop: 12, lineHeight: 1.55 }}>
              Upload your script, assign actors, and let them record their lines remotely.
              <br />
              We stitch everything together into one cohesive table read.
            </div>

            <div style={{ fontWeight: 800, fontSize: 20, color: '#F5F5F7', letterSpacing: '-0.3px', marginTop: 28 }}>
              Create a New Table Read
            </div>

            <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(245,245,247,0.48)', marginTop: 6 }}>
              Write your scene and we'll parse it into individual lines for recording.
            </div>
          </div>

          {/* Spacer between text and typewriter */}
          <div style={{ height: 32 }} />

          {/* 3D typewriter canvas — large, in document flow */}
          <div style={{ width: '100%', maxWidth: 900, height: '70vh', minHeight: 500 }}>
            <TypewriterScene lines={lines} cursorVisible={cursorVisible} debug={debug} />
          </div>

          {/* Buttons below the typewriter */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 28 }}>
            <div
              style={{
                display: 'flex',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 999,
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <button
                onClick={handleLoadSample}
                style={btnChip('rgba(20,20,27,0.45)', 'rgba(255,255,255,0.14)', { padding: '10px 22px' })}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(20,20,27,0.62)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(20,20,27,0.45)')}
              >
                Load Sample Script
              </button>
              <button
                onClick={handleParse}
                disabled={!scriptText.trim()}
                style={btnChip('rgba(245, 196, 77, 0.92)', 'rgba(245, 196, 77, 0.55)', {
                  fontWeight: 750,
                  padding: '10px 26px',
                  color: '#120A08',
                  opacity: scriptText.trim() ? 1 : 0.45,
                  cursor: scriptText.trim() ? 'pointer' : 'default',
                })}
                onMouseEnter={(e) => scriptText.trim() && (e.currentTarget.style.background = 'rgba(245, 196, 77, 1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(245, 196, 77, 0.92)')}
              >
                Parse Script
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'rgba(245,245,247,0.28)', letterSpacing: '0.28px' }}>
              {!paperFocused ? 'Click anywhere to start typing' : 'Enter = new line · Backspace to delete'}
            </div>
          </div>
        </div>
      )}

      {/* ====== STEPS 2 & 3: Glass overlay panels ====== */}
      {step !== 'input' && (
        <div style={glassPanel}>
          <div style={glassPanelInner}>
            {step === 'review' && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 22, fontWeight: 650, color: '#F5F5F7' }}>Review Parsed Lines</div>
                  <div style={{ fontSize: 14, color: '#A1A1AA', marginTop: 6 }}>
                    Check that your script was parsed correctly before assigning actors.
                  </div>
                </div>

                <ParsedLinesTable lines={parsedLines} />

                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <Button variant="outline" className="rounded-full" onClick={() => setStep('input')}>
                    ← Back
                  </Button>
                  <Button
                    className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => setStep('assign')}
                  >
                    Continue to Actor Assignment →
                  </Button>
                </div>
              </>
            )}

            {step === 'assign' && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 22, fontWeight: 650, color: '#F5F5F7' }}>Assign Actors</div>
                  <div style={{ fontSize: 14, color: '#A1A1AA', marginTop: 6 }}>
                    Assign a real person to record each character's lines.
                  </div>
                </div>

                <CharacterActorAssignment
                  characters={characters}
                  onSubmit={handleCreateSession}
                  isLoading={isCreating}
                />

                <div style={{ marginTop: 16 }}>
                  <Button variant="outline" className="rounded-full" onClick={() => setStep('review')}>
                    ← Back to review
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
