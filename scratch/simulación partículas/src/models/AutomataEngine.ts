export const MAX_COLORS = 10;
export const MAX_BONDS = 8;

export class AutomataEngine {
  numParticles: number;
  width: number;
  height: number;

  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  color: Int32Array;

  bonds: Int32Array;
  bondCounts: Int32Array;
  bondCountsByColor: Int32Array; // numParticles * MAX_COLORS

  speed: number = 1;
  temperature: number = 0;
  friction: number = 0.8;
  baseSize: number = 5;

  attractionMatrix: Float32Array;
  radiusMatrix: Float32Array;
  minDistanceMatrix: Float32Array;
  bondMatrix: Int8Array; // 0 = no bond, 1-20 = bond length
  maxBonds: Int32Array; // max bonds between color pairs
  bondStrengthMatrix: Float32Array; // 0.0 to 1.0
  idealAngle: Float32Array; // 0 to 360 degrees
  angleStrength: Float32Array; // 0.0 to 1.0

  // Advanced Artificial Life Features
  enableMetabolism: boolean = false;
  enableMutation: boolean = false;
  enableStigmergy: boolean = false;
  enableTransmutation: boolean = false;
  enableChirality: boolean = false;

  energy: Float32Array;
  
  pheromoneCols: number = 64;
  pheromoneRows: number = 64;
  pheromoneGrid: Float32Array;
  pheromoneAttractionMatrix: Float32Array;
  
  transmutationMatrix: Int32Array;
  chiralityMatrix: Float32Array;

  numColors: number;

  constructor(width: number, height: number, numParticles: number, numColors: number) {
    this.width = width;
    this.height = height;
    this.numParticles = numParticles;
    this.numColors = numColors;

    this.x = new Float32Array(numParticles);
    this.y = new Float32Array(numParticles);
    this.vx = new Float32Array(numParticles);
    this.vy = new Float32Array(numParticles);
    this.color = new Int32Array(numParticles);

    this.bonds = new Int32Array(numParticles * MAX_BONDS).fill(-1);
    this.bondCounts = new Int32Array(numParticles).fill(0);
    this.bondCountsByColor = new Int32Array(numParticles * MAX_COLORS).fill(0);

    this.attractionMatrix = new Float32Array(MAX_COLORS * MAX_COLORS).fill(0);
    this.radiusMatrix = new Float32Array(MAX_COLORS * MAX_COLORS).fill(50);
    this.minDistanceMatrix = new Float32Array(MAX_COLORS * MAX_COLORS).fill(5);
    this.bondMatrix = new Int8Array(MAX_COLORS * MAX_COLORS).fill(0);
    this.maxBonds = new Int32Array(MAX_COLORS * MAX_COLORS).fill(0);
    this.bondStrengthMatrix = new Float32Array(MAX_COLORS * MAX_COLORS).fill(0.5);
    this.idealAngle = new Float32Array(MAX_COLORS).fill(120);
    this.angleStrength = new Float32Array(MAX_COLORS).fill(0);

    this.energy = new Float32Array(numParticles).fill(1.0);
    this.pheromoneGrid = new Float32Array(this.pheromoneCols * this.pheromoneRows * MAX_COLORS).fill(0);
    this.pheromoneAttractionMatrix = new Float32Array(MAX_COLORS * MAX_COLORS).fill(0);
    this.transmutationMatrix = new Int32Array(MAX_COLORS * MAX_COLORS).fill(-1);
    this.chiralityMatrix = new Float32Array(MAX_COLORS * MAX_COLORS).fill(0);

    this.initParticles();
  }

  initParticles() {
    const safeNumColors = Math.max(1, this.numColors);
    for (let i = 0; i < this.numParticles; i++) {
      this.x[i] = Math.random() * this.width;
      this.y[i] = Math.random() * this.height;
      this.vx[i] = 0;
      this.vy[i] = 0;
      this.color[i] = Math.floor(Math.random() * safeNumColors);
      this.energy[i] = 1.0 + Math.random();
      this.bondCounts[i] = 0;
      for (let c = 0; c < MAX_COLORS; c++) {
        this.bondCountsByColor[i * MAX_COLORS + c] = 0;
      }
      for (let b = 0; b < MAX_BONDS; b++) {
        this.bonds[i * MAX_BONDS + b] = -1;
      }
    }
  }

