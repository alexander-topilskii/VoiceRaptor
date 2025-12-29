import React from 'react';
import { Mic, Square, Pause, Play, Flag } from 'lucide-react';
import { RecorderState } from '../types.ts';

interface ControlsProps {
  state: RecorderState;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onFlag: () => void;
}

const Controls: React.FC<ControlsProps> = ({ state, onStart, onStop, onPause, onFlag }) => {
  return (
    <div className="flex items-center gap-6 justify-center p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl shadow-cyan-900/10">
      {state === RecorderState.IDLE ? (
        <button
          onClick={onStart}
          className="group relative flex items-center justify-center w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 transition-all duration-300 shadow-lg hover:shadow-red-500/30"
          aria-label="Start Recording"
        >
          <div className="absolute inset-0 rounded-full border-2 border-red-400 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"></div>
          <Mic className="w-8 h-8 text-white" />
        </button>
      ) : (
        <>
           <button
            onClick={onFlag}
            className="flex flex-col items-center gap-1 group text-slate-400 hover:text-amber-400 transition-colors"
            title="Add Marker"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-800 group-hover:bg-slate-700 transition-all">
                <Flag className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">Flag</span>
          </button>

          <button
            onClick={onPause}
            className="flex flex-col items-center gap-1 group text-slate-400 hover:text-white transition-colors"
            title={state === RecorderState.PAUSED ? "Resume" : "Pause"}
          >
             <div className="w-16 h-16 flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 group-hover:border-slate-600 group-hover:bg-slate-750 transition-all">
                {state === RecorderState.PAUSED ? (
                <Play className="w-8 h-8 fill-current" />
                ) : (
                <Pause className="w-8 h-8 fill-current" />
                )}
            </div>
             <span className="text-xs font-medium">{state === RecorderState.PAUSED ? "Resume" : "Pause"}</span>
          </button>

          <button
            onClick={onStop}
            className="flex flex-col items-center gap-1 group text-slate-400 hover:text-red-400 transition-colors"
             title="Stop & Save"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-800 group-hover:bg-slate-700 transition-all">
                <Square className="w-5 h-5 fill-current" />
            </div>
            <span className="text-xs font-medium">Stop</span>
          </button>
        </>
      )}
    </div>
  );
};

export default Controls;