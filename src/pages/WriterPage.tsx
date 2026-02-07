import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { ScriptInput } from '@/components/ScriptInput';
import { ParsedLinesTable } from '@/components/ParsedLinesTable';
import { CharacterActorAssignment } from '@/components/CharacterActorAssignment';
import { parseScript, extractCharacters } from '@/lib/scriptParser';
import { ParsedLine, CharacterActorMapping } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Step = 'input' | 'review' | 'assign';

export default function WriterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('input');
  const [scriptText, setScriptText] = useState('');
  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const [characters, setCharacters] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleScriptSubmit = (script: string) => {
    const lines = parseScript(script);
    
    if (lines.length === 0) {
      toast.error('No dialogue lines found. Make sure each line follows the format: CHARACTER: dialogue');
      return;
    }
    
    setScriptText(script);
    setParsedLines(lines);
    setCharacters(extractCharacters(lines));
    setStep('review');
    toast.success(`Parsed ${lines.length} lines from ${extractCharacters(lines).length} characters`);
  };

  const handleProceedToAssign = () => {
    setStep('assign');
  };

  const handleCreateSession = async (mappings: CharacterActorMapping[]) => {
    setIsCreating(true);
    
    try {
      // Create session
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
      
      // Create actors (one per unique character-actor mapping)
      const actorPromises = mappings.map(mapping => 
        supabase
          .from('actors')
          .insert({
            session_id: session.id,
            name: mapping.actorName || mapping.character,
            character_name: mapping.character,
          })
          .select()
          .single()
      );
      
      const actorResults = await Promise.all(actorPromises);
      const actors = actorResults.map(r => {
        if (r.error) throw r.error;
        return r.data;
      });
      
      // Create actor lookup by character
      const actorByCharacter = new Map(
        actors.map(actor => [actor.character_name, actor])
      );
      
      // Create lines
      const lineInserts = parsedLines.map(line => ({
        session_id: session.id,
        actor_id: actorByCharacter.get(line.character)?.id || null,
        line_index: line.lineIndex,
        character_name: line.character,
        dialogue_text: line.dialogue,
      }));
      
      const { error: linesError } = await supabase
        .from('lines')
        .insert(lineInserts);
      
      if (linesError) throw linesError;
      
      toast.success('Session created! Redirecting to dashboard...');
      navigate(`/dashboard/${session.id}/${session.writer_token}`);
      
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('Failed to create session. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Step {step === 'input' ? '1' : step === 'review' ? '2' : '3'} of 3
            </span>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8 animate-fade-in">
          {/* Step 1: Script Input */}
          {step === 'input' && (
            <>
              <div className="text-center space-y-2 mb-8">
                <h1 className="text-3xl font-bold">Create a New Table Read</h1>
                <p className="text-muted-foreground">
                  Paste your script scene and we'll parse it into individual lines for recording.
                </p>
              </div>
              <ScriptInput onSubmit={handleScriptSubmit} />
            </>
          )}
          
          {/* Step 2: Review Parsed Lines */}
          {step === 'review' && (
            <>
              <div className="text-center space-y-2 mb-8">
                <h1 className="text-3xl font-bold">Review Parsed Lines</h1>
                <p className="text-muted-foreground">
                  Check that your script was parsed correctly before assigning actors.
                </p>
              </div>
              
              <ParsedLinesTable lines={parsedLines} />
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setStep('input')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to script
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleProceedToAssign}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Continue to Actor Assignment →
                </button>
              </div>
            </>
          )}
          
          {/* Step 3: Assign Actors */}
          {step === 'assign' && (
            <>
              <div className="text-center space-y-2 mb-8">
                <h1 className="text-3xl font-bold">Assign Actors</h1>
                <p className="text-muted-foreground">
                  Assign a real person to record each character's lines.
                </p>
              </div>
              
              <CharacterActorAssignment 
                characters={characters}
                onSubmit={handleCreateSession}
                isLoading={isCreating}
              />
              
              <button 
                onClick={() => setStep('review')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to review
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