  setColors(count: number) {
    this.numColors = count;
    const safeNumColors = Math.max(1, this.numColors);
    for (let i = 0; i < this.numParticles; i++) {
      if (this.color[i] >= safeNumColors) {
        this.color[i] = Math.floor(Math.random() * safeNumColors);
        this.breakAllBonds(i);
      }
    }
  }

  breakAllBonds(i: number) {
    const count = this.bondCounts[i];
    for (let b = 0; b < count; b++) {
      const j = this.bonds[i * MAX_BONDS + b];
      if (j !== -1) {
        this.removeBond(j, i);
      }
      this.bonds[i * MAX_BONDS + b] = -1;
    }
    this.bondCounts[i] = 0;
    for (let c = 0; c < MAX_COLORS; c++) {
      this.bondCountsByColor[i * MAX_COLORS + c] = 0;
    }
  }

  addBond(i: number, j: number) {
    const cj = this.color[j];
    if (this.bondCounts[i] < MAX_BONDS) {
      this.bonds[i * MAX_BONDS + this.bondCounts[i]] = j;
      this.bondCounts[i]++;
      this.bondCountsByColor[i * MAX_COLORS + cj]++;
    }
  }

  removeBond(i: number, j: number) {
    const count = this.bondCounts[i];
    const cj = this.color[j];
    for (let b = 0; b < count; b++) {
      if (this.bonds[i * MAX_BONDS + b] === j) {
        this.bonds[i * MAX_BONDS + b] = this.bonds[i * MAX_BONDS + count - 1];
        this.bonds[i * MAX_BONDS + count - 1] = -1;
        this.bondCounts[i]--;
        this.bondCountsByColor[i * MAX_COLORS + cj]--;
        break;
      }
    }
  }

