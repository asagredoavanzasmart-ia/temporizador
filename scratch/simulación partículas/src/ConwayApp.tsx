import { useEffect, useRef, useState } from 'react';
import { ConwaySim } from './ConwaySim';
import type { PatternName } from './ConwaySim';
import './index.css';
import { Moon, Sun, Play, Pause, Shuffle, Trash2 } from 'lucide-react';

interface ConwayAppProps {
    goBack: () => void;
}

export default function ConwayApp({ goBack }: ConwayAppProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const simRef = useRef<ConwaySim | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    const [isPaused, setIsPaused] = useState(true);
    const [tickRate, setTickRate] = useState(15);
    const [brushSize, setBrushSize] = useState(15);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Init simulation
    useEffect(() => {
        if (!canvasRef.current) return;
        try {
            const canvas = canvasRef.current;
            const rect = canvas.parentElement?.getBoundingClientRect();
            if (rect) {
                canvas.width = rect.width;
                canvas.height = rect.height;
            }

            const sim = new ConwaySim(canvas);
            simRef.current = sim;

            sim.isPaused = isPaused;
            sim.tickRate = tickRate;
            sim.brushSize = brushSize;

            // Start blank
            sim.clear();
            sim.start();

            const handleResize = () => {
                const parent = canvas.parentElement;
                if (parent) {
                    canvas.width = parent.clientWidth;
                    canvas.height = parent.clientHeight;
                    simRef.current?.resize();
                }
            };

            window.addEventListener('resize', handleResize);
            return () => {
                window.removeEventListener('resize', handleResize);
                sim.stop();
            };
        } catch (err) {
            console.error(err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync state
    useEffect(() => {
        if (simRef.current) {
            simRef.current.isPaused = isPaused;
            simRef.current.tickRate = tickRate;
            simRef.current.brushSize = brushSize;
        }
    }, [isPaused, tickRate, brushSize]);

    // Mouse handlers for drawing
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!simRef.current || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        simRef.current.isDrawing = true;
        simRef.current.brushPos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleMouseUp = () => {
        if (simRef.current) {
            simRef.current.isDrawing = false;
            simRef.current.brushPos = { x: -1000, y: -1000 };
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!simRef.current || !canvasRef.current || !simRef.current.isDrawing) return;
        const rect = canvasRef.current.getBoundingClientRect();
        simRef.current.brushPos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const randomize = () => {
        if (simRef.current) simRef.current.randomize(0.15);
    };

    const clearGrid = () => {
        if (simRef.current) simRef.current.clear();
        setIsPaused(true);
    };

    const spawnPattern = (name: PatternName) => {
        if (simRef.current) {
            simRef.current.spawnPattern(name);
        }
    };

    return (
        <div className="app-container">
            {/* LEFT CONTROLS PANEL */}
            <aside className="controls-panel">
                <div className="panel-header">
                    <h1 className="panel-title">Polvo Cósmico</h1>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button className="theme-toggle-btn" onClick={goBack} title="Volver al Inicio">
                            ← Volver
                        </button>
                        <button className="theme-toggle-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Cambiar Tema">
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    </div>
                </div>

                <div>
                    <h2 className="section-title">Controles Globales</h2>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button className="primary-btn outline" onClick={() => setIsPaused(!isPaused)} title={isPaused ? "Reanudar" : "Pausar"}>
                            {isPaused ? <><Play size={14} /> Reanudar</> : <><Pause size={14} /> Pausa</>}
                        </button>
                        <button className="primary-btn outline" onClick={randomize} title="Generar Sopa Primordial">
                            <Shuffle size={14} /> Caos
                        </button>
                        <button className="primary-btn outline" onClick={clearGrid} title="Limpiar y Detener">
                            <Trash2 size={14} /> Limpiar
                        </button>
                    </div>
                </div>

                <div>
                    <h2 className="section-title mt-md">Ajustes</h2>
                    <div className="slider-group">
                        <div className="slider-row">
                            <span className="slider-label" style={{ minWidth: '100px' }}>Velocidad (FPS)</span>
                            <input type="range" min="1" max="60" step="1" value={tickRate} onChange={(e) => setTickRate(parseInt(e.target.value, 10))} />
                            <span className="slider-value">{tickRate}</span>
                        </div>
                        <div className="slider-row">
                            <span className="slider-label" style={{ minWidth: '100px' }}>Pincel Divino</span>
                            <input type="range" min="1" max="100" step="1" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value, 10))} />
                            <span className="slider-value">{brushSize}px</span>
                        </div>
                    </div>
                </div>

                <div className="mt-md">
                    <h2 className="section-title">Patrones Iniciales</h2>

                    <p className="text-xs color-secondary" style={{ marginBottom: '8px' }}>Planeadores</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('glider')} title="El planeador original de Conway">Glider</button>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('lwss')} title="Nave espacial ligera (LWSS)">LWSS</button>
                    </div>

                    <p className="text-xs color-secondary" style={{ marginBottom: '8px' }}>Osciladores</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('blinker')} title="Oscilador de período 2">Blinker</button>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('toad')} title="Sapo — Oscilador de período 2">Sapo</button>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('beacon')} title="Faro — Oscilador de período 2">Faro</button>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('pulsar')} title="Pulsar — Oscilador de período 3">Pulsar</button>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('pentadecathlon')} title="Pentadecatlón — Período 15">Pentadecatlón</button>
                    </div>

                    <p className="text-xs color-secondary" style={{ marginBottom: '8px' }}>Patrones Caóticos</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('rpentomino')} title="R-Pentomino — Caos durante 1103 gen.">R-Pentomino</button>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('acorn')} title="Bellota — Crecimiento explosivo">Bellota</button>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('diehard')} title="Diehard — Muere en 130 gen.">Diehard</button>
                    </div>

                    <p className="text-xs color-secondary" style={{ marginBottom: '8px' }}>Generadores</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('gosperGun')} title="Cañón de Gosper — Genera un glider cada 30 gen.">Cañón de Gosper</button>
                    </div>
                </div>

                <div className="mt-md">
                    <p className="text-xs color-secondary" style={{ lineHeight: '1.5' }}>
                        Dibuja sobre el lienzo oscuro arrastrando el ratón ("Pincel Divino"). Las células vivas interactúan constantemente a 60 FPS aceleradas por la GPU.
                        <br /><br />
                        Reglas de Conway:
                        <br />- Una célula sobrevive si tiene 2 o 3 vecinos.
                        <br />- Una célula nace si tiene exactamente 3 vecinos.
                        <br />- En cualquier otro caso, muere por soledad o sobrepoblación.
                    </p>
                </div>

            </aside>

            {/* WEBGL CANVAS CONTAINER */}
            <main
                className="canvas-container"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onMouseMove={handleMouseMove}
                style={{ cursor: 'crosshair' }}
            >
                <canvas ref={canvasRef} className="simulation-canvas" />
            </main>
        </div>
    );
}
