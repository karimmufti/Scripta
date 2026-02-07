// TableRead.io - Core Type Definitions

export interface Session {
  id: string;
  title: string | null;
  script_text: string;
  status: 'draft' | 'recording' | 'generating' | 'generated';
  result_file_path: string | null;
  writer_token: string;
  created_at: string;
  updated_at: string;
}

export interface Actor {
  id: string;
  session_id: string;
  name: string;
  character_name: string;
  share_token: string;
  created_at: string;
}

export interface Line {
  id: string;
  session_id: string;
  actor_id: string | null;
  line_index: number;
  character_name: string;
  dialogue_text: string;
  audio_file_path: string | null;
  audio_uploaded_at: string | null;
  created_at: string;
}

// Parsed line from script text
export interface ParsedLine {
  character: string;
  dialogue: string;
  lineIndex: number;
}

// Character to actor mapping during session creation
export interface CharacterActorMapping {
  character: string;
  actorName: string;
}

// Line with context for actor view
export interface LineWithContext extends Line {
  previousLine?: {
    character_name: string;
    dialogue_text: string;
  };
}

// Recording state for a single line
export interface LineRecordingState {
  lineId: string;
  status: 'idle' | 'recording' | 'recorded' | 'uploading' | 'uploaded';
  audioBlob?: Blob;
  audioUrl?: string;
}

// Session progress stats
export interface SessionProgress {
  totalLines: number;
  recordedLines: number;
  percentage: number;
}
