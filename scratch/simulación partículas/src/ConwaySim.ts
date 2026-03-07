/**
 * ConwaySim.ts
 * Motor del Juego de la Vida de Conway.
 * Implementación Canvas 2D de alto rendimiento usando Uint8Array ping-pong
 * para evitar complejidades de compatibilidad cross-browser con WebGL.
 */

export class ConwaySim {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    private width: number = 0;
    private height: number = 0;

    // Dos buffers para ping-pong de estado
    private cells: Uint8Array = new Uint8Array(0);
    private nextCells: Uint8Array = new Uint8Array(0);

    // Estado de ejecución
    private reqId: number = 0;
    private lastTick: number = 0;

    // Propiedades públicas
    public tickRate: number = 15; // ticks por segundo
    public isPaused: boolean = true;
    public isDrawing: boolean = false;
    public brushPos: { x: number; y: number } = { x: -1, y: -1 };
    public brushSize: number = 15;

    // Colores (hex strings)
    public colorAlive: string = '#2563eb';
    public colorDead: string = '#07090f';

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D no soportado.');
        this.ctx = ctx;
        this.resize();
    }

    /** Redimensiona los buffers al tamaño actual del canvas */
    public resize() {
        const newW = this.canvas.width;
        const newH = this.canvas.height;
        if (newW === this.width && newH === this.height) return;
        this.width = newW;
        this.height = newH;
        const size = this.width * this.height;
        this.cells = new Uint8Array(size);
        this.nextCells = new Uint8Array(size);
    }

    /** Genera vida aleatoria en la cuadrícula */
    public randomize(density: number = 0.2) {
        this.syncDimensions();
        const size = this.width * this.height;
        for (let i = 0; i < size; i++) {
            this.cells[i] = Math.random() < density ? 1 : 0;
        }
        this.forceDraw();
    }

    /** Limpia toda la cuadrícula */
    public clear() {
        this.syncDimensions();
        this.cells.fill(0);
        this.nextCells.fill(0);
        this.forceDraw();
    }

    /** Sincroniza width/height con el canvas sin borrar datos */
    private syncDimensions() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        if (cw !== this.width || ch !== this.height) {
            this.width = cw;
            this.height = ch;
            const size = cw * ch;
            this.cells = new Uint8Array(size);
            this.nextCells = new Uint8Array(size);
        }
    }

    /** Fuerza un renderizado inmediato (útil mientras la sim está pausada) */
    public forceDraw() {
        this.draw();
    }

    /**
     * Estampa un patrón clásico en el centro de la cuadrícula.
     * Cada patrón es un array de coordenadas [dx, dy] relativas al centro.
     */
    public spawnPattern(name: PatternName) {
        this.syncDimensions();
        const pattern = PATTERNS[name];
        if (!pattern) return;

        const cx = Math.floor(this.width / 2);
        const cy = Math.floor(this.height / 2);
        const w = this.width;
        const h = this.height;

        if (w === 0 || h === 0) return;

        for (const [dx, dy] of pattern) {
            const px = (cx + dx + w) % w;
            const py = (cy + dy + h) % h;
            this.cells[py * w + px] = 1;
        }
        this.forceDraw();
    }

    /** Pinta células vivas en la posición del pincel */
    private applyBrush() {
        if (!this.isDrawing || this.brushPos.x < 0) return;
        const bx = Math.round(this.brushPos.x);
        const by = Math.round(this.brushPos.y);
        const br = Math.ceil(this.brushSize / 2);
        const w = this.width;
        const h = this.height;

        for (let dy = -br; dy <= br; dy++) {
            for (let dx = -br; dx <= br; dx++) {
                if (dx * dx + dy * dy <= br * br) {
                    const nx = (bx + dx + w) % w;
                    const ny = (by + dy + h) % h;
                    this.cells[ny * w + nx] = 1;
                }
            }
        }
    }

    /** Ejecuta un tick de lógica de Conway */
    private step() {
        const w = this.width;
        const h = this.height;
        const curr = this.cells;
        const next = this.nextCells;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                // Índices de vecinos con toroide wrap
                const xL = (x - 1 + w) % w;
                const xR = (x + 1) % w;
                const yU = (y - 1 + h) % h;
                const yD = (y + 1) % h;

                const neighbors =
                    curr[yU * w + xL] + curr[yU * w + x] + curr[yU * w + xR] +
                    curr[y * w + xL] + curr[y * w + xR] +
                    curr[yD * w + xL] + curr[yD * w + x] + curr[yD * w + xR];

                const me = curr[y * w + x];

                if (me === 1) {
                    next[y * w + x] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
                } else {
                    next[y * w + x] = (neighbors === 3) ? 1 : 0;
                }
            }
        }

        // Swap buffers
        const tmp = this.cells;
        this.cells = next;
        this.nextCells = tmp;
    }

    /** Renderiza en Canvas 2D usando ImageData */
    private draw() {
        const w = this.width;
        const h = this.height;
        const cells = this.cells;

        // Construir ImageData directamente (mucho más rápido que fillRect por célula)
        const imgData = this.ctx.createImageData(w, h);
        const buf = imgData.data; // Uint8ClampedArray RGBA

        // Parsear colores hex a RGB
        const alive = hexToRgb(this.colorAlive);
        const dead = hexToRgb(this.colorDead);

        for (let i = 0; i < w * h; i++) {
            const px = i * 4;
            if (cells[i] === 1) {
                buf[px] = alive.r;
                buf[px + 1] = alive.g;
                buf[px + 2] = alive.b;
                buf[px + 3] = 255;
            } else {
                buf[px] = dead.r;
                buf[px + 1] = dead.g;
                buf[px + 2] = dead.b;
                buf[px + 3] = 255;
            }
        }

        this.ctx.putImageData(imgData, 0, 0);
    }

    public render = (time: number) => {
        // Paso de pincel (siempre activo)
        this.applyBrush();

        // Paso lógico de Conway
        if (!this.isPaused) {
            const interval = 1000 / this.tickRate;
            if (time - this.lastTick >= interval) {
                this.step();
                this.lastTick = time;
            }
        }

        // Renderizado
        this.draw();

        this.reqId = requestAnimationFrame(this.render);
    };

    public start() {
        this.lastTick = performance.now();
        this.reqId = requestAnimationFrame(this.render);
    }

    public stop() {
        cancelAnimationFrame(this.reqId);
    }
}

