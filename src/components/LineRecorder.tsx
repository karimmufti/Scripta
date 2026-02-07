import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { Mic, Square, Play, Pause, Upload, RotateCcw, Upload as UploadIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineWithContext } from '@/lib/types';

interface LineRecorderProps {
  line: LineWithContext;
  onUpload: (lineId: string, audioBlob: Blob) => Promise<void>;
  isUploaded: boolean;
}

export function LineRecorder({ line, onUpload, isUploaded }: LineRecorderProps) {
  const { 
    isRecording, 
    audioBlob, 
    audioUrl, 
    startRecording, 
    stopRecording, 
    clearRecording,
    error 
  } = useAudioRecorder();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleUpload = async () => {
    if (!audioBlob) return;
    
    setIsUploading(true);
    try {
      await onUpload(line.id, audioBlob);
      clearRecording();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      await onUpload(line.id, file);
    } catch (err) {
      console.error('File upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getStatus = () => {
    if (isUploaded) return 'uploaded';
    if (isRecording) return 'recording';
    if (audioBlob) return 'recorded';
    return 'pending';
  };

  return (
    <Card className={cn(
      'transition-all duration-300',
      isRecording && 'ring-2 ring-recording ring-offset-2 ring-offset-background',
      isUploaded && 'opacity-75'
    )}>
      <CardContent className="p-4 space-y-4">
        {/* Context: Previous line */}
        {line.previousLine && (
          <div className="text-sm text-muted-foreground border-l-2 border-muted pl-3 py-1">
            <span className="font-medium">{line.previousLine.character_name}:</span>{' '}
            <span className="italic">"{line.previousLine.dialogue_text}"</span>
          </div>
        )}
        
        {/* Current line */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-primary">
              Line {line.line_index + 1}
            </span>
            <StatusBadge status={getStatus()} />
          </div>
          <p className="font-mono text-lg font-medium">
            "{line.dialogue_text}"
          </p>
        </div>
        
        {/* Error display */}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        
        {/* Recording controls */}
        {!isUploaded && (
          <div className="flex flex-wrap gap-2">
            {!isRecording && !audioBlob && (
              <>
                <Button 
                  onClick={startRecording}
                  variant="default"
                  className="flex-1 min-w-[120px]"
                >
                  <Mic className="mr-2 h-4 w-4" />
                  Record
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 min-w-[120px]"
                >
                  <UploadIcon className="mr-2 h-4 w-4" />
                  Upload File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </>
            )}
            
            {isRecording && (
              <Button 
                onClick={stopRecording}
                variant="destructive"
                className="flex-1 recording-pulse"
              >
                <Square className="mr-2 h-4 w-4" />
                Stop Recording
              </Button>
            )}
            
            {audioBlob && !isRecording && (
              <>
                <Button 
                  onClick={handlePlayPause}
                  variant="outline"
                >
                  {isPlaying ? (
                    <Pause className="mr-2 h-4 w-4" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button 
                  onClick={clearRecording}
                  variant="outline"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Re-record
                </Button>
                <Button 
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
              </>
            )}
          </div>
        )}
        
        {/* Hidden audio element for playback */}
        {audioUrl && (
          <audio 
            ref={audioRef} 
            src={audioUrl} 
            onEnded={handleAudioEnded}
          />
        )}
        
        {/* Uploaded indicator */}
        {isUploaded && (
          <p className="text-sm text-success flex items-center gap-2">
            <span className="status-dot status-recorded" />
            Recording uploaded successfully
          </p>
        )}
      </CardContent>
    </Card>
  );
}
