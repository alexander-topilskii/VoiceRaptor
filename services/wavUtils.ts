import { AudioMarker } from '../types';

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Encodes raw PCM audio data into a WAV file with optional CUE markers.
 * Markers are compatible with standard audio editors like Oceanaudio.
 */
export const encodeWAV = (samples: Float32Array, sampleRate: number, markers: AudioMarker[] = []): Blob => {
  const bufferLength = samples.length;
  const numChannels = 1; // Mono for this implementation
  
  // 16-bit PCM
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = bufferLength * blockAlign;
  
  // Calculate CUE chunk size
  // Chunk ID (4) + Chunk Size (4) + Num Cue Points (4) + (24 * numMarkers)
  const cueChunkSize = markers.length > 0 ? 4 + 4 + 4 + (24 * markers.length) : 0;
  
  const headerSize = 44;
  const totalFileSize = headerSize + dataSize + cueChunkSize;

  const buffer = new ArrayBuffer(totalFileSize);
  const view = new DataView(buffer);

  /* RIFF Identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF Chunk Length */
  view.setUint32(4, 36 + dataSize + cueChunkSize, true);
  /* RIFF Type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, byteRate, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, dataSize, true);

  /* Write Data */
  let offset = 44;
  for (let i = 0; i < bufferLength; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  /* Write Cue Chunk if markers exist */
  if (markers.length > 0) {
    writeString(view, offset, 'cue ');
    offset += 4;
    
    // Chunk Data Size: 4 (Num Cue Points) + 24 * Count
    const chunkDataSize = 4 + (24 * markers.length);
    view.setUint32(offset, chunkDataSize, true);
    offset += 4;

    // Num Cue Points
    view.setUint32(offset, markers.length, true);
    offset += 4;

    markers.forEach((marker, index) => {
        const sampleOffset = Math.floor(marker.time * sampleRate);
        
        view.setUint32(offset, index + 1, true); // ID
        offset += 4;
        view.setUint32(offset, sampleOffset, true); // Position
        offset += 4;
        writeString(view, offset, 'data'); // Data Chunk ID
        offset += 4;
        view.setUint32(offset, 0, true); // Chunk Start
        offset += 4;
        view.setUint32(offset, 0, true); // Block Start
        offset += 4;
        view.setUint32(offset, sampleOffset, true); // Sample Offset
        offset += 4;
    });
  }

  return new Blob([view], { type: 'audio/wav' });
};

export const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
};