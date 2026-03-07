export const S = 5.4;
export const GAP = 2;

// Colores extraídos del requerimiento de contraste
export const COLORS = {
    'B': '#3b82f6', // Azules (Blue)
    'R': '#ef4444', // Rojos (Red)
    'Y': '#eab308', // Amarillos (Yellow)
    'BACKBONE': '#6b7280' // Gris para la cadena base
};

export const R1_GRID = [
    ['B', 'R', 'R', null, 'R', 'R', 'B'],
    [null, 'Y', 'Y', 'Y', 'Y', 'Y', null],
    [null, null, null, 'Y', null, null, null]
];

export const R2_GRID = [
    ['B', 'R', 'R', null, 'R', 'R', 'B'],
    ['B', 'R', 'R', null, 'R', 'R', 'B'],
    [null, 'Y', 'Y', null, 'Y', 'Y', null],
    [null, null, 'Y', null, 'Y', null, null]
];

export class Particle {
    id: string; x: number; y: number; vx: number; vy: number; color: string;
    state: 'FREE' | 'ATTRACTED' | 'IN_ARN' | 'CONSUMED'; targetArn: ARN | null; targetSlotIndex: number;
    constructor(x: number, y: number, color: string) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x; this.y = y; this.vx = (Math.random() - 0.5) * 2; this.vy = (Math.random() - 0.5) * 2;
        this.color = color; this.state = 'FREE'; this.targetArn = null; this.targetSlotIndex = -1;
    }
}

export class ARNNode {
    x: number; y: number; color: string; particle: Particle | null;
    constructor(x: number, y: number, color: string) {
        this.x = x; this.y = y; this.color = color; this.particle = null;
    }
}

export class ARN {
    id: string; type: 1 | 2; nodes: ARNNode[]; state: 'FREE' | 'SEEKING_COMPLEX' | 'TRANSLATING';
    targetComplex: Complex | null; angle: number;
    constructor(x: number, y: number, type: 1 | 2) {
        this.id = Math.random().toString(36).substr(2, 9); this.type = type;
        const seq = type === 1
            ? ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'B', 'R', 'R', 'R', 'R', 'B']
            : ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'B', 'R', 'R', 'R', 'R', 'B', 'B', 'R', 'R', 'R', 'R', 'B'];
        this.nodes = seq.map((c, i) => new ARNNode(x + i * (S + GAP), y, c));
        this.state = 'FREE'; this.targetComplex = null; this.angle = Math.random() * Math.PI * 2;
    }
}

export class Ribosome {
    id: string; x: number; y: number; vx: number; vy: number; angle: number; type: 1 | 2;
    state: 'FREE' | 'SEEKING_MERGE'; targetRibosome: Ribosome | null;
    constructor(x: number, y: number, type: 1 | 2) {
        this.id = Math.random().toString(36).substr(2, 9); this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 1.5; this.vy = (Math.random() - 0.5) * 1.5;
        this.angle = Math.random() * Math.PI * 2; this.type = type; this.state = 'FREE'; this.targetRibosome = null;
    }
}

export class Complex {
    id: string; x: number; y: number; vx: number; vy: number; angle: number;
    state: 'IDLE' | 'TRANSLATING' | 'SPLITTING'; arn: ARN | null;
    progress: number; builtGrid: (string | null)[][];
    particlesInTransit: { color: string, x: number, y: number, targetR: number, targetC: number, state: 'UP_CHANNEL' | 'TO_GRID' }[];
    constructor(x: number, y: number) {
        this.id = Math.random().toString(36).substr(2, 9); this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 0.5; this.vy = (Math.random() - 0.5) * 0.5;
        this.angle = Math.random() * Math.PI * 2; this.state = 'IDLE'; this.arn = null;
        this.progress = 0; this.builtGrid = []; this.particlesInTransit = [];
    }
}

export interface SimState {
    particles: Particle[];
    arns: ARN[];
    ribosomes: Ribosome[];
    complexes: Complex[];
    width: number;
    height: number;
    speed: number;
    temperature: number;
    repulsion: number;
}

