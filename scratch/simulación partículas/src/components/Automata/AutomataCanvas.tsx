import React, { useEffect, useRef } from 'react';
import { AutomataEngine as ParticleEngine, MAX_BONDS } from '../../models/AutomataEngine';

interface ParticleCanvasProps {
  engine: ParticleEngine | null;
  colors: string[];
  isPlaying: boolean;
  animationSpeed: number;
}

export const AutomataCanvas: React.FC<ParticleCanvasProps> = ({ engine, colors, isPlaying, animationSpeed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !engine) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Set canvas internal resolution to match display size
    const updateSize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    let animationFrameId: number;

    const render = () => {
      if (isPlaying) {
        for (let i = 0; i < animationSpeed; i++) {
          engine.update();
        }
      }

      // Clear background
      ctx.fillStyle = '#020617'; // slate-950
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw bonds
      ctx.lineWidth = 1.5;
      for (let i = 0; i < engine.numParticles; i++) {
        const count = engine.bondCounts[i];
        if (count > 0) {
          const xi = engine.x[i];
          const yi = engine.y[i];
          ctx.strokeStyle = colors[engine.color[i]] + '60'; // 37% opacity
          ctx.beginPath();
          for (let b = 0; b < count; b++) {
            const j = engine.bonds[i * MAX_BONDS + b];
            if (j > i) {
              let xj = engine.x[j];
              let yj = engine.y[j];
              
              let dx = xj - xi;
              let dy = yj - yi;
              if (Math.abs(dx) > engine.width / 2 || Math.abs(dy) > engine.height / 2) {
                continue;
              }
              
              ctx.moveTo(xi, yi);
              ctx.lineTo(xj, yj);
            }
          }
          ctx.stroke();
        }
      }

      // Draw particles
      for (let c = 0; c < engine.numColors; c++) {
        ctx.fillStyle = colors[c];
        ctx.beginPath();
        for (let i = 0; i < engine.numParticles; i++) {
          if (engine.color[i] === c) {
            ctx.rect(engine.x[i] - 1.5, engine.y[i] - 1.5, 3, 3);
          }
        }
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', updateSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [engine, colors, isPlaying, animationSpeed]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  );
};
