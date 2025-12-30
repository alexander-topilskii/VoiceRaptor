import React from 'react';
import { X, Smartphone, Trash2, ShieldAlert, Monitor, Info } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  wakeLockEnabled: boolean;
  onToggleWakeLock: () => void;
  onClearCache: () => void;
  installPrompt: any;
  onInstall: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  wakeLockEnabled,
  onToggleWakeLock,
  onClearCache,
  installPrompt,
  onInstall
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          
          {/* Screen Settings */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">Display & Recording</h3>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-800">
                <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-cyan-400" />
                    <div>
                        <div className="text-sm font-medium text-slate-200">Keep Screen On</div>
                        <div className="text-xs text-slate-500">Prevents screen sleep during recording</div>
                    </div>
                </div>
                <button 
                    onClick={onToggleWakeLock}
                    className={`w-11 h-6 flex items-center rounded-full transition-colors ${wakeLockEnabled ? 'bg-cyan-600' : 'bg-slate-700'}`}
                >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${wakeLockEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
          </div>

          {/* Storage */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">Storage & Data</h3>
            
            <div className="p-3 bg-amber-900/10 border border-amber-900/30 rounded-lg space-y-2">
                <div className="flex items-start gap-2 text-amber-500">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <p className="text-xs leading-relaxed">
                        Recordings are stored in your browser's local cache (IndexedDB). 
                        <strong> If you clear your browser data or cache, all recordings will be permanently lost.</strong>
                    </p>
                </div>
            </div>

            <button 
                onClick={() => {
                    if(confirm("Are you sure? This will delete ALL recordings permanently.")) {
                        onClearCache();
                    }
                }}
                className="w-full flex items-center justify-center gap-2 p-3 bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg transition-colors text-sm font-medium"
            >
                <Trash2 className="w-4 h-4" />
                Delete All Recordings
            </button>
          </div>

          {/* App */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">Application</h3>
            
            {installPrompt && (
                <button 
                    onClick={onInstall}
                    className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors text-left"
                >
                    <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-purple-400" />
                        <div>
                            <div className="text-sm font-medium text-slate-200">Install App</div>
                            <div className="text-xs text-slate-500">Add to home screen (PWA)</div>
                        </div>
                    </div>
                </button>
            )}

            <div className="flex items-center gap-3 p-3 text-slate-400">
                <Info className="w-5 h-5" />
                <div className="text-xs">
                    <p>Version 1.1.0</p>
                    <p>Local-first secure architecture</p>
                </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;