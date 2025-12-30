import React, { useState } from 'react';
import { Share2, Download, Trash2, Clock, Flag, Pencil, Check, X } from 'lucide-react';
import { SavedRecording, AudioMarker } from '../types';
import { formatDuration, downloadBlob } from '../services/wavUtils';

interface RecordingListProps {
  recordings: SavedRecording[];
  onDelete: (id: string) => void;
  onUpdate: (recording: SavedRecording) => void;
}

const RecordingList: React.FC<RecordingListProps> = ({ recordings, onDelete, onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editingMarker, setEditingMarker] = useState<{ recId: string, markerId: number } | null>(null);
  const [markerLabel, setMarkerLabel] = useState('');

  const startRename = (rec: SavedRecording) => {
    setEditingId(rec.id);
    setEditName(rec.name);
  };

  const saveRename = (rec: SavedRecording) => {
    if (editName.trim()) {
      onUpdate({ ...rec, name: editName.trim() });
    }
    setEditingId(null);
  };

  const startEditMarker = (recId: string, marker: AudioMarker) => {
    setEditingMarker({ recId, markerId: marker.id });
    setMarkerLabel(marker.label);
  };

  const saveMarkerLabel = (rec: SavedRecording, markerId: number) => {
    const updatedMarkers = rec.markers.map(m => 
      m.id === markerId ? { ...m, label: markerLabel.trim() || `Marker ${m.id}` } : m
    );
    onUpdate({ ...rec, markers: updatedMarkers });
    setEditingMarker(null);
  };

  const handleShare = async (recording: SavedRecording) => {
    const file = new File([recording.blob], `${recording.name}.wav`, { type: 'audio/wav' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: recording.name, text: `VoiceRaptor Recording: ${recording.name}` });
      } catch (err) { console.error('Share failed', err); }
    } else {
      alert('Web Share API not supported or disabled in this browser.');
    }
  };

  if (recordings.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800/50 inline-block">
          <Clock className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No captures yet</p>
          <p className="text-slate-600 text-sm mt-1">Start recording to see your library</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 w-full px-1">
      {recordings.map((rec) => (
        <div key={rec.id} className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 flex flex-col gap-4 transition-all hover:bg-slate-900/60 hover:border-slate-700/60 shadow-lg group">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1 min-w-0 w-full">
              {editingId === rec.id ? (
                <div className="flex items-center gap-2 w-full max-w-md">
                   <input 
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveRename(rec)}
                    className="bg-slate-800 border border-cyan-500/50 rounded-lg px-3 py-1.5 text-slate-100 text-lg font-medium w-full focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                   />
                   <button onClick={() => saveRename(rec)} className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg shrink-0"><Check className="w-5 h-5" /></button>
                   <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-400/10 rounded-lg shrink-0"><X className="w-5 h-5" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/title">
                  <h3 className="font-semibold text-slate-100 text-lg truncate">{rec.name}</h3>
                  <button 
                    onClick={() => startRename(rec)} 
                    className="p-1.5 text-slate-600 hover:text-cyan-400 opacity-0 group-hover/title:opacity-100 transition-all rounded-md hover:bg-slate-800"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              
              <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(rec.timestamp).toLocaleDateString()}</span>
                <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-400">{formatDuration(rec.duration)}</span>
                {rec.markers.length > 0 && (
                  <span className="flex items-center gap-1 text-amber-500/80"><Flag className="w-3.5 h-3.5" /> {rec.markers.length} tags</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto md:ml-0">
               <button onClick={() => handleShare(rec)} className="p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-all"><Share2 className="w-5 h-5" /></button>
               <button onClick={() => downloadBlob(rec.blob, `${rec.name}.wav`)} className="p-2.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"><Download className="w-5 h-5" /></button>
               <button onClick={() => onDelete(rec.id)} className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center border-t border-slate-800/40 pt-3">
             <audio src={rec.url} controls className="h-9 flex-1 max-w-full rounded-lg filter invert hue-rotate-180 brightness-150 opacity-90 hover:opacity-100 transition-opacity" />
             
             {rec.markers.length > 0 && (
                <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                  {rec.markers.map((m) => (
                    <button 
                      key={m.id}
                      onClick={() => startEditMarker(rec.id, m)}
                      className={`group/marker relative flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all ${
                        editingMarker?.markerId === m.id && editingMarker.recId === rec.id
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-amber-500/30 hover:text-amber-400 hover:bg-amber-900/10'
                      }`}
                    >
                        {editingMarker?.markerId === m.id && editingMarker.recId === rec.id ? (
                           <div className="flex items-center gap-1">
                             <input 
                              autoFocus
                              value={markerLabel}
                              onChange={(e) => setMarkerLabel(e.target.value)}
                              onBlur={() => saveMarkerLabel(rec, m.id)}
                              onKeyDown={(e) => e.key === 'Enter' && saveMarkerLabel(rec, m.id)}
                              className="bg-transparent border-none focus:outline-none w-20"
                             />
                           </div>
                        ) : (
                          <>
                            <span className="opacity-60">{formatDuration(m.time)}</span>
                            <span className="max-w-[80px] truncate">{m.label}</span>
                          </>
                        )}
                    </button>
                  ))}
                </div>
             )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecordingList;