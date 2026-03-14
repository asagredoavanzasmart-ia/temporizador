import { useEffect, useRef, useState } from 'react';
import { createInitialState, updateSimulation, drawSimulation, Particle, Ribosome, ARN } from './ReplicatorEngine';
import type { SimState } from './ReplicatorEngine';
import './index.css';
import { Moon, Sun, Play, Pause, RefreshCw } from 'lucide-react';

interface ReplicatorAppProps {
    goBack: () => void;
}

export default function ReplicatorApp({ goBack }: ReplicatorAppProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef<SimState | null>(null);
    const reqRef = useRef<number | null>(null);

    const [isPaused, setIsPaused] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [temperature, setTemperature] = useState(1);
    const [repulsion, setRepulsion] = useState(1.5);



    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const handleResize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                if (stateRef.current) {
                    stateRef.current.width = canvas.width;
                    stateRef.current.height = canvas.height;
                }
            }
        };

        handleResize();

        if (!stateRef.current) {
            stateRef.current = createInitialState(canvas.width, canvas.height);
        }

        const loop = () => {
            if (stateRef.current && ctx) {
                stateRef.current.speed = isPaused ? 0 : speed;
                stateRef.current.temperature = temperature;
                stateRef.current.repulsion = repulsion;
                updateSimulation(stateRef.current);
                drawSimulation(ctx, stateRef.current);
            }
            reqRef.current = requestAnimationFrame(loop);
        };

        reqRef.current = requestAnimationFrame(loop);
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (reqRef.current) cancelAnimationFrame(reqRef.current);
        };
    }, [isPaused, speed, temperature]);

    const handleReset = () => {
        if (canvasRef.current) {
            stateRef.current = createInitialState(canvasRef.current.width, canvasRef.current.height);
            setIsPaused(false);
        }
    };

    const addParticles = () => {
        if (!stateRef.current) return;
        const w = stateRef.current.width; const h = stateRef.current.height;
        for (let i = 0; i < 50; i++) {
            stateRef.current.particles.push(new Particle(Math.random() * w, Math.random() * h, ['B', 'R', 'Y'][Math.floor(Math.random() * 3)]));
        }
    };

    const removeParticles = () => {
        if (!stateRef.current) return;
        stateRef.current.particles = stateRef.current.particles.slice(0, Math.max(0, stateRef.current.particles.length - 50));
    };

    const addRibosome = () => {
        if (!stateRef.current) return;
        const w = stateRef.current.width; const h = stateRef.current.height;
        stateRef.current.ribosomes.push(new Ribosome(w * (0.2 + 0.6 * Math.random()), h * (0.2 + 0.6 * Math.random()), Math.random() > 0.5 ? 1 : 2));
    };

    const removeRibosome = () => {
        if (!stateRef.current) return;
        if (stateRef.current.ribosomes.length > 0) stateRef.current.ribosomes.pop();
    };

    const addARN = () => {
        if (!stateRef.current) return;
        const w = stateRef.current.width; const h = stateRef.current.height;
        stateRef.current.arns.push(new ARN(w * (0.2 + 0.6 * Math.random()), h * (0.2 + 0.6 * Math.random()), Math.random() > 0.5 ? 1 : 2));
    };

    const removeARN = () => {
        if (!stateRef.current) return;
        if (stateRef.current.arns.length > 0) stateRef.current.arns.pop();
    };

    return (
        <div className="app-container">
            <aside className="controls-panel">
                <div className="panel-header">
                    <h1 className="panel-title">Polvo Cósmico</h1>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button className="theme-toggle-btn" onClick={goBack} title="Volver al Inicio">
                            ← Volver
                        </button>
                    </div>
                </div>

                <div>
                    <h2 className="section-title">Fábrica de Ribosomas (V2)</h2>
                    <p className="text-xs color-secondary" style={{ marginBottom: '16px' }}>
                        Simulación de ensamble industrial con máquinas de estados (ReplicatorEngine).
                    </p>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button className="primary-btn outline" onClick={() => setIsPaused(!isPaused)}>
                            {isPaused ? <><Play size={14} /> Reanudar</> : <><Pause size={14} /> Pausa</>}
                        </button>
                        <button className="primary-btn outline" onClick={handleReset}>
                            <RefreshCw size={14} /> Reiniciar
                        </button>
                    </div>
                </div>

                <div>
                    <h2 className="section-title mt-md">Cinemática y Termodinámica</h2>
                    <div className="slider-group">
                        <div className="slider-row">
                            <span className="slider-label" style={{ minWidth: '100px' }}>Velocidad (T)</span>
                            <input type="range" min="0.1" max="3" step="0.1" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} />
                            <span className="slider-value">{speed.toFixed(1)}x</span>
                        </div>
                        <div className="slider-row">
                            <span className="slider-label" style={{ minWidth: '100px' }}>Temperatura</span>
                            <input type="range" min="0" max="5" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} />
                            <span className="slider-value">{temperature.toFixed(1)}k</span>
                        </div>
                        <div className="slider-row">
                            <span className="slider-label" style={{ minWidth: '100px' }}>Repulsión</span>
                            <input type="range" min="0.1" max="10" step="0.1" value={repulsion} onChange={(e) => setRepulsion(parseFloat(e.target.value))} />
                            <span className="slider-value">{repulsion.toFixed(1)}f</span>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="section-title mt-md">Inyección de Elementos</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="primary-btn" style={{ flex: 1, padding: '4px 8px' }} onClick={addParticles}>+50 Partículas</button>
                            <button className="primary-btn outline" style={{ flex: 1, padding: '4px 8px' }} onClick={removeParticles}>-50 Partículas</button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="primary-btn" style={{ flex: 1, padding: '4px 8px' }} onClick={addRibosome}>+1 Ribosoma</button>
                            <button className="primary-btn outline" style={{ flex: 1, padding: '4px 8px' }} onClick={removeRibosome}>-1 Ribosoma</button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="primary-btn" style={{ flex: 1, padding: '4px 8px' }} onClick={addARN}>+1 ARN</button>
                            <button className="primary-btn outline" style={{ flex: 1, padding: '4px 8px' }} onClick={removeARN}>-1 ARN</button>
                        </div>
                    </div>
                </div>

            </aside>

            <main className="canvas-container">
                <canvas ref={canvasRef} className="simulation-canvas" />
            </main>
        </div>
    );
}
