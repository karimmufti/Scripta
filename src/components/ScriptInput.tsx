import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Sparkles } from 'lucide-react';
import { getSampleScript } from '@/lib/scriptParser';

interface ScriptInputProps {
  onSubmit: (scriptText: string) => void;
  isLoading?: boolean;
}

export function ScriptInput({ onSubmit, isLoading }: ScriptInputProps) {
  const [script, setScript] = useState('');

  const handleLoadSample = () => {
    setScript(getSampleScript());
  };

  const handleSubmit = () => {
    if (script.trim()) {
      onSubmit(script);
    }
  };

  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Your Script
        </CardTitle>
        <CardDescription>
          Paste your script scene below. Format each line as: <code className="font-mono text-primary">CHARACTER: dialogue</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder={`Example:\nSARAH: I can't believe you're actually leaving.\nMICHAEL: I have to. You know I have to.`}
          value={script}
          onChange={(e) => setScript(e.target.value)}
          className="min-h-[250px] font-mono text-sm resize-y bg-muted/50"
        />
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            onClick={handleLoadSample}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Load Sample Script
          </Button>
          
          <Button 
            onClick={handleSubmit}
            disabled={!script.trim() || isLoading}
            className="flex-1 sm:flex-none"
          >
            {isLoading ? 'Parsing...' : 'Parse Script'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
