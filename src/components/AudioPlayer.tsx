import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Download, Loader2, Headphones } from 'lucide-react';
import { StitchingProgress, StitchingResult } from '@/lib/audioStitcher';

interface AudioPlayerProps {
  result: StitchingResult | null;
  isGenerating: boolean;
  progress: StitchingProgress | null;
  onGenerate: () => void;
  canGenerate: boolean;
  missingCount: number;
}

export function AudioPlayer({ 
  result, 
  isGenerating, 
  progress, 
  onGenerate,
  canGenerate,
  missingCount 
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    if (!result) return;
    
    const a = document.createElement('a');
    a.href = result.url;
    a.download = 'table-read.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!progress) return 0;
    return Math.round((progress.current / Math.max(progress.total, 1)) * 100);
  };

  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Headphones className="h-5 w-5 text-primary" />
          Table Read
        </CardTitle>
        <CardDescription>
          {result 
            ? 'Your table read is ready! Listen and download below.' 
            : 'Generate the final table read audio when all lines are recorded.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generation progress */}
        {isGenerating && progress && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">{progress.message}</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
          </div>
        )}
        
        {/* Generate button */}
        {!result && !isGenerating && (
          <div className="space-y-3">
            {missingCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {missingCount} line{missingCount > 1 ? 's' : ''} still missing recordings.
                {missingCount <= 2 && ' You can still generate with silence placeholders.'}
              </p>
            )}
            <Button 
              onClick={onGenerate}
              disabled={!canGenerate}
              className="w-full"
              size="lg"
            >
              Generate Table Read
            </Button>
          </div>
        )}
        
        {/* Audio player */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Button 
                variant="default" 
                size="icon"
                onClick={handlePlayPause}
                className="h-12 w-12 rounded-full"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>
              
              <div className="flex-1">
                <p className="font-medium">Final Table Read</p>
                <p className="text-sm text-muted-foreground">
                  Duration: {formatDuration(result.durationSeconds)}
                </p>
              </div>
              
              <Button 
                variant="outline" 
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
            
            <audio 
              ref={audioRef}
              src={result.url}
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
            />
            
            <Button 
              variant="outline"
              onClick={onGenerate}
              className="w-full"
            >
              Regenerate Table Read
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
