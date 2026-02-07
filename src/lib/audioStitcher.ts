/**
 * Client-side Audio Stitching Engine
 * 
 * Uses Web Audio API to:
 * 1. Load all recorded audio clips in order
 * 2. Insert configurable pauses between clips
 * 3. Overlay a subtle room tone/ambience
 * 4. Export as a single audio file
 */

// Configuration constants
const PAUSE_DURATION_MS = 750; // Pause between lines in milliseconds
const ROOM_TONE_VOLUME = 0.08; // Volume of room tone (0-1)
const SAMPLE_RATE = 44100; // Output sample rate

/**
 * Creates a silent audio buffer of specified duration
 */
function createSilence(audioContext: AudioContext, durationMs: number): AudioBuffer {
  const sampleCount = Math.floor((durationMs / 1000) * SAMPLE_RATE);
  return audioContext.createBuffer(1, sampleCount, SAMPLE_RATE);
}

/**
 * Generates a simple room tone (pink noise-like ambient sound)
 */
function generateRoomTone(audioContext: AudioContext, durationSeconds: number): AudioBuffer {
  const sampleCount = Math.floor(durationSeconds * SAMPLE_RATE);
  const buffer = audioContext.createBuffer(1, sampleCount, SAMPLE_RATE);
  const data = buffer.getChannelData(0);
  
  // Generate subtle room ambience (very low amplitude noise with low-pass filtering effect)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  
  for (let i = 0; i < sampleCount; i++) {
    const white = Math.random() * 2 - 1;
    
    // Pink noise approximation using Voss-McCartney algorithm
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    
    // Very low amplitude for subtle room tone
    data[i] = pink * 0.01;
  }
  
  return buffer;
}

/**
 * Fetches and decodes an audio file from a URL
 */
async function fetchAndDecodeAudio(
  audioContext: AudioContext, 
  url: string
): Promise<AudioBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

/**
 * Converts an AudioBuffer to mono
 */
function convertToMono(buffer: AudioBuffer, audioContext: AudioContext): AudioBuffer {
  if (buffer.numberOfChannels === 1) {
    return buffer;
  }
  
  const monoBuffer = audioContext.createBuffer(
    1, 
    buffer.length, 
    buffer.sampleRate
  );
  
  const monoData = monoBuffer.getChannelData(0);
  
  // Mix all channels to mono
  for (let i = 0; i < buffer.length; i++) {
    let sum = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      sum += buffer.getChannelData(channel)[i];
    }
    monoData[i] = sum / buffer.numberOfChannels;
  }
  
  return monoBuffer;
}

/**
 * Resamples an AudioBuffer to the target sample rate
 */
function resample(
  buffer: AudioBuffer, 
  targetSampleRate: number,
  audioContext: AudioContext
): AudioBuffer {
  if (buffer.sampleRate === targetSampleRate) {
    return buffer;
  }
  
  const ratio = buffer.sampleRate / targetSampleRate;
  const newLength = Math.floor(buffer.length / ratio);
  const newBuffer = audioContext.createBuffer(1, newLength, targetSampleRate);
  const oldData = buffer.getChannelData(0);
  const newData = newBuffer.getChannelData(0);
  
  // Simple linear interpolation
  for (let i = 0; i < newLength; i++) {
    const oldIndex = i * ratio;
    const index = Math.floor(oldIndex);
    const frac = oldIndex - index;
    
    if (index + 1 < oldData.length) {
      newData[i] = oldData[index] * (1 - frac) + oldData[index + 1] * frac;
    } else {
      newData[i] = oldData[index];
    }
  }
  
  return newBuffer;
}

/**
 * Concatenates multiple audio buffers with pauses between them
 */
function concatenateBuffers(
  buffers: AudioBuffer[], 
  audioContext: AudioContext,
  pauseDurationMs: number = PAUSE_DURATION_MS
): AudioBuffer {
  const silence = createSilence(audioContext, pauseDurationMs);
  
  // Calculate total length
  let totalLength = 0;
  for (let i = 0; i < buffers.length; i++) {
    totalLength += buffers[i].length;
    if (i < buffers.length - 1) {
      totalLength += silence.length;
    }
  }
  
  // Create output buffer
  const output = audioContext.createBuffer(1, totalLength, SAMPLE_RATE);
  const outputData = output.getChannelData(0);
  
  // Copy data
  let offset = 0;
  for (let i = 0; i < buffers.length; i++) {
    const bufferData = buffers[i].getChannelData(0);
    outputData.set(bufferData, offset);
    offset += buffers[i].length;
    
    // Add silence between clips (except after the last one)
    if (i < buffers.length - 1) {
      offset += silence.length;
    }
  }
  
  return output;
}

