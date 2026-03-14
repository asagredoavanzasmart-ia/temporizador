import { useEffect, useRef, useState } from 'react';
import { ConwaySim } from './ConwaySim';
import type { PatternName } from './ConwaySim';
import './index.css';
import { Play, Pause, Shuffle, Trash2, ZoomIn, ZoomOut, Grid } from 'lucide-react';

interface ConwayAppProps {
    goBack: () => void;
}

export default function ConwayApp({ goBack }: ConwayAppProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const simRef = useRef<ConwaySim | null>(null);

    const [isPaused, setIsPaused] = useState(true);
    const [tickRate, setTickRate] = useState(15);
    const [brushSize, setBrushSize] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [boardSize, setBoardSize] = useState(500);

    // ── Iniciación del motor ────────────────────────────────────────────────
    useEffect(() => {
        if (!canvasRef.current) return;
        try {
            const canvas = canvasRef.current;
            canvas.width = boardSize;
            canvas.height = boardSize;

            const sim = new ConwaySim(canvas);
            simRef.current = sim;

            sim.isPaused = isPaused;
            sim.tickRate = tickRate;
            sim.brushSize = brushSize;

            sim.clear();
            sim.start();

            return () => { sim.stop(); };
        } catch (err) {
            console.error(err);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Sincronizar parámetros de juego ────────────────────────────────────
    useEffect(() => {
        if (simRef.current) {
            simRef.current.isPaused = isPaused;
            simRef.current.tickRate = tickRate;
            simRef.current.brushSize = brushSize;
        }
    }, [isPaused, tickRate, brushSize]);

    // ── Redimensionar tablero cuando cambia boardSize ──────────────────────
    useEffect(() => {
        if (!canvasRef.current || !simRef.current) return;
        canvasRef.current.width = boardSize;
        canvasRef.current.height = boardSize;
        simRef.current.resize();
        simRef.current.clear();
    }, [boardSize]);

    // ── Helper: coordenadas CSS → espacio lógico del canvas ───────────────
    // getBoundingClientRect() ya devuelve las medidas visuales con CSS scale aplicado,
    // por lo que scaleX = canvas.width / rect.width = 1 / zoom (correcto).
    const getCanvasCoords = (e: React.MouseEvent) => {
        if (!canvasRef.current) return { x: -1, y: -1 };
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    };

    // ── Handlers del mouse ─────────────────────────────────────────────────
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!simRef.current) return;
        // Boton 0 = izquierdo (encender) | Botón 2 = derecho (apagar)
        simRef.current.brushMode = e.button === 2 ? 'erase' : 'draw';
        simRef.current.isDrawing = true;
        simRef.current.brushPos = getCanvasCoords(e);
    };

    const handleMouseUp = () => {
        if (simRef.current) {
            simRef.current.isDrawing = false;
            simRef.current.brushPos = { x: -1000, y: -1000 };
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!simRef.current || !simRef.current.isDrawing) return;
        simRef.current.brushPos = getCanvasCoords(e);
    };

    // ── Acciones rápidas ───────────────────────────────────────────────────
    const randomize = () => { if (simRef.current) simRef.current.randomize(0.15); };
    const clearGrid = () => { if (simRef.current) simRef.current.clear(); setIsPaused(true); };
    const spawnPattern = (name: PatternName) => { if (simRef.current) simRef.current.spawnPattern(name); };

    const zoomIn  = () => setZoom(z => Math.min(8, parseFloat((z * 1.5).toFixed(2))));
    const zoomOut = () => setZoom(z => Math.max(0.25, parseFloat((z / 1.5).toFixed(2))));
    const zoomReset = () => setZoom(1);

    return (
        <div className="app-container">
            {/* ── PANEL IZQUIERDO ──────────────────────────────────────────── */}
            <aside className="controls-panel">
                <div className="panel-header">
                    <h1 className="panel-title">Polvo Cósmico</h1>
                    <button className="theme-toggle-btn" onClick={goBack} title="Volver al Inicio">
                        ← Volver
                    </button>
                </div>

                {/* Controles globales */}
                <div>
                    <h2 className="section-title">Controles Globales</h2>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button className="primary-btn outline" onClick={() => setIsPaused(!isPaused)}>
                            {isPaused ? <><Play size={14} /> Reanudar</> : <><Pause size={14} /> Pausa</>}
                        </button>
                        <button className="primary-btn outline" onClick={randomize}>
                            <Shuffle size={14} /> Caos
                        </button>
                        <button className="primary-btn outline" onClick={clearGrid}>
                            <Trash2 size={14} /> Limpiar
                        </button>
                    </div>
                </div>

                {/* ── ZOOM ──────────────────────────────────────────────── */}
                <div className="mt-md">
                    <h2 className="section-title">
                        <ZoomIn size={12} style={{ display: 'inline', marginRight: 4 }} />
                        Zoom
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <button
                            className="icon-btn"
                            onClick={zoomOut}
                            title="Alejar"
                            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <ZoomOut size={13} />
                        </button>
                        <input
                            type="range"
                            min={0.25} max={8} step={0.25}
                            value={zoom}
                            onChange={e => setZoom(parseFloat(e.target.value))}
                            style={{ flex: 1 }}
                        />
                        <button
                            className="icon-btn"
                            onClick={zoomIn}
                            title="Acercar"
                            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <ZoomIn size={13} />
                        </button>
                        <button
                            className="icon-btn"
                            onClick={zoomReset}
                            title="1:1"
                            style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', height: '22px', color: '#FF8C00', border: '1px solid rgba(255,140,0,0.4)' }}
                        >
                            {zoom.toFixed(2)}×
                        </button>
                    </div>
                </div>

                {/* ── TAMAÑO DEL TABLERO ────────────────────────────────── */}
                <div className="mt-md">
                    <h2 className="section-title">
                        <Grid size={12} style={{ display: 'inline', marginRight: 4 }} />
                        Tablero
                    </h2>
                    <div className="slider-group">
                        <div className="slider-row">
                            <span className="slider-label" style={{ minWidth: '55px' }}>Celdas</span>
                            <input
                                type="range"
                                min={50} max={1000} step={50}
                                value={boardSize}
                                onChange={e => setBoardSize(parseInt(e.target.value, 10))}
                            />
                            <span className="slider-value">{boardSize}×{boardSize}</span>
                        </div>
                        <p style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                            {(boardSize * boardSize).toLocaleString()} celdas · ↑ tamaño = más lento
                        </p>
                    </div>
                </div>

                {/* ── AJUSTES ───────────────────────────────────────────── */}
                <div>
                    <h2 className="section-title mt-md">Ajustes</h2>
                    <div className="slider-group">
                        <div className="slider-row">
                            <span className="slider-label" style={{ minWidth: '100px' }}>Velocidad (FPS)</span>
                            <input type="range" min="1" max="60" step="1" value={tickRate}
                                onChange={e => setTickRate(parseInt(e.target.value, 10))} />
                            <span className="slider-value">{tickRate}</span>
                        </div>
                        <div className="slider-row">
                            <span className="slider-label" style={{ minWidth: '100px' }}>Pincel Divino</span>
                            <input type="range" min="1" max="200" step="1" value={brushSize}
                                onChange={e => setBrushSize(parseInt(e.target.value, 10))} />
                            <span className="slider-value">{brushSize === 1 ? '1 cel' : `r${brushSize - 1}`}</span>
                        </div>
                    </div>
                </div>

                {/* ── PATRONES ──────────────────────────────────────────── */}
                <div className="mt-md">
                    <h2 className="section-title">Patrones Iniciales</h2>

                    <p className="text-xs color-secondary" style={{ marginBottom: '8px' }}>Planeadores</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('glider')}>Glider</button>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('lwss')}>LWSS</button>
                    </div>

                    <p className="text-xs color-secondary" style={{ marginBottom: '8px' }}>Osciladores</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('blinker')}>Blinker</button>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('toad')}>Sapo</button>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('beacon')}>Faro</button>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('pulsar')}>Pulsar</button>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('pentadecathlon')}>Pentadecatlón</button>
                    </div>

                    <p className="text-xs color-secondary" style={{ marginBottom: '8px' }}>Patrones Caóticos</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('rpentomino')}>R-Pentomino</button>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('acorn')}>Bellota</button>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('diehard')}>Diehard</button>
                    </div>

                    <p className="text-xs color-secondary" style={{ marginBottom: '8px' }}>Generadores</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button className="primary-btn outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => spawnPattern('gosperGun')}>Cañón de Gosper</button>
                    </div>
                </div>

                <div className="mt-md">
                    <p className="text-xs color-secondary" style={{ lineHeight: '1.5' }}>
                        Dibuja arrastrando el ratón. Reglas de Conway:<br />
                        – Sobrevive con 2 o 3 vecinos.<br />
                        – Nace con exactamente 3 vecinos.<br />
                        – Muere por soledad o sobrepoblación.
                    </p>
                </div>
            </aside>

            {/* ── LIENZO ──────────────────────────────────────────────────── */}
            <main
                className="canvas-container"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onMouseMove={handleMouseMove}
                onContextMenu={e => e.preventDefault()}
                style={{ cursor: 'crosshair', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                {/*
                  El wrapper aplica el zoom como CSS transform.
                  getBoundingClientRect() en el canvas ya devuelve las medidas visuales
                  con el scale aplicado, por lo que getCanvasCoords() funciona sin ajustes.
                */}
                <div style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center center',
                    display: 'inline-block',
                    lineHeight: 0,
                    transition: 'transform 0.15s ease',
                }}>
                    <canvas
                        ref={canvasRef}
                        style={{ imageRendering: 'pixelated', display: 'block' }}
                    />
                </div>
            </main>
        </div>
    );
}
