export enum RecorderState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PAUSED = 'PAUSED',
}

export interface AudioMarker {
  id: number;
  time: number; // in seconds
  label: string;
}

export interface SavedRecording {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
  timestamp: number;
  name: string;
  markers: AudioMarker[];
}

export interface WavEncoderConfig {
  sampleRate: number;
  numChannels: number;
}