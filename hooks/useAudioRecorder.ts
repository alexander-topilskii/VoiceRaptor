import { useState, useRef, useCallback, useEffect } from 'react';
import { RecorderState, AudioMarker } from '../types';
import { encodeWAV } from '../services/wavUtils';

export const useAudioRecorder = () => {
  const [state, setState] = useState<RecorderState>(RecorderState.IDLE);
  const stateRef = useRef<RecorderState>(RecorderState.IDLE);
  const [duration, setDuration] = useState(0);
  const [markers, setMarkers] = useState<AudioMarker[]>([]);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  
  // Stores the RMS volume level for each processed chunk to build the mini-map
  const amplitudeHistoryRef = useRef<number[]>([]); 
  
  const timerIntervalRef = useRef<number | null>(null);

  // Sync stateRef with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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

      // Use ScriptProcessor for raw PCM access
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        // Use ref to check current state inside the callback (avoid stale closure)
        if (stateRef.current === RecorderState.RECORDING) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // 1. Save Raw Data
          audioChunksRef.current.push(new Float32Array(inputData));

          // 2. Calculate RMS for Visualization History (Mini-map)
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
             sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          // Push amplified volume [0-1]
          amplitudeHistoryRef.current.push(Math.min(1, rms * 5));
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
    amplitudeHistoryRef.current = [];
    setMarkers([]);
    setDuration(0);
    setError(null);

    const ready = await initAudio();
    if (!ready) return;

    setState(RecorderState.RECORDING);
    // stateRef update handled by useEffect, but for immediate safety in async context:
    stateRef.current = RecorderState.RECORDING; 
    
    // Timer loop
    timerIntervalRef.current = window.setInterval(() => {
        setDuration(prev => prev + 0.1);
    }, 100);
  };

  const pauseRecording = useCallback(() => {
    if (state === RecorderState.RECORDING) {
      setState(RecorderState.PAUSED);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend();
      }
    } else if (state === RecorderState.PAUSED) {
      setState(RecorderState.RECORDING);
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      // Resume timer
      timerIntervalRef.current = window.setInterval(() => {
          setDuration(prev => prev + 0.1);
      }, 100);
    }
  }, [state]);

  const addMarker = useCallback(() => {
    // Allow markers in both Recording and Paused states
    if (stateRef.current === RecorderState.RECORDING || stateRef.current === RecorderState.PAUSED) {
      const newMarker: AudioMarker = {
        id: Date.now(),
        time: duration, // Captures current duration from closure? State duration updates on render.
        label: `Marker ${markers.length + 1}`
      };
      setMarkers(prev => [...prev, newMarker]);
    }
  }, [duration, markers.length]); // duration dependency ensures we get the latest time

  const stopRecording = async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    if (processorRef.current && audioCtxRef.current) {
        processorRef.current.disconnect();
        analyserRef.current?.disconnect();
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        await audioCtxRef.current.close();
    }

    setState(RecorderState.IDLE);
    stateRef.current = RecorderState.IDLE;

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
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  return {
    state,
    duration,
    markers,
    analyser: analyserRef.current,
    amplitudeHistory: amplitudeHistoryRef.current,
    error,
    startRecording,
    pauseRecording,
    stopRecording,
    addMarker
  };
};