/**
 * Mixes the dialogue with room tone
 */
function mixWithRoomTone(
  dialogue: AudioBuffer,
  audioContext: AudioContext,
  roomToneVolume: number = ROOM_TONE_VOLUME
): AudioBuffer {
  const durationSeconds = dialogue.length / SAMPLE_RATE;
  const roomTone = generateRoomTone(audioContext, durationSeconds);
  
  const output = audioContext.createBuffer(1, dialogue.length, SAMPLE_RATE);
  const outputData = output.getChannelData(0);
  const dialogueData = dialogue.getChannelData(0);
  const roomToneData = roomTone.getChannelData(0);
  
  for (let i = 0; i < dialogue.length; i++) {
    outputData[i] = dialogueData[i] + roomToneData[i] * roomToneVolume;
    // Soft clipping to prevent distortion
    if (outputData[i] > 1) outputData[i] = 1;
    if (outputData[i] < -1) outputData[i] = -1;
  }
  
  return output;
}

/**
 * Converts an AudioBuffer to a WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const headerSize = 44;
  
  const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(arrayBuffer);
  const data = buffer.getChannelData(0);
  
  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, headerSize + dataSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Audio data
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, int16, true);
    offset += 2;
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export interface StitchingProgress {
  stage: 'loading' | 'processing' | 'mixing' | 'exporting';
  current: number;
  total: number;
  message: string;
}

export interface StitchingResult {
  blob: Blob;
  url: string;
  durationSeconds: number;
}

export interface StitchingOptions {
  pauseMs?: number;
}

/**
 * Main stitching function that combines all audio clips into one track
 * 
 * @param audioUrls - Array of audio file URLs in order
 * @param onProgress - Progress callback
 * @returns The stitched audio blob and URL
 */
export async function stitchAudio(
  audioUrls: string[],
  onProgress?: (progress: StitchingProgress) => void,
  options?: StitchingOptions
): Promise<StitchingResult> {
  const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
  
  try {
    // Stage 1: Load all audio files
    onProgress?.({
      stage: 'loading',
      current: 0,
      total: audioUrls.length,
      message: 'Loading audio files...',
    });
    
    const loadedBuffers: AudioBuffer[] = [];
    
    for (let i = 0; i < audioUrls.length; i++) {
      onProgress?.({
        stage: 'loading',
        current: i + 1,
        total: audioUrls.length,
        message: `Loading audio ${i + 1} of ${audioUrls.length}...`,
      });
      
      const buffer = await fetchAndDecodeAudio(audioContext, audioUrls[i]);
      loadedBuffers.push(buffer);
    }
    
    // Stage 2: Process (convert to mono, resample)
    onProgress?.({
      stage: 'processing',
      current: 0,
      total: loadedBuffers.length,
      message: 'Processing audio clips...',
    });
    
    const processedBuffers: AudioBuffer[] = [];
    
    for (let i = 0; i < loadedBuffers.length; i++) {
      onProgress?.({
        stage: 'processing',
        current: i + 1,
        total: loadedBuffers.length,
        message: `Processing clip ${i + 1} of ${loadedBuffers.length}...`,
      });
      
      let buffer = loadedBuffers[i];
      buffer = convertToMono(buffer, audioContext);
      buffer = resample(buffer, SAMPLE_RATE, audioContext);
      processedBuffers.push(buffer);
    }
    
    // Stage 3: Concatenate and mix with room tone
    onProgress?.({
      stage: 'mixing',
      current: 0,
      total: 1,
      message: 'Concatenating clips and adding room tone...',
    });
    
    const concatenated = concatenateBuffers(processedBuffers, audioContext, options?.pauseMs);
    const mixed = mixWithRoomTone(concatenated, audioContext);
    
    // Stage 4: Export to WAV
    onProgress?.({
      stage: 'exporting',
      current: 0,
      total: 1,
      message: 'Exporting final audio...',
    });
    
    const blob = audioBufferToWav(mixed);
    const url = URL.createObjectURL(blob);
    const durationSeconds = mixed.length / SAMPLE_RATE;
    
    onProgress?.({
      stage: 'exporting',
      current: 1,
      total: 1,
      message: 'Complete!',
    });
    
    return { blob, url, durationSeconds };
  } finally {
    await audioContext.close();
  }
}
