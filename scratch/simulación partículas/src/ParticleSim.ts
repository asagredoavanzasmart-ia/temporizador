import * as twgl from 'twgl.js';

export const PARTICLE_COUNT = 5000;
export const MAX_COLORS = 8;

const vsCompute = `#version 300 es
in vec4 position;
out vec2 v_texcoord;
void main() {
    v_texcoord = position.xy * 0.5 + 0.5;
    gl_Position = position;
}
`;

const fsCompute = `#version 300 es
precision highp float;

uniform sampler2D u_posTypeMap;
uniform sampler2D u_velMap;

uniform int u_numColors;
uniform float u_rules[64]; // MAX_COLORS x MAX_COLORS matrix
uniform float u_radii[8];  // MAX_COLORS max distances
uniform float u_inertia[8]; // MAX_COLORS inertia values
uniform float u_densityLimits[8]; // MAX_COLORS density limits
uniform float u_minRepulsionDist[8]; // MAX_COLORS min repulsion dist
uniform int u_polarityEnabled;
uniform float u_polarity[8]; // number of poles

uniform int u_radiusEnabled;
uniform int u_inertiaEnabled;
uniform int u_densityEnabled;
uniform int u_minRepulsionEnabled;

uniform float u_dt;
uniform float u_speed;
uniform vec2 u_resolution;

in vec2 v_texcoord;

layout(location = 0) out vec4 outPosType;
layout(location = 1) out vec4 outVel;

void main() {
    ivec2 tc = ivec2(gl_FragCoord.xy);
    
    vec4 posType = texelFetch(u_posTypeMap, tc, 0);
    vec4 velOld = texelFetch(u_velMap, tc, 0);
    
    vec2 pos = posType.xy;
    float typeIdFloat = posType.z;
    int typeId = int(typeIdFloat + 0.5) % u_numColors;
    vec2 vel = velOld.xy;
    float theta = velOld.z;
    
    if (length(vel) > 0.1) {
        theta = atan(vel.y, vel.x);
    }
    
    vec2 force = vec2(0.0);
    float dt = min(u_dt, 0.05) * u_speed;
    
    float myRadius = u_radii[typeId];
    
    float crowdingRadius = 40.0; // Fixed physical space for crowding evaluation
    
    // PASS 1: Calculate local density
    float local_density = 0.0;
    if (u_densityEnabled > 0) {
        for(int i = 0; i < ${PARTICLE_COUNT}; i++) {
            if(i == tc.x) continue; // Skip self
            
            vec4 otherPosType = texelFetch(u_posTypeMap, ivec2(i, 0), 0);
            int otherId = int(otherPosType.z + 0.5) % u_numColors;
            
            vec2 dir = otherPosType.xy - pos;
            
            if (dir.x > u_resolution.x * 0.5) dir.x -= u_resolution.x;
            else if (dir.x < -u_resolution.x * 0.5) dir.x += u_resolution.x;
            if (dir.y > u_resolution.y * 0.5) dir.y -= u_resolution.y;
            else if (dir.y < -u_resolution.y * 0.5) dir.y += u_resolution.y;

            float d = length(dir);
            if(d > 0.0 && d < crowdingRadius) {
                if(typeId == otherId) {
                    local_density += 1.0 - (d / crowdingRadius);
                } else {
                    local_density += (1.0 - (d / crowdingRadius)) * 0.5;
                }
            }
        }
    }
    
    float densityLimit = u_densityLimits[typeId];
    float density_factor = 1.0;
    if (u_densityEnabled > 0) {
        density_factor = 1.0 - min(max(0.0, local_density - densityLimit), 2.0);
    }

    // PASS 2: N-Body force computation
    for(int i = 0; i < ${PARTICLE_COUNT}; i++) {
        if(i == tc.x) continue; // Skip self
        
        vec4 otherPosType = texelFetch(u_posTypeMap, ivec2(i, 0), 0);
        int otherId = int(otherPosType.z + 0.5) % u_numColors;
        
        vec2 dir = otherPosType.xy - pos;
        
        // Toroidal wrap-around for shortest distance
        if (dir.x > u_resolution.x * 0.5) dir.x -= u_resolution.x;
        else if (dir.x < -u_resolution.x * 0.5) dir.x += u_resolution.x;
        
        if (dir.y > u_resolution.y * 0.5) dir.y -= u_resolution.y;
        else if (dir.y < -u_resolution.y * 0.5) dir.y += u_resolution.y;

        float d = length(dir);
        float activeRadius = u_radiusEnabled > 0 ? myRadius : 10000.0;
        
        if(d > 0.0 && d < activeRadius) {
            vec2 fDir = dir / d;
            float ruleForce = u_rules[typeId * 8 + otherId]; 
            
            float pol = u_polarity[typeId];
            if (pol > 0.0 && u_polarityEnabled > 0) {
               float dirAngle = atan(dir.y, dir.x);
               float alpha = dirAngle - theta;
               ruleForce *= cos(pol * alpha);
               ruleForce *= (pol * 2.0); // Amplifica la fuerza vinculante
            }
            
            // Limit attraction by local density factor
            if(ruleForce > 0.0) {
                ruleForce *= density_factor;
            }
            
            // Artificial repulsion to avoid overlaps completely (REQ-07)
            float minRep = u_minRepulsionDist[typeId];
            if(d < minRep && u_minRepulsionEnabled > 0) {
               float repulsion = (minRep - d) * 1.0; 
               force -= fDir * repulsion;
            } else {
               float strength = ruleForce * (1.0 - d / activeRadius); 
               force += fDir * strength;
            }
        }
    }
    
    // Apply inertia based on rules
    float mass = u_inertiaEnabled > 0 ? u_inertia[typeId] : 1.0;
    // if mass <= 0.001, treat as infinite mass (unmovable) or standard
    if (mass < 0.1) mass = 0.1;
    vec2 accel = force / mass;
    
    vel += accel * dt;
    float friction = 0.05 / sqrt(mass);
    vel *= (1.0 - friction); // Global mass-scaled Friction
    
    vec2 nextPos = pos + vel * dt;
    
    // Boundaries (Wrap-around / Toroidal infinite effect)
    if(nextPos.x < 0.0) { nextPos.x += u_resolution.x; }
    else if(nextPos.x >= u_resolution.x) { nextPos.x -= u_resolution.x; }
    
    if(nextPos.y < 0.0) { nextPos.y += u_resolution.y; }
    else if(nextPos.y >= u_resolution.y) { nextPos.y -= u_resolution.y; }
    
    outPosType = vec4(nextPos, typeIdFloat, 1.0);
    outVel = vec4(vel, theta, 1.0);
}
`;

const vsRender = `#version 300 es
precision highp float;
uniform sampler2D u_posTypeMap;
uniform vec2 u_resolution;
uniform float u_zoom;
uniform int u_numColors;
uniform vec2 u_pan;

out float v_type;

void main() {
    vec4 posType = texelFetch(u_posTypeMap, ivec2(gl_VertexID, 0), 0);
    int typeId = int(posType.z + 0.5) % u_numColors;
    vec2 clipSpace = (posType.xy / u_resolution) * 2.0 - 1.0;
    
    // standard WebGL top-to-bottom with pan and zoom
    gl_Position = vec4((clipSpace + u_pan) * vec2(1, -1) * u_zoom, 0.0, 1.0); 
    gl_PointSize = 4.0 * u_zoom;
    v_type = float(typeId);
}
`;

const fsRender = `#version 300 es
precision highp float;
in float v_type;
out vec4 fragColor;

void main() {
    int t = int(v_type + 0.5);
    
    // Color mapping (Synchronized with App.tsx CSS Colors)
    vec4 color;
    if(t == 0) color = vec4(0.88, 0.11, 0.28, 1.0); // Rojo (#e11d48)
    else if(t == 1) color = vec4(0.14, 0.39, 0.92, 1.0); // Azul (#2563eb)
    else if(t == 2) color = vec4(0.92, 0.34, 0.05, 1.0); // Naranja (#ea580c)
    else if(t == 3) color = vec4(0.92, 0.70, 0.03, 1.0); // Amarillo (#eab308)
    else if(t == 4) color = vec4(0.13, 0.77, 0.37, 1.0); // Verde (#22c55e)
    else if(t == 5) color = vec4(0.66, 0.33, 0.97, 1.0); // Morado (#a855f7)
    else if(t == 6) color = vec4(0.02, 0.71, 0.83, 1.0); // Cian (#06b6d4)
    else if(t == 7) color = vec4(0.93, 0.28, 0.60, 1.0); // Rosa (#ec4899)
    else color = vec4(1.0);
    
    // Make circular
    vec2 circCoord = 2.0 * gl_PointCoord - 1.0;
    if (dot(circCoord, circCoord) > 1.0) {
        discard;
    }
    
    fragColor = color;
}
`;

export class ParticleSim {
  private gl: WebGL2RenderingContext;
  private cProgramInfo: twgl.ProgramInfo;
  private rProgramInfo: twgl.ProgramInfo;

