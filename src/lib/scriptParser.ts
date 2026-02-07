import { ParsedLine } from './types';

/**
 * Parses screenplay text into structured lines.
 * Expected format: CHARACTER_NAME: line of dialogue
 * 
 * Rules:
 * - Each line of dialogue is on its own line
 * - Format: CHARACTER_NAME: line of dialogue
 * - Blank lines are ignored
 * - Lines without a colon are ignored
 */
export function parseScript(scriptText: string): ParsedLine[] {
  const lines = scriptText.split('\n');
  const parsedLines: ParsedLine[] = [];
  let lineIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Find the first colon
    const colonIndex = trimmed.indexOf(':');
    
    // Skip lines without a colon (stage directions, etc.)
    if (colonIndex === -1) continue;
    
    const character = trimmed.substring(0, colonIndex).trim().toUpperCase();
    const dialogue = trimmed.substring(colonIndex + 1).trim();
    
    // Skip if character name is empty or dialogue is empty
    if (!character || !dialogue) continue;
    
    parsedLines.push({
      character,
      dialogue,
      lineIndex,
    });
    
    lineIndex++;
  }
  
  return parsedLines;
}

/**
 * Extracts unique character names from parsed lines
 */
export function extractCharacters(parsedLines: ParsedLine[]): string[] {
  const characters = new Set<string>();
  
  for (const line of parsedLines) {
    characters.add(line.character);
  }
  
  return Array.from(characters).sort();
}

/**
 * Generates a sample script for demo purposes
 */
export function getSampleScript(): string {
  return `SARAH: I can't believe you're actually leaving.
MICHAEL: I have to. You know I have to.
SARAH: No, I don't know that. I don't understand any of this.
MICHAEL: Look, this opportunity... it's everything I've worked for.
SARAH: And what about us? What about everything we've worked for?
MICHAEL: That's not fair.
SARAH: Fair? You want to talk about fair?
MICHAEL: I'm asking you to come with me.
SARAH: To the other side of the world? Just drop everything?
MICHAEL: Yes. That's exactly what I'm asking.`;
}
