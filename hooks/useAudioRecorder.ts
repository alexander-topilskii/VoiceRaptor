import { useState, useRef, useCallback, useEffect } from 'react';
import { RecorderState, AudioMarker } from '../types.ts';
import { encodeWAV } from '../services/wavUtils.ts';

export const useAudioRecorder = () => {
  const [state, setState] = useState<RecorderState>(RecorderState.IDLE);
  const [duration, setDuration] = useState(0);
  const [markers, setMarkers] = useState<AudioMarker[]>([]);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  // Initialize Audio Context
  const initAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // Use ScriptProcessor for raw PCM access (Deprecation note: AudioWorklet is better but harder for single-file example)
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (state !== RecorderState.PAUSED) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Clone data to avoid reference issues
          audioChunksRef.current.push(new Float32Array(inputData));
        }
      };

      return true;
    } catch (err) {
      setError('Microphone access denied or not available.');
      console.error(err);
      return false;
    }
  };

  const startRecording = async () => {
    audioChunksRef.current = [];
    setMarkers([]);
    setDuration(0);
    setError(null);

    const ready = await initAudio();
    if (!ready) return;

    setState(RecorderState.RECORDING);
    startTimeRef.current = Date.now();
    
    // Timer loop
    timerIntervalRef.current = window.setInterval(() => {
        setDuration(prev => prev + 0.1);
    }, 100);
  };

  const pauseRecording = useCallback(() => {
    if (state === RecorderState.RECORDING) {
      setState(RecorderState.PAUSED);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioCtxRef.current) audioCtxRef.current.suspend();
    } else if (state === RecorderState.PAUSED) {
      setState(RecorderState.RECORDING);
      if (audioCtxRef.current) audioCtxRef.current.resume();
      // Resume timer
      timerIntervalRef.current = window.setInterval(() => {
          setDuration(prev => prev + 0.1);
      }, 100);
    }
  }, [state]);

  const addMarker = useCallback(() => {
    if (state === RecorderState.RECORDING) {
      const newMarker: AudioMarker = {
        id: Date.now(),
        time: duration,
        label: `Marker ${markers.length + 1}`
      };
      setMarkers(prev => [...prev, newMarker]);
    }
  }, [state, duration, markers.length]);

  const stopRecording = async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    if (processorRef.current && audioCtxRef.current) {
        processorRef.current.disconnect();
        analyserRef.current?.disconnect();
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        await audioCtxRef.current.close();
    }

    setState(RecorderState.IDLE);

    // Process Blob
    const sampleRate = audioCtxRef.current?.sampleRate || 44100;
    
    // Flatten chunks
    const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
    const resultBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunksRef.current) {
        resultBuffer.set(chunk, offset);
        offset += chunk.length;
    }

    const blob = encodeWAV(resultBuffer, sampleRate, markers);
    return blob;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return {
    state,
    duration,
    markers,
    analyser: analyserRef.current,
    error,
    startRecording,
    pauseRecording,
    stopRecording,
    addMarker
  };
};