  update() {
    let maxInteractionDist = 10;
    for (let i = 0; i < this.numColors; i++) {
      for (let j = 0; j < this.numColors; j++) {
        const r = this.radiusMatrix[i * MAX_COLORS + j];
        if (r > maxInteractionDist) maxInteractionDist = r;
        const bondLen = this.bondMatrix[i * MAX_COLORS + j] * this.baseSize;
        if (bondLen > maxInteractionDist) maxInteractionDist = bondLen;
      }
    }

    const cols = Math.max(1, Math.floor(this.width / maxInteractionDist));
    const rows = Math.max(1, Math.floor(this.height / maxInteractionDist));
    const cellWidth = this.width / cols;
    const cellHeight = this.height / rows;

    const head = new Int32Array(cols * rows).fill(-1);
    const next = new Int32Array(this.numParticles).fill(-1);

    // Stigmergy - diffuse and decay
    if (this.enableStigmergy) {
      for (let i = 0; i < this.pheromoneGrid.length; i++) {
        this.pheromoneGrid[i] *= 0.95; // Evaporation
      }
    }

    for (let i = 0; i < this.numParticles; i++) {
      let cx = Math.floor(this.x[i] / cellWidth);
      let cy = Math.floor(this.y[i] / cellHeight);
      cx = (cx % cols + cols) % cols;
      cy = (cy % rows + rows) % rows;
      const cell = cx + cy * cols;
      next[i] = head[cell];
      head[cell] = i;

      if (this.enableStigmergy) {
        let px = Math.floor((this.x[i] / this.width) * this.pheromoneCols);
        let py = Math.floor((this.y[i] / this.height) * this.pheromoneRows);
        px = Math.max(0, Math.min(this.pheromoneCols - 1, px));
        py = Math.max(0, Math.min(this.pheromoneRows - 1, py));
        this.pheromoneGrid[(py * this.pheromoneCols + px) * MAX_COLORS + this.color[i]] += 1.0;
      }
    }

    // First pass: Calculate normal forces and form/break bonds
    for (let i = 0; i < this.numParticles; i++) {
      let fx = 0;
      let fy = 0;
      const ci = this.color[i];
      const xi = this.x[i];
      const yi = this.y[i];

      let cx = Math.floor(xi / cellWidth);
      let cy = Math.floor(yi / cellHeight);

      // Stigmergy forces
      if (this.enableStigmergy) {
        let px = Math.floor((xi / this.width) * this.pheromoneCols);
        let py = Math.floor((yi / this.height) * this.pheromoneRows);
        px = Math.max(0, Math.min(this.pheromoneCols - 1, px));
        py = Math.max(0, Math.min(this.pheromoneRows - 1, py));
        
        for (let cj = 0; cj < this.numColors; cj++) {
          const attr = this.pheromoneAttractionMatrix[ci * MAX_COLORS + cj];
          if (attr !== 0) {
            const left = Math.max(0, px - 1);
            const right = Math.min(this.pheromoneCols - 1, px + 1);
            const up = Math.max(0, py - 1);
            const down = Math.min(this.pheromoneRows - 1, py + 1);
            
            const valLeft = this.pheromoneGrid[(py * this.pheromoneCols + left) * MAX_COLORS + cj];
            const valRight = this.pheromoneGrid[(py * this.pheromoneCols + right) * MAX_COLORS + cj];
            const valUp = this.pheromoneGrid[(up * this.pheromoneCols + px) * MAX_COLORS + cj];
            const valDown = this.pheromoneGrid[(down * this.pheromoneCols + px) * MAX_COLORS + cj];
            
            fx += (valRight - valLeft) * attr * 0.5;
            fy += (valDown - valUp) * attr * 0.5;
          }
        }
      }

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const cellX = (cx + dx + cols) % cols;
          const cellY = (cy + dy + rows) % rows;
          const cell = cellX + cellY * cols;

          let j = head[cell];
          while (j !== -1) {
            if (i !== j) {
              const cj = this.color[j];
              let dxPos = this.x[j] - xi;
              let dyPos = this.y[j] - yi;

              if (dxPos > this.width / 2) dxPos -= this.width;
              else if (dxPos < -this.width / 2) dxPos += this.width;
              if (dyPos > this.height / 2) dyPos -= this.height;
              else if (dyPos < -this.height / 2) dyPos += this.height;

              const dSq = dxPos * dxPos + dyPos * dyPos;
              const r = this.radiusMatrix[ci * MAX_COLORS + cj];
              const minDist = this.minDistanceMatrix[ci * MAX_COLORS + cj];
              const bondSetting = this.bondMatrix[ci * MAX_COLORS + cj];
              const bondStrength = this.bondStrengthMatrix[ci * MAX_COLORS + cj];
              const targetBondLen = bondSetting * this.baseSize;
              const maxStretch = targetBondLen * (1.1 + (1 - bondStrength) * 1.0);
              const checkDist = Math.max(r, maxStretch); // Check a bit further for breaking bonds
              
              if (dSq > 0 && dSq < checkDist * checkDist) {
                const d = Math.sqrt(dSq);
                const nx = dxPos / d;
                const ny = dyPos / d;

                let isBonded = false;
                for (let b = 0; b < this.bondCounts[i]; b++) {
                  if (this.bonds[i * MAX_BONDS + b] === j) {
                    isBonded = true;
                    break;
                  }
                }

                if (isBonded) {
                  // Break bond if too far or due to temperature
                  if (d > maxStretch || (this.temperature > 0 && Math.random() < this.temperature * 0.01 * (1 - bondStrength))) {
                    if (i < j) {
                      this.removeBond(i, j);
                      this.removeBond(j, i);
                    }
                  } else {
                    // Apply normal forces EVEN when bonded, but scaled down
                    let force = 0;
                    if (d < minDist) {
                      force = minDist > 0 ? (d / minDist) - 1 : 0;
                    } else if (d < r) {
                      const a = this.attractionMatrix[ci * MAX_COLORS + cj];
                      const peak = (minDist + r) / 2;
                      if (peak > minDist) {
                        if (d < peak) {
                          force = a * (d - minDist) / (peak - minDist);
                        } else {
                          force = a * (r - d) / (r - peak);
                        }
                      }
                    }
                    fx += nx * force * 0.5;
                    fy += ny * force * 0.5;
                    
                    if (this.enableTransmutation) {
                      const targetColor = this.transmutationMatrix[ci * MAX_COLORS + cj];
                      if (targetColor !== -1 && targetColor < this.numColors && Math.random() < 0.005) {
                        this.color[i] = targetColor;
                      }
                    }
                  }
                } else {
                  // Normal forces
                  if (d < r) {
                    let force = 0;
                    if (d < minDist) {
                      force = minDist > 0 ? (d / minDist) - 1 : 0;
                    } else {
                      const a = this.attractionMatrix[ci * MAX_COLORS + cj];
                      const peak = (minDist + r) / 2;
                      if (peak > minDist) {
                        if (d < peak) {
                          force = a * (d - minDist) / (peak - minDist);
                        } else {
                          force = a * (r - d) / (r - peak);
                        }
                      }
                    }
                    fx += nx * force;
                    fy += ny * force;

                    // Try to form bond
                    if (i < j && bondSetting > 0 && d < targetBondLen * 1.2) {
                      if (this.bondCounts[i] < MAX_BONDS && 
                          this.bondCounts[j] < MAX_BONDS &&
                          this.bondCountsByColor[i * MAX_COLORS + cj] < this.maxBonds[ci * MAX_COLORS + cj] && 
                          this.bondCountsByColor[j * MAX_COLORS + ci] < this.maxBonds[cj * MAX_COLORS + ci]) {
                        this.addBond(i, j);
                        this.addBond(j, i);
                      }
                    }
                  }
                }

                if (this.enableChirality && d < r) {
                  const chiral = this.chiralityMatrix[ci * MAX_COLORS + cj];
                  if (chiral !== 0) {
                    fx += -ny * chiral;
                    fy += nx * chiral;
                  }
                }

                if (this.enableMetabolism && d < r) {
                  const eDiff = this.energy[j] - this.energy[i];
                  this.energy[i] += eDiff * 0.05; // Share energy
                }
              }
            }
            j = next[j];
          }
        }
      }