export function createInitialState(width: number, height: number, numParticles: number = 200, numArns: number = 4, numRibosomes: number = 2): SimState {
    const state: SimState = {
        particles: [], arns: [], ribosomes: [], complexes: [],
        width, height, speed: 1, temperature: 1, repulsion: 1.5
    };
    for (let i = 0; i < numParticles; i++) state.particles.push(new Particle(Math.random() * width, Math.random() * height, ['B', 'R', 'Y'][Math.floor(Math.random() * 3)]));
    for (let i = 0; i < numArns; i++) {
        state.arns.push(new ARN(width * (0.2 + 0.6 * Math.random()), height * (0.2 + 0.6 * Math.random()), i % 2 === 0 ? 1 : 2));
    }
    for (let i = 0; i < numRibosomes; i++) {
        state.ribosomes.push(new Ribosome(width * (0.2 + 0.6 * Math.random()), height * (0.2 + 0.6 * Math.random()), i % 2 === 0 ? 1 : 2));
    }
    return state;
}

function wrap(val: number, max: number) {
    if (val < 0) return val + max;
    if (val > max) return val - max;
    return val;
}

export function updateSimulation(state: SimState) {
    const { particles, arns, ribosomes, complexes, width, height, speed, temperature } = state;

    particles.forEach(p => {
        let targetX = p.x, targetY = p.y;
        if (p.state === 'FREE' || p.state === 'ATTRACTED') {
            p.vx += (Math.random() - 0.5) * temperature * 0.2;
            p.vy += (Math.random() - 0.5) * temperature * 0.2;
            p.x += p.vx * speed; p.y += p.vy * speed;
            p.x += (Math.random() - 0.5) * temperature * speed;
            p.y += (Math.random() - 0.5) * temperature * speed;
            p.x = wrap(p.x, width); p.y = wrap(p.y, height);
            // Blanco: Zona de Anclaje lateral si la partícula está siendo atraída
            if (p.state === 'ATTRACTED' && p.targetArn) {
                const arn = p.targetArn;
                if (arn.state === 'TRANSLATING' && arn.targetComplex) {
                    const node = arn.nodes[p.targetSlotIndex];
                    // FUERZA DIRECTA AL ESLABÓN: Usar dx/dy corregido por wrap
                    let adx = node.x - p.x; let ady = node.y - p.y;
                    if (Math.abs(adx) > width / 2) adx -= Math.sign(adx) * width;
                    if (Math.abs(ady) > height / 2) ady -= Math.sign(ady) * height;
                    const adist = Math.sqrt(adx * adx + ady * ady);

                    if (adist > 0.1) {
                        p.vx += (adx / adist) * 0.8 * speed;
                        p.vy += (ady / adist) * 0.8 * speed;
                    }
                    targetX = p.x; targetY = p.y; // Ya aplicamos la fuerza manualmente
                } else {
                    p.state = 'FREE'; p.targetArn = null;
                }
            }

            let dx = targetX - p.x; let dy = targetY - p.y;
            if (Math.abs(dx) > width / 2) dx -= Math.sign(dx) * width;
            if (Math.abs(dy) > height / 2) dy -= Math.sign(dy) * height;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0.1 && p.state !== 'ATTRACTED') {
                p.vx += (dx / dist) * 1.5 * speed;
                p.vy += (dy / dist) * 1.5 * speed;
            }

            if (p.state === 'ATTRACTED' && p.targetArn && dist < 22) {
                const node = p.targetArn.nodes[p.targetSlotIndex];
                node.particle = p;
                p.state = 'IN_ARN';
                p.x = node.x; p.y = node.y;
                p.vx = 0; p.vy = 0;
            }
        } else if (p.state === 'IN_ARN' && p.targetArn) {
            const node = p.targetArn.nodes[p.targetSlotIndex];
            if (node) {
                p.x = node.x; p.y = node.y; p.vx = 0; p.vy = 0;
                // La partícula hereda la rotación del ARN de forma implícita al dibujarse
            }
        }
    });

    arns.forEach(arn => {
        if (arn.state === 'FREE') {
            const head = arn.nodes[0];
            // Movimiento puro por temperatura de Boltzman (Caótico, sin dirección motorizada)
            head.x += (Math.random() - 0.5) * 1.5 * speed * temperature;
            head.y += (Math.random() - 0.5) * 1.5 * speed * temperature;
            head.x = wrap(head.x, width); head.y = wrap(head.y, height);

            // Transición a buscar complejo de forma natural
            if (!arn.targetComplex) {
                const idleComplex = complexes.find(c => c.state === 'IDLE');
                if (idleComplex) {
                    arn.targetComplex = idleComplex;
                    arn.state = 'SEEKING_COMPLEX';
                }
            }
        } else if (arn.state === 'SEEKING_COMPLEX') {
            if (!arn.targetComplex || arn.targetComplex.state !== 'IDLE') {
                arn.targetComplex = complexes.find(c => c.state === 'IDLE') || null;
            }
            if (arn.targetComplex) {
                const c = arn.targetComplex; const head = arn.nodes[0];
                // Anclaje al extremo lateral DERECHO (Azul en col 6)
                const gridW = 7 * (S + GAP);
                const lateralX = gridW / 2 + 10; // 10px fuera del borde para ante-sala
                const cos = Math.cos(c.angle); const sin = Math.sin(c.angle);
                const targetX = c.x + lateralX * cos;
                const targetY = c.y + lateralX * sin;
                const dx = targetX - head.x; const dy = targetY - head.y; const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 5) {
                    const gridW = 7 * (S + GAP);
                    const lateralX = gridW / 2 + 12;
                    const anchorD = -lateralX - (S + GAP);

                    c.state = 'TRANSLATING'; c.arn = arn; arn.state = 'TRANSLATING';
                    c.progress = anchorD;
                    const gridTemplate = arn.type === 1 ? R1_GRID : R2_GRID;
                    c.builtGrid = gridTemplate.map(row => row.map(() => null));
                    c.particlesInTransit = [];
                } else {
                    arn.angle = Math.atan2(dy, dx);
                    // ALINEACIÓN PRE-ENTRADA: Alinear ángulo del ARN con el del Ribosoma
                    if (dist < 40) {
                        let ad = c.angle - arn.angle;
                        ad = Math.atan2(Math.sin(ad), Math.cos(ad));
                        arn.angle += ad * 0.15 * speed;
                    }
                    head.x += Math.cos(arn.angle) * 2 * speed; head.y += Math.sin(arn.angle) * 2 * speed;
                }
            } else {
                const head = arn.nodes[0];
                head.x += (Math.random() - 0.5) * 1.5 * speed * temperature;
                head.y += (Math.random() - 0.5) * 1.5 * speed * temperature;
                head.x = wrap(head.x, width); head.y = wrap(head.y, height);
                // Si perdió el target, vuelve a ser FREE
                if (arn.targetComplex && (arn.targetComplex as any).state !== 'IDLE') {
                    arn.state = 'FREE'; arn.targetComplex = null;
                }
            }
        }

        // Colisiones con Ribosomas para todos los nodos
        arn.nodes.forEach((node, i) => {
            // Siempre colisionar excepto los nodos que están dentro del canal central durante la traducción
            let skipCollision = false;
            if (arn.state === 'TRANSLATING' && arn.targetComplex) {
                const d = arn.targetComplex.progress - i * (S + GAP);
                if (d > -20 && d < 20) skipCollision = true; // Zona del canal
            }

            if (!skipCollision) {
                complexes.forEach(c => {
                    const grids = [{ g: R1_GRID, oy: 18 }, { g: R2_GRID, oy: -18 }];
                    grids.forEach(({ g, oy }) => {
                        const gw = 7 * (S + GAP); const gh = g.length * (S + GAP);
                        g.forEach((row, ri) => {
                            row.forEach((cell, ci) => {
                                if (cell) {
                                    const lx = -gw / 2 + S / 2 + ci * (S + GAP); const ly = oy - gh / 2 + S / 2 + ri * (S + GAP);
                                    const cos = Math.cos(c.angle); const sin = Math.sin(c.angle);
                                    const wx = c.x + lx * cos - ly * sin; const wy = c.y + lx * sin + ly * cos;
                                    let cdx = node.x - wx; let cdy = node.y - wy;
                                    if (Math.abs(cdx) > width / 2) cdx -= Math.sign(cdx) * width;
                                    if (Math.abs(cdy) > height / 2) cdy -= Math.sign(cdy) * height;
                                    const cdistSq = cdx * cdx + cdy * cdy;
                                    if (cdistSq < (S + 1.2) * (S + 1.2)) {
                                        const cdist = Math.sqrt(cdistSq); const coverlap = (S + 1.2 - cdist);
                                        node.x += (cdx / cdist) * coverlap * 0.9; node.y += (cdy / cdist) * coverlap * 0.9;
                                    }
                                }
                            })
                        });
                    });
                });
            }
        });

        for (let i = 1; i < arn.nodes.length; i++) {
            const n1 = arn.nodes[i - 1]; const n2 = arn.nodes[i];
            let dx = n1.x - n2.x; let dy = n1.y - n2.y;

            if (Math.abs(dx) > width / 2) { n2.x += Math.sign(dx) * width; dx = n1.x - n2.x; }
            if (Math.abs(dy) > height / 2) { n2.y += Math.sign(dy) * height; dy = n1.y - n2.y; }

            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                const targetDist = S + GAP;
                const error = dist - targetDist;
                // Fuerza de resorte (flexibilidad)
                n2.x += (dx / dist) * error * 0.6 * speed;
                n2.y += (dy / dist) * error * 0.6 * speed;

                // Vibración
                n2.x += (Math.random() - 0.5) * temperature * speed;
                n2.y += (Math.random() - 0.5) * temperature * speed;
            }
        }
    });

    ribosomes.forEach(r => {
        if (r.state === 'FREE') {
            r.x += r.vx * speed; r.y += r.vy * speed; r.angle += 0.02 * speed;

            // Vibración térmica de los ribosomas libres (Efecto Browniano)
            r.x += (Math.random() - 0.5) * speed * temperature * 0.5;
            r.y += (Math.random() - 0.5) * speed * temperature * 0.5;
            r.angle += (Math.random() - 0.5) * 0.01 * temperature;

            r.x = wrap(r.x, width); r.y = wrap(r.y, height);
            if (!r.targetRibosome) {
                const partnerType = r.type === 1 ? 2 : 1;
                const partner = ribosomes.find(other => other.state === 'FREE' && other.type === partnerType && !other.targetRibosome);
                if (partner) { r.targetRibosome = partner; partner.targetRibosome = r; r.state = 'SEEKING_MERGE'; partner.state = 'SEEKING_MERGE'; }
            }
        } else if (r.state === 'SEEKING_MERGE') {
            const partner = r.targetRibosome;
            if (!partner || partner.state !== 'SEEKING_MERGE') { r.state = 'FREE'; r.targetRibosome = null; return; }
            const dx = partner.x - r.x; const dy = partner.y - r.y; const dist = Math.sqrt(dx * dx + dy * dy);

            // Resorte para mantener una distancia y alineación
            const restDist = 36;
            const distError = dist - restDist;
            const springForce = distError * 0.05 * speed;

            r.vx += (dx / dist) * springForce;
            r.vy += (dy / dist) * springForce;

            // Amortiguación
            r.vx *= 0.8;
            r.vy *= 0.8;

            // Vibración de bolzman al juntarse
            r.vx += (Math.random() - 0.5) * 1.5 * speed * temperature;
            r.vy += (Math.random() - 0.5) * 1.5 * speed * temperature;

            r.x += r.vx; r.y += r.vy;

            // Orientación coherente y no instantánea hacia el otro ribosoma
            const angleToPartner = Math.atan2(dy, dx);
            // El Complejo define R1 en +y (abajo) y R2 en -y (arriba) orientados con c.angle = angleToPartner + PI/2
            const c_angle = angleToPartner + Math.PI / 2;
            const targetAngle = r.type === 1 ? c_angle : c_angle + Math.PI;

            let ad = targetAngle - r.angle;
            ad = Math.atan2(Math.sin(ad), Math.cos(ad));
            r.angle += ad * 0.1 * speed;

            if (Math.abs(dist - restDist) < 4 && Math.abs(ad) < 0.2) {
                if (r.type === 1) {
                    const c = new Complex((r.x + partner.x) / 2, (r.y + partner.y) / 2);
                    c.angle = c_angle;
                    complexes.push(c);
                    (r as any).state = 'MERGED'; (partner as any).state = 'MERGED';
                }
            }
        }
    });
    state.ribosomes = state.ribosomes.filter(r => (r.state as any) !== 'MERGED');

    complexes.forEach(c => {
        if (c.state === 'IDLE') {
            c.x += c.vx * speed; c.y += c.vy * speed; c.angle += 0.005 * speed;
            c.x += (Math.random() - 0.5) * 1.0 * speed * temperature;
            c.y += (Math.random() - 0.5) * 1.0 * speed * temperature;
            c.x = wrap(c.x, width); c.y = wrap(c.y, height);
        } else if (c.state === 'TRANSLATING' && c.arn) {
            const arn = c.arn;

            // 1. ZONA DE ANCLAJE: Un espacio atrás de la entrada (lateralX + margen)
            const gridW = 7 * (S + GAP);
            const lateralX = gridW / 2 + 12;
            const anchorD = -lateralX - (S + GAP);

            let currentNodeIndex = -1;
            for (let i = 0; i < arn.nodes.length; i++) {
                const d = c.progress - i * (S + GAP);
                if (d >= anchorD - 5 && d <= anchorD + 5) {
                    currentNodeIndex = i;
                    break;
                }
            }

            // 2. Lógica de Porteros (BLUE): Bloqueo total si el nodo en espera está vacío
            let canAdvance = true;
            if (currentNodeIndex !== -1) {
                const activeNode = arn.nodes[currentNodeIndex];
                if (!activeNode.particle) {
                    canAdvance = false;

                    // LLAMADO DE COLOR: Solo uno a la vez por eslabón
                    const colorNeeded = activeNode.color;

                    // Verificar si ya hay una partícula viajando hacia este eslabón
                    const alreadyTargeted = particles.some(p => p.state === 'ATTRACTED' && p.targetArn === arn && p.targetSlotIndex === currentNodeIndex);

                    if (!alreadyTargeted) {
                        let closestP: Particle | null = null;
                        let minDist = Infinity;
                        particles.forEach(p => {
                            if (p.state === 'FREE' && p.color === colorNeeded) {
                                let dpx = p.x - activeNode.x; let dpy = p.y - activeNode.y;
                                if (Math.abs(dpx) > width / 2) dpx -= Math.sign(dpx) * width;
                                if (Math.abs(dpy) > height / 2) dpy -= Math.sign(dpy) * height;
                                let ddist = dpx * dpx + dpy * dpy;
                                if (colorNeeded === 'Y') ddist *= 0.3;
                                if (ddist < minDist) { minDist = ddist; closestP = p; }
                            }
                        });

                        if (closestP) {
                            (closestP as Particle).state = 'ATTRACTED';
                            (closestP as Particle).targetArn = arn;
                            (closestP as Particle).targetSlotIndex = currentNodeIndex;
                        }
                    }
                }
            }

            if (canAdvance) {
                c.progress += 1.5 * speed;
            } else {
                // Vibración de bloqueo Termodinámico
                c.x += (Math.random() - 0.5) * 2.0 * speed * temperature;
                c.y += (Math.random() - 0.5) * 2.0 * speed * temperature;
                c.x = wrap(c.x, width); c.y = wrap(c.y, height);
            }

            arn.nodes.forEach((node, i) => {
                const d = c.progress - i * (S + GAP);

                // Modificamos la función de absorción para que la tira de ARN entre lateralmente 
                // alineándose desde x = lateralX y moviéndose hacia el centro de la zona de anclaje
                const lateralX = (7 * (S + GAP)) / 2 + 12;
                if (d >= -lateralX - 30) {
                    let lx = -d;
                    let ly = 0; // ELIMINAMOS EL SENO PARA ENTRADA RECTA

                    const cos = Math.cos(c.angle); const sin = Math.sin(c.angle);
                    node.x = c.x + lx * cos - ly * sin;
                    node.y = c.y + lx * sin + ly * cos;
                }

                // EXTRACCIÓN (REDS): Ocurre en el canal central (rango más amplio para evitar "saltos")
                if (d >= -8 && d < 12 && node.particle) {
                    const gridTemplate = arn.type === 1 ? R1_GRID : R2_GRID;
                    let targetR = -1, targetC = -1;
                    let placed = false;
                    for (let row = gridTemplate.length - 1; row >= 0 && !placed; row--) {
                        for (let col = 0; col < gridTemplate[row].length && !placed; col++) {
                            // Buscar espacio para el color exacto
                            if (gridTemplate[row][col] === node.particle.color && !c.builtGrid[row][col]) {
                                targetR = row; targetC = col;
                                c.builtGrid[row][col] = 'RESERVED';
                                placed = true;
                            }
                        }
                    }

                    if (placed) {
                        const p = node.particle;
                        p.state = 'CONSUMED';
                        c.particlesInTransit.push({
                            color: p.color,
                            x: -d, y: 0, targetR, targetC, state: 'UP_CHANNEL'
                        });
                        node.particle = null; // AHORA SÍ QUEDA VACÍO
                    }
                }
            });

            c.particlesInTransit.forEach(pt => {
                if (pt.state === 'UP_CHANNEL') {
                    pt.y -= 2 * speed;
                    if (pt.y <= -34) pt.state = 'TO_GRID';
                } else if (pt.state === 'TO_GRID') {
                    const gridW = c.builtGrid[0].length * (S + GAP);
                    const gridH = c.builtGrid.length * (S + GAP);
                    // Dibujar construyendo directamente encima del Lector = -(34 + alto/2)
                    const drawCY = -34 - gridH / 2;
                    const targetX = -gridW / 2 + S / 2 + pt.targetC * (S + GAP);
                    const targetY = drawCY - gridH / 2 + S / 2 + pt.targetR * (S + GAP);

                    const dx = targetX - pt.x; const dy = targetY - pt.y; const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 2 * speed) {
                        c.builtGrid[pt.targetR][pt.targetC] = pt.color;
                        pt.state = 'DONE' as any;
                    } else {
                        // Movimiento más orgánico hacia la grilla con un poco de "vibración de encaje"
                        const moveSpeed = 3 * speed;
                        pt.x += (dx / dist) * moveSpeed;
                        pt.y += (dy / dist) * moveSpeed;
                        pt.x += (Math.random() - 0.5) * temperature;
                        pt.y += (Math.random() - 0.5) * temperature;
                    }
                }
            });
            c.particlesInTransit = c.particlesInTransit.filter(pt => (pt.state as any) !== 'DONE');

            if (c.progress > arn.nodes.length * (S + GAP) + 50 && c.particlesInTransit.length === 0) {
                const gridH = c.builtGrid.length * (S + GAP);
                const drawCY = -34 - gridH / 2; // Extraer usando la misma coordenada exacta

                const newRibosome = new Ribosome(
                    c.x + Math.cos(c.angle + Math.PI / 2) * drawCY,
                    c.y + Math.sin(c.angle + Math.PI / 2) * drawCY,
                    arn.type
                );
                newRibosome.angle = c.angle;
                newRibosome.vx = c.vx + Math.cos(c.angle - Math.PI / 2) * 2;
                newRibosome.vy = c.vy + Math.sin(c.angle - Math.PI / 2) * 2;
                state.ribosomes.push(newRibosome);

                arn.state = 'FREE'; arn.targetComplex = null;
                // Darle un pequeño impulso de alejamiento al ARN
                arn.nodes.forEach(n => { n.x += Math.cos(c.angle) * 5; n.y += Math.sin(c.angle) * 5; });

                const r1 = new Ribosome(c.x + Math.cos(c.angle + Math.PI / 2) * 20, c.y + Math.sin(c.angle + Math.PI / 2) * 20, 1);
                const r2 = new Ribosome(c.x + Math.cos(c.angle - Math.PI / 2) * 20, c.y + Math.sin(c.angle - Math.PI / 2) * 20, 2);

                const rep = 1.0 + state.repulsion; // Usamos el slider de repulsión
                r1.vx = Math.cos(c.angle + Math.PI / 2) * rep * 2;
                r1.vy = Math.sin(c.angle + Math.PI / 2) * rep * 2;
                r2.vx = Math.cos(c.angle - Math.PI / 2) * rep * 2;
                r2.vy = Math.sin(c.angle - Math.PI / 2) * rep * 2;
                r1.angle = c.angle; r2.angle = c.angle + Math.PI;

                state.ribosomes.push(r1, r2);
                state.complexes = state.complexes.filter(comp => comp !== c);
            }
        }
    });
    state.complexes = state.complexes.filter(c => c.state !== 'SPLITTING');

    // --- RESOLUCIÓN FINAL DE COLISIONES RIGIDAS ---
    // Se ejecuta al final de todos los updates para garantizar cero overlap en el render (Ghosting)
    const minDist = S + 1; // 1px de gap forzado para paredes
    const minDistSq = minDist * minDist;

    for (let iter = 0; iter < 5; iter++) {
        for (let i = 0; i < particles.length; i++) {
            const p1 = particles[i];
            if (p1.state === 'CONSUMED') continue;
            const p1Fixed = p1.state !== 'FREE' && p1.state !== 'ATTRACTED';

            // Colisión con otras partículas
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                if (p2.state === 'CONSUMED') continue;
                const p2Fixed = p2.state !== 'FREE' && p2.state !== 'ATTRACTED';

                if (p1Fixed && p2Fixed) continue; // Ambos fijos, ignorar

                // Ignorar colisiones para partículas atraídas (para que no se bloqueen entre sí al entrar al ancla)
                if (p1.state === 'ATTRACTED' || p2.state === 'ATTRACTED') continue;

                let dx = p2.x - p1.x; let dy = p2.y - p1.y;
                if (Math.abs(dx) > width / 2) dx -= Math.sign(dx) * width;
                if (Math.abs(dy) > height / 2) dy -= Math.sign(dy) * height;

                const distSq = dx * dx + dy * dy;
                if (distSq > 0 && distSq < minDistSq) {
                    const dist = Math.sqrt(distSq);
                    const overlap = (minDist - dist);
                    const nx = dx / dist; const ny = dy / dist;

                    if (!p1Fixed && !p2Fixed) {
                        p1.x -= nx * overlap * 0.5; p1.y -= ny * overlap * 0.5;
                        p2.x += nx * overlap * 0.5; p2.y += ny * overlap * 0.5;
                        const dvx = p2.vx - p1.vx; const dvy = p2.vy - p1.vy;
                        const dot = dvx * nx + dvy * ny;
                        if (dot < 0) {
                            p1.vx += nx * dot * 0.8; p1.vy += ny * dot * 0.8;
                            p2.vx -= nx * dot * 0.8; p2.vy -= ny * dot * 0.8;
                        }
                    } else if (!p1Fixed && p2Fixed) {
                        p1.x -= nx * overlap; p1.y -= ny * overlap;
                        const dot = p1.vx * nx + p1.vy * ny;
                        if (dot > 0) { p1.vx -= nx * dot * 1.5; p1.vy -= ny * dot * 1.5; }
                    } else if (p1Fixed && !p2Fixed) {
                        p2.x += nx * overlap; p2.y += ny * overlap;
                        const dot = p2.vx * nx + p2.vy * ny;
                        if (dot < 0) { p2.vx -= nx * dot * 1.5; p2.vy -= ny * dot * 1.5; }
                    }
                }
            }

            // Colisión con los nodos del ARN (fijos para las partículas libres)
            if (!p1Fixed && p1.x > 0 && p1.y > 0) {
                for (const arn of arns) {
                    // Ignora colisiones con ARN si este ARN está siendo atraído y tragado por un complejo 
                    // para evitar empujar moléculas de la boca y trabar el sim
                    if (arn.state === 'TRANSLATING') continue;

                    if (p1.state === 'ATTRACTED' && p1.targetArn === arn) continue; // Permite acercarse a su destino
                    for (const node of arn.nodes) {
                        if (node.particle) continue; // Ya calculado arriba en "Colisión con otras partículas"

                        let dx = node.x - p1.x; let dy = node.y - p1.y;
                        if (Math.abs(dx) > width / 2) dx -= Math.sign(dx) * width;
                        if (Math.abs(dy) > height / 2) dy -= Math.sign(dy) * height;

                        const distSq = dx * dx + dy * dy;
                        if (distSq > 0 && distSq < minDistSq) {
                            const dist = Math.sqrt(distSq);
                            const overlap = (minDist - dist);
                            const nx = dx / dist; const ny = dy / dist;
                            p1.x -= nx * overlap; p1.y -= ny * overlap;
                            const dot = p1.vx * nx + p1.vy * ny;
                            if (dot > 0) { p1.vx -= nx * dot * 1.5; p1.vy -= ny * dot * 1.5; }
                        }
                    }
                }
            }
        }
    }
}

