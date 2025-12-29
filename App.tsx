import React, { useState } from 'react';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import Visualizer from './components/Visualizer';
import Controls from './components/Controls';
import RecordingList from './components/RecordingList';
import { formatDuration } from './services/wavUtils';
import { SavedRecording, RecorderState } from './types.ts';
import { Mic, Radio, Flag } from 'lucide-react';

const App: React.FC = () => {
  const { 
    state, 
    duration, 
    analyser, 
    startRecording, 
    stopRecording, 
    pauseRecording, 
    addMarker, 
    markers, 
    error 
  } = useAudioRecorder();

  const [recordings, setRecordings] = useState<SavedRecording[]>([]);

  const handleStop = async () => {
    const blob = await stopRecording();
    const url = URL.createObjectURL(blob);
    const newRecording: SavedRecording = {
      id: crypto.randomUUID(),
      blob,
      url,
      duration,
      timestamp: Date.now(),
      name: `Recording ${new Date().toLocaleTimeString()}`,
      markers: [...markers] // Copy markers
    };
    setRecordings(prev => [newRecording, ...prev]);
  };

  const handleDelete = (id: string) => {
    setRecordings(prev => {
        const target = prev.find(r => r.id === id);
        if (target) {
            URL.revokeObjectURL(target.url);
        }
        return prev.filter(r => r.id !== id);
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <header className="mb-8 text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
            <div className={`p-3 rounded-full ${state === RecorderState.RECORDING ? 'bg-red-500/10' : 'bg-cyan-500/10'}`}>
                <Mic className={`w-8 h-8 ${state === RecorderState.RECORDING ? 'text-red-500 animate-pulse' : 'text-cyan-500'}`} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Voice Memo
            </h1>
        </div>
        <p className="text-slate-500 text-sm">Professional WAV Recorder with Markers</p>
      </header>

      {/* Main Recording Interface */}
      <main className="w-full max-w-2xl space-y-8">
        
        {/* Error Banner */}
        {error && (
            <div className="bg-red-900/20 border border-red-900/50 text-red-200 px-4 py-3 rounded-lg text-sm text-center">
                {error}
            </div>
        )}

        {/* Display Panel */}
        <div className="relative">
            <Visualizer analyser={analyser} isRecording={state === RecorderState.RECORDING} />
            
            {/* Markers Overlay on Visualizer (Simple representation) */}
            {markers.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-4 flex pointer-events-none">
                    {/* Note: This is a simplified visual representation. Accurate mapping requires full waveform data history which we don't visualize here for performance/simplicity */}
                </div>
            )}
            
            {/* Live Timer Overlay */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-950/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-800">
                {state === RecorderState.RECORDING && (
                     <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                )}
                <span className={`font-mono text-xl font-semibold ${state === RecorderState.RECORDING ? 'text-red-400' : 'text-slate-400'}`}>
                    {formatDuration(duration)}
                </span>
            </div>
        </div>

        {/* Active Session Markers Preview */}
        {state !== RecorderState.IDLE && markers.length > 0 && (
             <div className="flex flex-wrap gap-2 justify-center animate-in fade-in slide-in-from-bottom-2">
                {markers.map((m) => (
                    <div key={m.id} className="flex items-center gap-1.5 bg-amber-900/20 text-amber-500 px-3 py-1 rounded-full border border-amber-900/30 text-xs font-medium">
                        <Flag className="w-3 h-3 fill-current" />
                        {formatDuration(m.time)}
                    </div>
                ))}
             </div>
        )}

        {/* Controls */}
        <Controls 
            state={state} 
            onStart={startRecording} 
            onStop={handleStop} 
            onPause={pauseRecording} 
            onFlag={addMarker} 
        />

        {/* Saved List */}
        <div className="mt-12">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 px-1">Library</h2>
            <RecordingList recordings={recordings} onDelete={handleDelete} />
        </div>
      </main>
    </div>
  );
};

export default App;