      if (this.temperature > 0) {
        fx += (Math.random() - 0.5) * this.temperature;
        fy += (Math.random() - 0.5) * this.temperature;
      }

      this.vx[i] = (this.vx[i] + fx * this.speed) * this.friction;
      this.vy[i] = (this.vy[i] + fy * this.speed) * this.friction;
    }

    // Second pass: Enforce strict bond constraints (Position Based Dynamics approach)
    const numIterations = 3; // More iterations = stiffer bonds
    for (let iter = 0; iter < numIterations; iter++) {
      for (let i = 0; i < this.numParticles; i++) {
        const ci = this.color[i];
        for (let b = 0; b < this.bondCounts[i]; b++) {
          const j = this.bonds[i * MAX_BONDS + b];
          if (j > i) { // Only process each bond once
            const cj = this.color[j];
            const bondSetting = this.bondMatrix[ci * MAX_COLORS + cj];
            
            // The target length is strictly defined by the matrix (1-20) * baseSize
            // Minimum length is 2 * baseSize
            const targetLen = Math.max(2 * this.baseSize, bondSetting * this.baseSize);
            
            let dx = (this.x[j] + this.vx[j]) - (this.x[i] + this.vx[i]);
            let dy = (this.y[j] + this.vy[j]) - (this.y[i] + this.vy[i]);

            // Wrap around
            if (dx > this.width / 2) dx -= this.width;
            else if (dx < -this.width / 2) dx += this.width;
            if (dy > this.height / 2) dy -= this.height;
            else if (dy < -this.height / 2) dy += this.height;

            const dSq = dx * dx + dy * dy;
            if (dSq > 0) {
              const d = Math.sqrt(dSq);
              
              // Strict constraint resolution
              const diff = (d - targetLen) / d;
              
              // Push/pull particles to exactly target length
              const correctionX = dx * 0.5 * diff;
              const correctionY = dy * 0.5 * diff;

              this.vx[i] += correctionX;
              this.vy[i] += correctionY;
              this.vx[j] -= correctionX;
              this.vy[j] -= correctionY;
            }
          }
        }
      }

      // Angular constraints
      for (let i = 0; i < this.numParticles; i++) {
        const count = this.bondCounts[i];
        if (count >= 2) {
          const ci = this.color[i];
          const strength = this.angleStrength[ci];
          if (strength > 0) {
            const targetAngle = this.idealAngle[ci] * Math.PI / 180;
            
            // Collect neighbors
            const neighbors = [];
            for (let b = 0; b < count; b++) {
              const j = this.bonds[i * MAX_BONDS + b];
              let dx = (this.x[j] + this.vx[j]) - (this.x[i] + this.vx[i]);
              let dy = (this.y[j] + this.vy[j]) - (this.y[i] + this.vy[i]);
              
              if (dx > this.width / 2) dx -= this.width;
              else if (dx < -this.width / 2) dx += this.width;
              if (dy > this.height / 2) dy -= this.height;
              else if (dy < -this.height / 2) dy += this.height;
              
              const angle = Math.atan2(dy, dx);
              neighbors.push({ j, angle, dx, dy });
            }
            
            // Sort by angle
            neighbors.sort((a, b) => a.angle - b.angle);
            
            for (let n = 0; n < count; n++) {
              if (count === 2 && n === 1) break; // Only one angle for 2 bonds
              
              const n1 = neighbors[n];
              const n2 = neighbors[(n + 1) % count];
              
              let currentAngle = n2.angle - n1.angle;
              if (currentAngle < 0) currentAngle += 2 * Math.PI;
              
              let diff = targetAngle - currentAngle;
              while (diff > Math.PI) diff -= 2 * Math.PI;
              while (diff < -Math.PI) diff += 2 * Math.PI;
              
              const correction = diff * strength * 0.05; // Tuning factor
              
              const dist1 = Math.sqrt(n1.dx * n1.dx + n1.dy * n1.dy);
              const dist2 = Math.sqrt(n2.dx * n2.dx + n2.dy * n2.dy);
              
              if (dist1 > 0 && dist2 > 0) {
                const t1x = -n1.dy / dist1;
                const t1y = n1.dx / dist1;
                const t2x = -n2.dy / dist2;
                const t2y = n2.dx / dist2;
                
                const disp1x = t1x * (-correction * dist1 * 0.5);
                const disp1y = t1y * (-correction * dist1 * 0.5);
                const disp2x = t2x * (correction * dist2 * 0.5);
                const disp2y = t2y * (correction * dist2 * 0.5);
                
                this.vx[n1.j] += disp1x;
                this.vy[n1.j] += disp1y;
                this.vx[n2.j] += disp2x;
                this.vy[n2.j] += disp2y;
                
                this.vx[i] -= (disp1x + disp2x);
                this.vy[i] -= (disp1y + disp2y);
              }
            }
          }
        }
      }
    }

    // Final position update
    for (let i = 0; i < this.numParticles; i++) {
      if (this.enableMetabolism) {
        this.energy[i] -= 0.002; // Base cost
        this.energy[i] -= (this.vx[i] * this.vx[i] + this.vy[i] * this.vy[i]) * 0.001; // Movement cost
        this.energy[i] -= this.bondCounts[i] * 0.001; // Bond cost

        if (this.color[i] === 0) {
          this.energy[i] += 0.01; // Color 0 is a "plant" and generates energy
        }

        if (this.energy[i] <= 0) {
          this.breakAllBonds(i);
          this.energy[i] = 0;
          this.vx[i] *= 0.5; // Slow down dead particles
          this.vy[i] *= 0.5;
        } else if (this.energy[i] > 2.0 && this.enableMutation) {
          this.energy[i] -= 1.0;
          // Find a dead particle to replace (reproduce)
          for (let j = 0; j < this.numParticles; j++) {
            if (this.energy[j] <= 0) {
              this.x[j] = this.x[i] + (Math.random() - 0.5) * 10;
              this.y[j] = this.y[i] + (Math.random() - 0.5) * 10;
              this.energy[j] = 1.0;
              this.vx[j] = this.vx[i];
              this.vy[j] = this.vy[i];
              
              if (Math.random() < 0.05) { // 5% mutation chance
                this.color[j] = Math.floor(Math.random() * this.numColors);
              } else {
                this.color[j] = this.color[i];
              }
              break;
            }
          }
        }
      }

      // Only move if alive (or if metabolism is off)
      if (!this.enableMetabolism || this.energy[i] > 0) {
        this.x[i] += this.vx[i];
        this.y[i] += this.vy[i];
      }

      if (this.x[i] < 0) this.x[i] += this.width;
      else if (this.x[i] >= this.width) this.x[i] -= this.width;
      if (this.y[i] < 0) this.y[i] += this.height;
      else if (this.y[i] >= this.height) this.y[i] -= this.height;
    }
  }
}