  private readFbi: twgl.FramebufferInfo;
  private writeFbi: twgl.FramebufferInfo;

  private quadBuffer: twgl.BufferInfo;

  private then = 0;
  private reqId: number = 0;

  // App state references
  public numColors: number = 5;
  public forceMatrix: number[] = new Array(64).fill(0);
  public radii: number[] = new Array(8).fill(100.0);
  public inertias: number[] = new Array(8).fill(1.0);
  public densityLimits: number[] = new Array(8).fill(25.0);
  public minRepulsionDist: number[] = new Array(8).fill(10.0);
  public polarities: number[] = new Array(8).fill(0.0);

  public isPolarityEnabled: boolean = true;
  public isRadiusEnabled: boolean = true;
  public isInertiaEnabled: boolean = true;
  public isDensityEnabled: boolean = true;
  public isMinRepulsionEnabled: boolean = true;

  public zoom: number = 1.0;
  public speed: number = 1.0;
  public pan: [number, number] = [0, 0];
  public isPaused: boolean = false;

  // Execution time tracking
  public runTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: false });
    if (!gl) {
      throw new Error("WebGL2 no soportado en este navegador.");
    }
    this.gl = gl;
    const ext = gl.getExtension('EXT_color_buffer_float');
    if (!ext) {
      console.error("No EXT_color_buffer_float");
    }

    this.cProgramInfo = twgl.createProgramInfo(gl, [vsCompute, fsCompute]);
    this.rProgramInfo = twgl.createProgramInfo(gl, [vsRender, fsRender]);

    const posData = new Float32Array(PARTICLE_COUNT * 4);
    const velData = new Float32Array(PARTICLE_COUNT * 4);

    const w = canvas.width;
    const h = canvas.height;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posData[i * 4 + 0] = Math.random() * w; // x
      posData[i * 4 + 1] = Math.random() * h; // y
      posData[i * 4 + 2] = Math.floor(Math.random() * MAX_COLORS); // type
      posData[i * 4 + 3] = 1.0;

      velData[i * 4 + 0] = (Math.random() - 0.5) * 10;
      velData[i * 4 + 1] = (Math.random() - 0.5) * 10;
      velData[i * 4 + 2] = 0;
      velData[i * 4 + 3] = 0;
    }

    const texOptionsPos = { width: PARTICLE_COUNT, height: 1, internalFormat: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT, min: gl.NEAREST, mag: gl.NEAREST, wrap: gl.CLAMP_TO_EDGE };
    const texOptionsVel = { width: PARTICLE_COUNT, height: 1, internalFormat: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT, min: gl.NEAREST, mag: gl.NEAREST, wrap: gl.CLAMP_TO_EDGE };

    const posTex1 = twgl.createTexture(gl, { ...texOptionsPos, src: posData });
    const velTex1 = twgl.createTexture(gl, { ...texOptionsVel, src: velData });

    // Need a second set for ping-pong
    const posTex2 = twgl.createTexture(gl, texOptionsPos);
    const velTex2 = twgl.createTexture(gl, texOptionsVel);

    this.readFbi = twgl.createFramebufferInfo(gl, [{ attachmentPoint: gl.COLOR_ATTACHMENT0, attachment: posTex1 }, { attachmentPoint: gl.COLOR_ATTACHMENT1, attachment: velTex1 }], PARTICLE_COUNT, 1);
    this.writeFbi = twgl.createFramebufferInfo(gl, [{ attachmentPoint: gl.COLOR_ATTACHMENT0, attachment: posTex2 }, { attachmentPoint: gl.COLOR_ATTACHMENT1, attachment: velTex2 }], PARTICLE_COUNT, 1);

    // Quad for compute shader execution over the texture
    this.quadBuffer = twgl.createBufferInfoFromArrays(gl, {
      position: { numComponents: 2, data: [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1] }
    });
  }

  public resize(w: number, h: number) {
    this.gl.canvas.width = w;
    this.gl.canvas.height = h;
  }

  public render(time: number) {
    const gl = this.gl;
    const now = time * 0.001;
    const dt = this.then === 0 ? 0.016 : (now - this.then);
    this.then = now;

    if (!this.isPaused) {
      // 1. Compute Pass: Calculate new position and velocity on GPU
      gl.useProgram(this.cProgramInfo.program);
      twgl.bindFramebufferInfo(gl, this.writeFbi);

      // We render to two color attachments [outPosType, outVel]
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      gl.viewport(0, 0, PARTICLE_COUNT, 1);

      twgl.setBuffersAndAttributes(gl, this.cProgramInfo, this.quadBuffer);

      // Obtain inputs from "read" FBO
      const attachments = this.readFbi.attachments;

      this.runTime += dt * this.speed;

      twgl.setUniforms(this.cProgramInfo, {
        u_posTypeMap: attachments[0],
        u_velMap: attachments[1],
        u_numColors: this.numColors,
        u_rules: this.forceMatrix,
        u_radii: this.radii,
        u_inertia: this.inertias,
        u_densityLimits: this.densityLimits,
        u_minRepulsionDist: this.minRepulsionDist,
        u_polarityEnabled: this.isPolarityEnabled ? 1 : 0,
        u_polarity: this.polarities,
        u_radiusEnabled: this.isRadiusEnabled ? 1 : 0,
        u_inertiaEnabled: this.isInertiaEnabled ? 1 : 0,
        u_densityEnabled: this.isDensityEnabled ? 1 : 0,
        u_minRepulsionEnabled: this.isMinRepulsionEnabled ? 1 : 0,
        u_dt: dt * 10.0, // base unscaled physics step time
        u_speed: this.speed,
        u_resolution: [gl.canvas.width, gl.canvas.height]
      });

      twgl.drawBufferInfo(gl, this.quadBuffer);
    }

    // 2. Render Pass: Draw points to screen using new positions
    twgl.bindFramebufferInfo(gl, null); // Render to screen
    gl.clearColor(0, 0, 0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.useProgram(this.rProgramInfo.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const posAttachment = this.isPaused ? this.readFbi.attachments[0] : this.writeFbi.attachments[0];

    twgl.setUniforms(this.rProgramInfo, {
      u_posTypeMap: posAttachment,
      u_resolution: [gl.canvas.width, gl.canvas.height],
      u_zoom: this.zoom,
      u_pan: this.pan,
      u_numColors: this.numColors
    });

    gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);

    if (!this.isPaused) {
      // Swap read and write FBOs for next frame ping pong
      const temp = this.readFbi;
      this.readFbi = this.writeFbi;
      this.writeFbi = temp;
    }

    this.reqId = requestAnimationFrame((t) => this.render(t));
  }

  public start() {
    this.then = 0;
    this.reqId = requestAnimationFrame((t) => this.render(t));
  }

  public stop() {
    cancelAnimationFrame(this.reqId);
  }

  public resetParticles() {
    const posData = new Float32Array(PARTICLE_COUNT * 4);
    const velData = new Float32Array(PARTICLE_COUNT * 4);
    const w = this.gl.canvas.width;
    const h = this.gl.canvas.height;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posData[i * 4 + 0] = Math.random() * w; // x
      posData[i * 4 + 1] = Math.random() * h; // y
      posData[i * 4 + 2] = Math.floor(Math.random() * MAX_COLORS); // type
      posData[i * 4 + 3] = 1.0;

      velData[i * 4 + 0] = (Math.random() - 0.5) * 10;
      velData[i * 4 + 1] = (Math.random() - 0.5) * 10;
      velData[i * 4 + 2] = 0;
      velData[i * 4 + 3] = 0;
    }

    const gl = this.gl;
    // Overwrite textures
    gl.bindTexture(gl.TEXTURE_2D, this.readFbi.attachments[0]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PARTICLE_COUNT, 1, gl.RGBA, gl.FLOAT, posData);
    gl.bindTexture(gl.TEXTURE_2D, this.readFbi.attachments[1]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PARTICLE_COUNT, 1, gl.RGBA, gl.FLOAT, velData);

    this.runTime = 0;
  }

  public saveState(): { pos: Float32Array, vel: Float32Array } {
    const gl = this.gl;
    const posData = new Float32Array(PARTICLE_COUNT * 4);
    const velData = new Float32Array(PARTICLE_COUNT * 4);

    twgl.bindFramebufferInfo(gl, this.readFbi);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.readPixels(0, 0, PARTICLE_COUNT, 1, gl.RGBA, gl.FLOAT, posData);

    gl.readBuffer(gl.COLOR_ATTACHMENT1);
    gl.readPixels(0, 0, PARTICLE_COUNT, 1, gl.RGBA, gl.FLOAT, velData);
    twgl.bindFramebufferInfo(gl, null);

    return { pos: posData, vel: velData };
  }

  public loadState(data: { pos: Float32Array, vel: Float32Array }) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.readFbi.attachments[0]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PARTICLE_COUNT, 1, gl.RGBA, gl.FLOAT, data.pos);
    gl.bindTexture(gl.TEXTURE_2D, this.readFbi.attachments[1]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PARTICLE_COUNT, 1, gl.RGBA, gl.FLOAT, data.vel);
  }
}
