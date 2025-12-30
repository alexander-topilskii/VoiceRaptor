import React, { useState, useEffect, useCallback } from 'react';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import Visualizer from './components/Visualizer';
import Controls from './components/Controls';
import RecordingList from './components/RecordingList';
import SettingsModal from './components/SettingsModal';
import { formatDuration } from './services/wavUtils';
import { saveRecordingToDB, getAllRecordingsFromDB, deleteRecordingFromDB, clearAllRecordingsFromDB, updateRecordingInDB } from './services/db';
import { SavedRecording, RecorderState } from './types';
import { Mic, Radio, Flag, Settings } from 'lucide-react';

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
    amplitudeHistory, 
    error 
  } = useAudioRecorder();

  const [recordings, setRecordings] = useState<SavedRecording[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(true);
  const [wakeLockSentinel, setWakeLockSentinel] = useState<WakeLockSentinel | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
        try {
            const data = await getAllRecordingsFromDB();
            const withUrls = data.map(rec => ({
                ...rec,
                url: URL.createObjectURL(rec.blob)
            }));
            setRecordings(withUrls);
        } catch (e) {
            console.error("Failed to load recordings", e);
        }
    };
    loadData();

    const handleBeforeInstall = (e: any) => {
        e.preventDefault();
        setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Global Key Listener for 'M'
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'm' || e.key === 'M') && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        if (state === RecorderState.RECORDING || state === RecorderState.PAUSED) {
          addMarker();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [state, addMarker]);

  useEffect(() => {
    const manageWakeLock = async () => {
        if (state === RecorderState.RECORDING && wakeLockEnabled) {
            if (!wakeLockSentinel && 'wakeLock' in navigator) {
                try {
                    const sentinel = await navigator.wakeLock.request('screen');
                    setWakeLockSentinel(sentinel);
                } catch (err) {
                    console.log('Wake Lock denied', err);
                }
            }
        } else {
            if (wakeLockSentinel) {
                await wakeLockSentinel.release();
                setWakeLockSentinel(null);
            }
        }
    };
    manageWakeLock();
  }, [state, wakeLockEnabled]);

  const handleStop = async () => {
    const blob = await stopRecording();
    const newRecording: SavedRecording = {
      id: crypto.randomUUID(),
      blob,
      url: '', 
      duration,
      timestamp: Date.now(),
      name: `Capture ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      markers: [...markers] 
    };
    
    await saveRecordingToDB(newRecording);
    const url = URL.createObjectURL(blob);
    setRecordings(prev => [{ ...newRecording, url }, ...prev]);
  };

  const handleUpdate = async (updatedRec: SavedRecording) => {
    await updateRecordingInDB(updatedRec);
    setRecordings(prev => prev.map(r => r.id === updatedRec.id ? updatedRec : r));
  };

  const handleDelete = async (id: string) => {
    await deleteRecordingFromDB(id);
    setRecordings(prev => {
        const target = prev.find(r => r.id === id);
        if (target) {
            URL.revokeObjectURL(target.url);
        }
        return prev.filter(r => r.id !== id);
    });
  };

  const handleClearCache = async () => {
      await clearAllRecordingsFromDB();
      recordings.forEach(r => URL.revokeObjectURL(r.url));
      setRecordings([]);
      setIsSettingsOpen(false);
  };

  const handleInstallPWA = () => {
      if (installPrompt) {
          installPrompt.prompt();
          installPrompt.userChoice.then((choiceResult: any) => {
              if (choiceResult.outcome === 'accepted') {
                  setInstallPrompt(null);
              }
          });
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center pb-safe selection:bg-cyan-500/30">
      
      {/* Redesigned Header */}
      <header className="w-full max-w-2xl px-6 py-4 flex items-center justify-between border-b border-slate-900/50 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl transition-all ${state === RecorderState.RECORDING ? 'bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.1)]'}`}>
                <Mic className={`w-5 h-5 ${state === RecorderState.RECORDING ? 'text-rose-500 animate-pulse' : 'text-cyan-400'}`} />
            </div>
            <div>
                <h1 className="text-xl font-black tracking-tighter text-slate-100 leading-none bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
                    VoiceRaptor
                </h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 hidden xs:block">Waveform Analytics</p>
            </div>
        </div>
        
        <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 text-slate-500 hover:text-white rounded-full hover:bg-slate-900 transition-all border border-transparent hover:border-slate-800"
        >
            <Settings className="w-5 h-5" />
        </button>
      </header>

      <main className="w-full max-w-2xl px-4 py-8 space-y-8 flex-1 flex flex-col">
        {error && (
            <div className="bg-rose-900/20 border border-rose-900/30 text-rose-200 px-5 py-3 rounded-2xl text-sm text-center font-medium animate-in fade-in slide-in-from-top-2">
                {error}
            </div>
        )}

        <div className="relative group">
            <Visualizer 
                analyser={analyser} 
                isRecording={state !== RecorderState.IDLE}
                amplitudeHistory={amplitudeHistory}
                markers={markers}
                duration={duration} 
            />
            
            <div className="absolute top-4 right-4 flex items-center gap-2.5 bg-slate-950/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800/80 shadow-xl pointer-events-none transition-all group-hover:scale-105">
                {state === RecorderState.RECORDING && <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />}
                {state === RecorderState.PAUSED && <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />}
                <span className={`font-mono text-2xl font-bold tracking-tight ${state === RecorderState.RECORDING ? 'text-rose-400' : state === RecorderState.PAUSED ? 'text-amber-400' : 'text-slate-500'}`}>
                    {formatDuration(duration)}
                </span>
            </div>

            {state !== RecorderState.IDLE && (
              <div className="absolute bottom-4 left-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950/40 px-2 py-1 rounded backdrop-blur-sm border border-slate-800/30">
                Press 'M' to Mark
              </div>
            )}
        </div>

        {state !== RecorderState.IDLE && markers.length > 0 && (
             <div className="flex flex-wrap gap-2.5 justify-center animate-in fade-in slide-in-from-bottom-4">
                {markers.slice(-5).map((m) => (
                    <div key={m.id} className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-4 py-1.5 rounded-xl border border-amber-500/20 text-xs font-bold shadow-sm">
                        <Flag className="w-3 h-3 fill-amber-500/50" />
                        {formatDuration(m.time)}
                        <span className="opacity-60 font-medium">| {m.label}</span>
                    </div>
                ))}
                {markers.length > 5 && <div className="text-slate-600 text-[10px] flex items-center uppercase font-black tracking-widest">+ {markers.length - 5} more</div>}
             </div>
        )}

        <div className="flex-none">
            <Controls 
                state={state} 
                onStart={startRecording} 
                onStop={handleStop} 
                onPause={pauseRecording} 
                onFlag={addMarker} 
            />
        </div>

        <div className="flex-1 pt-4">
            <div className="flex items-center justify-between mb-1 px-1">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Library Archive</h2>
              <div className="h-px bg-slate-800/50 flex-1 ml-4"></div>
            </div>
            <p className="text-[10px] text-slate-600 mb-6 px-1 italic">
              Stored in browser memory. Export important recordings to prevent data loss.
            </p>
            <RecordingList 
              recordings={recordings} 
              onDelete={handleDelete} 
              onUpdate={handleUpdate}
            />
        </div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        wakeLockEnabled={wakeLockEnabled}
        onToggleWakeLock={() => setWakeLockEnabled(!wakeLockEnabled)}
        onClearCache={handleClearCache}
        installPrompt={installPrompt}
        onInstall={handleInstallPWA}
      />
    </div>
  );
};

export default App;