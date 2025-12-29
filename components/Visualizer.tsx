import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isRecording: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isRecording }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const historyRef = useRef<number[]>([]);

  // Reset history when recording starts
  useEffect(() => {
    if (isRecording) {
      historyRef.current = [];
    }
  }, [isRecording]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas when not recording or no analyser
    if (!analyser || !isRecording) {
      if (!isRecording && historyRef.current.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw a "ready" line
        ctx.beginPath();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        
        ctx.fillStyle = '#64748b';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Ready to record', canvas.width / 2, canvas.height / 2 - 10);
      }
      return;
    }

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    // Number of bars to display
    const BAR_COUNT = 60; 

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      // Calculate volume (RMS)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const x = (dataArray[i] - 128) / 128.0;
        sum += x * x;
      }
      const rms = Math.sqrt(sum / bufferLength);
      
      // Amplify for visibility and smooth
      const volume = Math.min(1, rms * 5);

      // Add to history
      historyRef.current.push(volume);
      if (historyRef.current.length > BAR_COUNT) {
        historyRef.current.shift();
      }

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.5)'; // Slate-900 with opacity
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const barWidth = width / BAR_COUNT;
      const gap = 2;
      const effectiveBarWidth = Math.max(1, barWidth - gap);

      // Draw center line guide
      ctx.beginPath();
      ctx.strokeStyle = '#334155'; // Slate-700
      ctx.lineWidth = 1;
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      historyRef.current.forEach((vol, i) => {
        // Calculate height based on volume
        const barH = Math.max(4, vol * height * 0.9); // At least 4px height
        
        const x = i * barWidth;
        const y = (height - barH) / 2;

        // Dynamic color
        if (vol > 0.8) {
             ctx.fillStyle = '#f87171'; // Red-400 (clipping/loud)
        } else {
             ctx.fillStyle = '#22d3ee'; // Cyan-400
        }

        ctx.beginPath();
        ctx.roundRect(x + (gap/2), y, effectiveBarWidth, barH, 4);
        ctx.fill();
      });
      
      // Draw playhead/current position indicator at the end
      if (historyRef.current.length > 0) {
           const lastX = (historyRef.current.length) * barWidth;
           ctx.shadowColor = '#22d3ee';
           ctx.shadowBlur = 10;
           ctx.fillStyle = '#cffafe';
           ctx.beginPath();
           ctx.arc(lastX, height/2, 2, 0, Math.PI*2);
           ctx.fill();
           ctx.shadowBlur = 0;
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isRecording]);

  return (
    <div className="w-full h-48 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner relative">
      <canvas
        ref={canvasRef}
        width={800} 
        height={300}
        className="w-full h-full block"
      />
    </div>
  );
};

export default Visualizer;