/** Convierte color hex '#RRGGBB' a {r, g, b} */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : { r: 0, g: 0, b: 0 };
}

// ─── Catálogo de Patrones Clásicos ────────────────────────────────────────────
export type PatternName =
    | 'glider'
    | 'lwss'
    | 'blinker'
    | 'toad'
    | 'beacon'
    | 'pulsar'
    | 'pentadecathlon'
    | 'rpentomino'
    | 'gosperGun'
    | 'diehard'
    | 'acorn';

/** Coordenadas [dx, dy] relativas al centro. */
const PATTERNS: Record<PatternName, [number, number][]> = {

    // ── Planeadores ─────────────────────────────────────────────────────────
    glider: [
        [0, -1], [1, 0], [-1, 1], [0, 1], [1, 1]
    ],

    // Ligera nave espacial (LWSS)
    lwss: [
        [-2, -1], [1, -1],
        [2, 0],
        [-2, 1], [2, 1],
        [-1, 2], [0, 2], [1, 2], [2, 2],
    ],

    // ── Osciladores ─────────────────────────────────────────────────────────
    blinker: [
        [-1, 0], [0, 0], [1, 0]
    ],

    toad: [
        [-1, 0], [0, 0], [1, 0],
        [0, 1], [1, 1], [2, 1],
    ],

    beacon: [
        [-2, -2], [-1, -2],
        [-2, -1],
        [0, 0], [1, 0],
        [0, 1], [1, 1],
    ],

    // Pulsar (período 3)
    pulsar: [
        [-6, -4], [-5, -4], [-4, -4], [-1, -4], [0, -4], [1, -4], [4, -4], [5, -4], [6, -4],
        [-4, -6], [-4, -5], [1, -6], [1, -5], [-1, -6], [-1, -5], [4, -6], [4, -5], [6, -6], [6, -5],
        [-6, -1], [-5, -1], [-4, -1], [-1, -1], [0, -1], [1, -1], [4, -1], [5, -1], [6, -1],
        [-4, 1], [-4, 4], [1, 1], [1, 4], [-1, 1], [-1, 4], [4, 1], [4, 4], [6, 1], [6, 4],
        [-6, 4], [-5, 4], [-4, 4], [-1, 4], [0, 4], [1, 4], [4, 4], [5, 4], [6, 4],
        [-4, 5], [-4, 6], [1, 5], [1, 6], [-1, 5], [-1, 6], [4, 5], [4, 6], [6, 5], [6, 6],
        [-6, 1], [-5, 1], [-4, 1], [-1, 1], [0, 1], [1, 1], [4, 1], [5, 1], [6, 1],
    ],

    // Pentadecathlon (período 15)
    pentadecathlon: [
        [0, -5], [0, -4], [0, -3], [0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
        [-1, -3], [1, -3], [-1, 2], [1, 2],
    ],

    // ── Patrones Caóticos ────────────────────────────────────────────────────
    // R-Pentomino
    rpentomino: [
        [0, -1], [1, -1], [-1, 0], [0, 0], [0, 1]
    ],

    // Diehard (muere en 130 generaciones)
    diehard: [
        [6, -1],
        [0, 0], [1, 0],
        [1, 1], [5, 1], [6, 1], [7, 1],
    ],

    // Bellota (crecimiento explosivo)
    acorn: [
        [-3, 0], [-1, 0], [2, 0], [3, 0], [4, 0],
        [-2, -1],
        [3, 1],
    ],

    // ── Cañón de Planeadores ─────────────────────────────────────────────────
    gosperGun: [
        // Bloque izquierdo
        [-18, 0], [-18, -1], [-17, 0], [-17, -1],
        // Bucle izquierdo
        [-8, -2], [-8, -1], [-8, 0], [-8, 1], [-8, 2],
        [-7, -3], [-7, 2], [-6, -4], [-6, 3], [-5, -4], [-5, 3],
        [-4, -1], [-4, 1],
        [-3, -2], [-3, -1], [-3, 0], [-3, 1], [-3, 2], [-3, 3],
        [-2, 0],
        // Pieza central
        [-1, -3], [-1, -2], [-1, -1], [-1, 0], [-1, 1], [-1, 2],
        [0, -2], [0, -1], [0, 0], [0, 1],
        [1, -1], [1, 0],
        // Bucle derecho
        [3, -2], [3, -1], [3, 0], [3, 1], [3, 2],
        [4, -3], [4, 2],
        [5, -4], [5, 3], [6, -4], [6, 3],
        [7, -3], [7, 2],
        [8, -2], [8, -1], [8, 0], [8, 1], [8, 2],
        [9, -1], [9, 0],
        [10, -2], [10, -1], [10, 0], [10, 1], [10, 2],
        // Bloque derecho
        [17, -1], [17, 0], [18, -1], [18, 0],
    ],
};
