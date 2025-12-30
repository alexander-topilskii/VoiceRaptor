import React, { useEffect, useRef } from 'react';
import { AudioMarker } from '../types';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isRecording: boolean;
  amplitudeHistory: number[];
  markers: AudioMarker[];
  duration: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isRecording, amplitudeHistory, markers, duration }) => {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const overviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const liveHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    if (isRecording) {
      liveHistoryRef.current = [];
    }
  }, [isRecording]);

  useEffect(() => {
    const mainCanvas = mainCanvasRef.current;
    const overviewCanvas = overviewCanvasRef.current;
    if (!mainCanvas || !overviewCanvas) return;
    
    const mainCtx = mainCanvas.getContext('2d');
    const overviewCtx = overviewCanvas.getContext('2d');
    if (!mainCtx || !overviewCtx) return;

    if (!isRecording && liveHistoryRef.current.length === 0) {
        mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        overviewCtx.clearRect(0, 0, overviewCanvas.width, overviewCanvas.height);
        
        mainCtx.beginPath();
        mainCtx.strokeStyle = '#1e293b';
        mainCtx.lineWidth = 2;
        mainCtx.setLineDash([5, 5]);
        mainCtx.moveTo(0, mainCanvas.height / 2);
        mainCtx.lineTo(mainCanvas.width, mainCanvas.height / 2);
        mainCtx.stroke();
        mainCtx.setLineDash([]);
        
        mainCtx.fillStyle = '#64748b';
        mainCtx.font = '500 14px Inter, sans-serif';
        mainCtx.textAlign = 'center';
        mainCtx.fillText('READY TO CAPTURE', mainCanvas.width / 2, mainCanvas.height / 2 - 15);
        return;
    }

    const bufferLength = analyser ? analyser.fftSize : 0;
    const dataArray = new Uint8Array(bufferLength);
    const BAR_COUNT = 80;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      if (analyser && isRecording) {
          analyser.getByteTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            const x = (dataArray[i] - 128) / 128.0;
            sum += x * x;
          }
          const rms = Math.sqrt(sum / bufferLength);
          const volume = Math.min(1, rms * 6);
          liveHistoryRef.current.push(volume);
          if (liveHistoryRef.current.length > BAR_COUNT) {
            liveHistoryRef.current.shift();
          }
      }

      // --- Main Visualizer Drawing ---
      mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
      const mWidth = mainCanvas.width;
      const mHeight = mainCanvas.height;
      const mBarWidth = mWidth / BAR_COUNT;
      const mGap = 3;
      const mEffectiveBarWidth = Math.max(2, mBarWidth - mGap);

      // Symmetrical Mirror Bars
      liveHistoryRef.current.forEach((vol, i) => {
        const barH = Math.max(4, vol * mHeight * 0.85);
        const x = i * mBarWidth + (mGap / 2);
        const yCenter = mHeight / 2;
        
        // Gradient
        const gradient = mainCtx.createLinearGradient(x, yCenter - barH/2, x, yCenter + barH/2);
        if (vol > 0.7) {
            gradient.addColorStop(0, '#f43f5e'); // Rose 500
            gradient.addColorStop(0.5, '#fb7185'); 
            gradient.addColorStop(1, '#f43f5e');
        } else {
            gradient.addColorStop(0, '#06b6d4'); // Cyan 500
            gradient.addColorStop(0.5, '#22d3ee');
            gradient.addColorStop(1, '#06b6d4');
        }

        mainCtx.shadowBlur = vol > 0.4 ? 15 : 0;
        mainCtx.shadowColor = vol > 0.7 ? 'rgba(244, 63, 94, 0.4)' : 'rgba(6, 182, 212, 0.4)';
        
        mainCtx.fillStyle = gradient;
        mainCtx.beginPath();
        mainCtx.roundRect(x, yCenter - barH / 2, mEffectiveBarWidth, barH, mEffectiveBarWidth / 2);
        mainCtx.fill();
        
        mainCtx.shadowBlur = 0;
      });

      // --- Overview Mini-map Drawing ---
      overviewCtx.clearRect(0, 0, overviewCanvas.width, overviewCanvas.height);
      const oWidth = overviewCanvas.width;
      const oHeight = overviewCanvas.height;

      overviewCtx.beginPath();
      overviewCtx.strokeStyle = '#1e293b';
      overviewCtx.lineWidth = 1;
      overviewCtx.moveTo(0, oHeight / 2);
      overviewCtx.lineTo(oWidth, oHeight / 2);
      overviewCtx.stroke();

      if (amplitudeHistory.length > 0) {
          const step = Math.ceil(amplitudeHistory.length / oWidth);
          overviewCtx.fillStyle = '#334155';
          for (let i = 0; i < oWidth; i++) {
              const dataIndex = Math.floor(i * (amplitudeHistory.length / oWidth));
              let maxVol = 0;
              for(let j=0; j < step && (dataIndex+j) < amplitudeHistory.length; j++) {
                  maxVol = Math.max(maxVol, amplitudeHistory[dataIndex+j]);
              }
              const barH = Math.max(2, maxVol * (oHeight - 10));
              overviewCtx.fillRect(i, (oHeight - barH) / 2, 1, barH);
          }
      }

      // Markers
      if (duration > 0 && markers.length > 0) {
          markers.forEach(marker => {
              const x = (marker.time / duration) * oWidth;
              overviewCtx.beginPath();
              overviewCtx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
              overviewCtx.lineWidth = 1.5;
              overviewCtx.moveTo(x, 0);
              overviewCtx.lineTo(x, oHeight);
              overviewCtx.stroke();
              
              overviewCtx.beginPath();
              overviewCtx.fillStyle = '#f59e0b';
              overviewCtx.arc(x, oHeight / 2, 3.5, 0, Math.PI * 2);
              overviewCtx.fill();
          });
      }
    };

    draw();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isRecording, markers, duration, amplitudeHistory]);

  return (
    <div className="w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800/50 shadow-2xl flex flex-col">
      <div className="h-14 bg-slate-900/30 border-b border-slate-800/50 relative">
          <canvas ref={overviewCanvasRef} width={1000} height={56} className="w-full h-full block" />
      </div>
      <div className="h-44 relative bg-gradient-to-b from-slate-900/20 to-slate-950">
        <canvas ref={mainCanvasRef} width={1000} height={176} className="w-full h-full block" />
      </div>
    </div>
  );
};

export default Visualizer;