export function drawGrid(ctx: CanvasRenderingContext2D, grid: (string | null)[][], cx: number, cy: number, angle: number, alpha: number = 1) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle); ctx.globalAlpha = alpha;
    const rows = grid.length; const cols = grid[0].length;
    const w = cols * (S + GAP); const h = rows * (S + GAP);
    ctx.translate(-w / 2 + S / 2, -h / 2 + S / 2);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const color = grid[r][c];
            if (color && color !== 'RESERVED') {
                ctx.fillStyle = (COLORS as any)[color];
                ctx.fillRect(c * (S + GAP) - S / 2, r * (S + GAP) - S / 2, S, S);
            }
        }
    }
    ctx.restore();
}

export function drawSimulation(ctx: CanvasRenderingContext2D, state: SimState) {
    ctx.clearRect(0, 0, state.width, state.height);

    state.arns.forEach(arn => {
        ctx.beginPath();
        ctx.strokeStyle = COLORS['BACKBONE'];
        ctx.lineWidth = 2;
        for (let i = 0; i < arn.nodes.length; i++) {
            const n = arn.nodes[i];
            if (i === 0) ctx.moveTo(n.x, n.y);
            else {
                const prev = arn.nodes[i - 1];
                const dx = Math.abs(n.x - prev.x);
                const dy = Math.abs(n.y - prev.y);
                if (dx < state.width / 2 && dy < state.height / 2) {
                    ctx.lineTo(n.x, n.y);
                } else {
                    ctx.moveTo(n.x, n.y);
                }
            }
        }
        ctx.stroke();

        arn.nodes.forEach((n) => {
            ctx.save();
            ctx.translate(n.x, n.y);

            // Si el ARN está traduciendo, hereda el ángulo del complejo
            // Si no, usa su propio ángulo interno
            const drawAngle = (arn.state === 'TRANSLATING' && arn.targetComplex)
                ? arn.targetComplex.angle
                : arn.angle;

            ctx.rotate(drawAngle);

            if (n.particle) {
                ctx.fillStyle = (COLORS as any)[n.particle.color];
                ctx.fillRect(-S / 2, -S / 2, S, S);
            } else {
                ctx.strokeStyle = (COLORS as any)[n.color];
                ctx.lineWidth = 1;
                ctx.strokeRect(-S / 2, -S / 2, S, S);
            }
            ctx.restore();
        });
    });

    state.particles.forEach(p => {
        if (p.state === 'FREE' || p.state === 'ATTRACTED') {
            ctx.fillStyle = (COLORS as any)[p.color];
            ctx.fillRect(p.x - S / 2, p.y - S / 2, S, S);
        }
    });

    state.ribosomes.forEach(r => {
        drawGrid(ctx, r.type === 1 ? R1_GRID : R2_GRID, r.x, r.y, r.angle);
    });

    state.complexes.forEach(c => {
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle);
        drawGrid(ctx, R2_GRID, 0, -18, Math.PI);
        drawGrid(ctx, R1_GRID, 0, 18, 0);

        if (c.state === 'TRANSLATING') {
            const gridH = c.builtGrid.length * (S + GAP);
            const drawCY = -34 - gridH / 2;
            drawGrid(ctx, c.builtGrid, 0, drawCY, 0);

            c.particlesInTransit.forEach(pt => {
                ctx.fillStyle = (COLORS as any)[pt.color];
                ctx.fillRect(pt.x - S / 2, pt.y - S / 2, S, S);
            });
        }
        ctx.restore();
    });
}
