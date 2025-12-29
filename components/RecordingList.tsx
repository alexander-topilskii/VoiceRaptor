import React from 'react';
import { Share2, Download, Trash2, Clock, Flag } from 'lucide-react';
import { SavedRecording } from '../types.ts';
import { formatDuration, downloadBlob } from '../services/wavUtils.ts';

interface RecordingListProps {
  recordings: SavedRecording[];
  onDelete: (id: string) => void;
}

const RecordingList: React.FC<RecordingListProps> = ({ recordings, onDelete }) => {
  const handleShare = async (recording: SavedRecording) => {
    const file = new File([recording.blob], `${recording.name}.wav`, { type: 'audio/wav' });
    
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: recording.name,
          text: `Check out this audio recording I made!`,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      alert('Web Share API not supported on this browser or context.');
    }
  };

  if (recordings.length === 0) {
    return (
      <div className="text-center py-12 text-slate-600">
        <p>No recordings yet. Start recording to see them here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 w-full">
      {recordings.map((rec) => (
        <div key={rec.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:border-slate-700 hover:shadow-md">
          <div className="flex-1">
            <h3 className="font-medium text-slate-200 text-lg">{rec.name}</h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(rec.timestamp).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                {formatDuration(rec.duration)}
              </span>
               {rec.markers.length > 0 && (
                <span className="flex items-center gap-1 text-amber-500/80">
                  <Flag className="w-3 h-3" />
                  {rec.markers.length} markers
                </span>
              )}
            </div>
            
            {/* Visual marker list (small) */}
            {rec.markers.length > 0 && (
                 <div className="flex flex-wrap gap-2 mt-3">
                    {rec.markers.map((m) => (
                        <span key={m.id} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                            {formatDuration(m.time)}
                        </span>
                    ))}
                 </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
             <audio src={rec.url} controls className="h-8 w-48 opacity-70 hover:opacity-100 transition-opacity" />
             
            <button
              onClick={() => handleShare(rec)}
              className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/30 rounded-full transition-colors"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => downloadBlob(rec.blob, `${rec.name}.wav`)}
              className="p-2 text-slate-400 hover:text-green-400 hover:bg-green-950/30 rounded-full transition-colors"
              title="Download WAV"
            >
              <Download className="w-5 h-5" />
            </button>

            <button
              onClick={() => onDelete(rec.id)}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-full transition-colors"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecordingList;