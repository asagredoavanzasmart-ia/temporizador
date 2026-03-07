import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Plus, Trash2, Activity, ChevronDown, Shuffle } from 'lucide-react';
import { MAX_COLORS } from '../../models/AutomataEngine';

interface ControlsProps {
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  onRestart: () => void;
  onRandomize: () => void;
  
  numParticles: number;
  setNumParticles: (v: number) => void;
  speed: number;
  setSpeed: (v: number) => void;
  animationSpeed: number;
  setAnimationSpeed: (v: number) => void;
  temperature: number;
  setTemperature: (v: number) => void;
  
  colors: string[];
  setColors: (v: string[]) => void;
  
  attractionMatrix: number[][];
  setAttractionMatrix: (v: number[][]) => void;
  
  radiusMatrix: number[][];
  setRadiusMatrix: (v: number[][]) => void;
  
  minDistanceMatrix: number[][];
  setMinDistanceMatrix: (v: number[][]) => void;
  
  bondMatrix: number[][];
  setBondMatrix: (v: number[][]) => void;
  
  maxBonds: number[][];
  setMaxBonds: (v: number[][]) => void;
  
  bondStrengthMatrix: number[][];
  setBondStrengthMatrix: (v: number[][]) => void;
  
  idealAngle: number[];
  setIdealAngle: (v: number[]) => void;
  
  angleStrength: number[];
  setAngleStrength: (v: number[]) => void;

  enableMetabolism: boolean;
  setEnableMetabolism: (v: boolean) => void;
  enableMutation: boolean;
  setEnableMutation: (v: boolean) => void;
  enableStigmergy: boolean;
  setEnableStigmergy: (v: boolean) => void;
  enableTransmutation: boolean;
  setEnableTransmutation: (v: boolean) => void;
  enableChirality: boolean;
  setEnableChirality: (v: boolean) => void;

  pheromoneAttractionMatrix: number[][];
  setPheromoneAttractionMatrix: (v: number[][]) => void;
  transmutationMatrix: number[][];
  setTransmutationMatrix: (v: number[][]) => void;
  chiralityMatrix: number[][];
  setChiralityMatrix: (v: number[][]) => void;
}

const Accordion = ({ title, children, defaultOpen = false }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-800">
      <button 
        className="w-full flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-800/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">{title}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="p-4 bg-slate-900">{children}</div>}
    </div>
  );
};

const MatrixControl = ({ colors, matrix, onChange, min, max, step, isFloat = false }: any) => {
  return (
    <div className="overflow-x-auto custom-scrollbar pb-2">
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${colors.length}, minmax(3rem, 1fr))` }}>
        <div /> {/* Top-left empty */}
        {colors.map((c: string, i: number) => (
          <div key={`col-${i}`} className="flex justify-center items-center p-1">
            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: c }} />
          </div>
        ))}
        
        {colors.map((colorI: string, i: number) => (
          <React.Fragment key={`row-${i}`}>
            <div className="flex items-center justify-end pr-2">
              <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: colorI }} />
            </div>
            {colors.map((_: string, j: number) => {
              const val = matrix[i][j];
              const displayVal = isFloat ? (val === 0 ? "0" : val.toFixed(2)) : val;
              return (
                <input 
                  key={`cell-${i}-${j}`}
                  type="number"
                  min={min} max={max} step={step}
                  value={displayVal}
                  onChange={(e) => {
                    let v = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value);
                    if (isNaN(v)) v = 0;
                    onChange(i, j, v);
                  }}
                  className="w-12 h-8 bg-slate-900/80 border border-slate-700/50 rounded text-center text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export const AutomataControls: React.FC<ControlsProps> = ({
  isPlaying, setIsPlaying, onRestart, onRandomize,
  numParticles, setNumParticles,
  speed, setSpeed,
  animationSpeed, setAnimationSpeed,
  temperature, setTemperature,
  colors, setColors,
  attractionMatrix, setAttractionMatrix,
  radiusMatrix, setRadiusMatrix,
  minDistanceMatrix, setMinDistanceMatrix,
  bondMatrix, setBondMatrix,
  maxBonds, setMaxBonds,
  bondStrengthMatrix, setBondStrengthMatrix,
  idealAngle, setIdealAngle,
  angleStrength, setAngleStrength,
  enableMetabolism, setEnableMetabolism,
  enableMutation, setEnableMutation,
  enableStigmergy, setEnableStigmergy,
  enableTransmutation, setEnableTransmutation,
  enableChirality, setEnableChirality,
  pheromoneAttractionMatrix, setPheromoneAttractionMatrix,
  transmutationMatrix, setTransmutationMatrix,
  chiralityMatrix, setChiralityMatrix
}) => {

  const handleAddColor = () => {
    if (colors.length < MAX_COLORS) {
      const newColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
      setColors([...colors, newColor]);
    }
  };

  const handleRemoveColor = (index: number) => {
    if (colors.length > 1) {
      const newColors = [...colors];
      newColors.splice(index, 1);
      setColors(newColors);
    }
  };

  const updateAttraction = (i: number, j: number, val: number) => {
    const newMat = [...attractionMatrix];
    newMat[i] = [...newMat[i]];
    newMat[i][j] = val;
    setAttractionMatrix(newMat);
  };

  const updateRadius = (i: number, j: number, val: number) => {
    const newMat = [...radiusMatrix];
    newMat[i] = [...newMat[i]];
    newMat[i][j] = val;
    newMat[j] = [...newMat[j]];
    newMat[j][i] = val; // Enforce symmetry for radius
    setRadiusMatrix(newMat);
  };

  const updateMinDistance = (i: number, j: number, val: number) => {
    const newMat = [...minDistanceMatrix];
    newMat[i] = [...newMat[i]];
    newMat[i][j] = val;
    newMat[j] = [...newMat[j]];
    newMat[j][i] = val; // Enforce symmetry for min distance
    setMinDistanceMatrix(newMat);
  };

  const updateBond = (i: number, j: number, val: number) => {
    const newMat = [...bondMatrix];
    newMat[i] = [...newMat[i]];
    newMat[i][j] = val;
    newMat[j] = [...newMat[j]];
    newMat[j][i] = val; // Enforce symmetry for bonds
    setBondMatrix(newMat);
  };

  const updateMaxBonds = (i: number, j: number, val: number) => {
    const newMat = [...maxBonds];
    newMat[i] = [...newMat[i]];
    newMat[i][j] = val;
    newMat[j] = [...newMat[j]];
    newMat[j][i] = val; // Enforce symmetry for max bonds
    setMaxBonds(newMat);
  };

  const updateBondStrength = (i: number, j: number, val: number) => {
    const newMat = [...bondStrengthMatrix];
    newMat[i] = [...newMat[i]];
    newMat[i][j] = val;
    newMat[j] = [...newMat[j]];
    newMat[j][i] = val; // Enforce symmetry for bond strength
    setBondStrengthMatrix(newMat);
  };

  const updateAngle = (i: number, val: number) => {
    const newArr = [...idealAngle];
    newArr[i] = val;
    setIdealAngle(newArr);
  };

  const updateAngleStrength = (i: number, val: number) => {
    const newArr = [...angleStrength];
    newArr[i] = val;
    setAngleStrength(newArr);
  };

  const updatePheromone = (i: number, j: number, val: number) => {
    const newMat = [...pheromoneAttractionMatrix];
    newMat[i] = [...newMat[i]];
    newMat[i][j] = val;
    setPheromoneAttractionMatrix(newMat);
  };

  const updateTransmutation = (i: number, j: number, val: number) => {
    const newMat = [...transmutationMatrix];
    newMat[i] = [...newMat[i]];
    newMat[i][j] = val;
    setTransmutationMatrix(newMat);
  };

  const updateChirality = (i: number, j: number, val: number) => {
    const newMat = [...chiralityMatrix];
    newMat[i] = [...newMat[i]];
    newMat[i][j] = val;
    newMat[j] = [...newMat[j]];
    newMat[j][i] = -val; // Anti-symmetric
    setChiralityMatrix(newMat);
  };

  return (
    <div className="w-full h-full bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 shadow-xl">
      <div className="hidden md:flex p-4 border-b border-slate-800 items-center justify-between bg-slate-950">
        <h1 className="text-lg font-bold tracking-tight text-white uppercase flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          Autómata Celular
        </h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-emerald-400"
            title={isPlaying ? "Pausar" : "Reproducir"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button 
            onClick={onRandomize}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-purple-400"
            title="Aleatorizar Parámetros"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button 
            onClick={onRestart}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-blue-400"
            title="Reiniciar"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <Accordion title="General" defaultOpen>
          <div className="space-y-5">
            <ControlSlider label="Cantidad de Partículas" value={numParticles} min={1000} max={10000} step={500} onChange={setNumParticles} />
            <ControlSlider label="Velocidad de Partículas" value={speed} min={0.1} max={5} step={0.1} onChange={setSpeed} />
            <ControlSlider label="Velocidad de Animación" value={animationSpeed} min={1} max={10} step={1} onChange={setAnimationSpeed} />
            <ControlSlider label="Temperatura (Agitación)" value={temperature} min={0} max={10} step={0.1} onChange={setTemperature} />
          </div>
        </Accordion>

        <Accordion title="Colores">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipos de Partículas</span>
              <button 
                onClick={handleAddColor}
                disabled={colors.length >= MAX_COLORS}
                className="p-1.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {colors.map((color, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                  <input 
                    type="color" 
                    value={color}
                    onChange={(e) => {
                      const newColors = [...colors];
                      newColors[i] = e.target.value;
                      setColors(newColors);
                    }}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <span className="flex-1 font-mono text-xs text-slate-300 uppercase">{color}</span>
                  <button 
                    onClick={() => handleRemoveColor(i)}
                    disabled={colors.length <= 1}
                    className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Accordion>

        <Accordion title="Fuerzas de Atracción">
          <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
            Positivo atrae, negativo repele.
          </p>
          <MatrixControl 
            colors={colors} 
            matrix={attractionMatrix} 
            onChange={updateAttraction} 
            min={-1} max={1} step={0.05} isFloat 
          />
        </Accordion>

        <Accordion title="Radio de Acción">
          <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
            Distancia máxima de interacción de fuerzas.
          </p>
          <MatrixControl 
            colors={colors} 
            matrix={radiusMatrix} 
            onChange={updateRadius} 
            min={10} max={200} step={5} 
          />
        </Accordion>

        <Accordion title="Separación Mínima">
          <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
            Distancia de repulsión máxima. 0 permite superposición.
          </p>
          <MatrixControl 
            colors={colors} 
            matrix={minDistanceMatrix} 
            onChange={updateMinDistance} 
            min={0} max={50} step={1} 
          />
        </Accordion>

        <Accordion title="Longitud de Enlace">
          <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
            0 = sin enlace. 1-20 = longitud del enlace.
          </p>
          <MatrixControl 
            colors={colors} 
            matrix={bondMatrix} 
            onChange={updateBond} 
            min={0} max={20} step={1} 
          />
        </Accordion>

        <Accordion title="Máximo de Enlaces">
          <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
            Cantidad máxima de enlaces permitidos entre colores.
          </p>
          <MatrixControl 
            colors={colors} 
            matrix={maxBonds} 
            onChange={updateMaxBonds} 
            min={0} max={8} step={1} 
          />
        </Accordion>

        <Accordion title="Resistencia de Enlace">
          <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
            Resistencia a romperse (0.0 = frágil, 1.0 = irrompible).
          </p>
          <MatrixControl 
            colors={colors} 
            matrix={bondStrengthMatrix} 
            onChange={updateBondStrength} 
            min={0} max={1} step={0.05} isFloat 
          />
        </Accordion>

        <Accordion title="Geometría (Ángulos)">
          <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
            Ángulo ideal entre enlaces para formar cristales.
          </p>
          <div className="space-y-4">
            {colors.map((color, i) => (
              <div key={`angle-${i}`} className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/50 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Ángulos de {color}</span>
                </div>
                <ControlSlider 
                  label="Ángulo Ideal (°)" 
                  value={idealAngle[i]} 
                  min={0} max={360} step={1} 
                  onChange={(v) => updateAngle(i, v)} 
                />
                <ControlSlider 
                  label="Fuerza del Ángulo" 
                  value={angleStrength[i]} 
                  min={0} max={1} step={0.05} 
                  onChange={(v) => updateAngleStrength(i, v)} 
                />
              </div>
            ))}
          </div>
        </Accordion>

        <Accordion title="Reglas Avanzadas (Vida Artificial)">
          <div className="space-y-6">
            <div className="space-y-3">
              <Toggle label="Metabolismo y Energía" description="Las partículas consumen energía al moverse y enlazarse. El Color 1 genera energía. Si se quedan sin energía, mueren." checked={enableMetabolism} onChange={setEnableMetabolism} />
              <Toggle label="Mutación y Herencia" description="Las partículas con mucha energía se replican reemplazando a las muertas, con un 5% de probabilidad de mutar de color." checked={enableMutation} onChange={setEnableMutation} />
              <Toggle label="Señales Químicas (Stigmergia)" description="Las partículas dejan un rastro que otras pueden oler." checked={enableStigmergy} onChange={setEnableStigmergy} />
              <Toggle label="Transmutación Celular" description="Las partículas cambian de color al estar enlazadas con ciertas especies." checked={enableTransmutation} onChange={setEnableTransmutation} />
              <Toggle label="Quiralidad (Asimetría)" description="Fuerzas perpendiculares que generan rotación y motores moleculares." checked={enableChirality} onChange={setEnableChirality} />
            </div>

            {enableStigmergy && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Atracción a Feromonas</p>
                <MatrixControl colors={colors} matrix={pheromoneAttractionMatrix} onChange={updatePheromone} min={-1} max={1} step={0.1} isFloat />
              </div>
            )}

            {enableTransmutation && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Transmutación (-1 = Ninguna)</p>
                <MatrixControl colors={colors} matrix={transmutationMatrix} onChange={updateTransmutation} min={-1} max={MAX_COLORS - 1} step={1} />
              </div>
            )}

            {enableChirality && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Quiralidad (Fuerza de Giro)</p>
                <MatrixControl colors={colors} matrix={chiralityMatrix} onChange={updateChirality} min={-1} max={1} step={0.1} isFloat />
              </div>
            )}
          </div>
        </Accordion>
      </div>
    </div>
  );
};

const ControlSlider = ({ label, value, min, max, step, onChange }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</label>
      <span className="font-mono text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">{value}</span>
    </div>
    <input 
      type="range" 
      min={min} max={max} step={step} 
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
    />
  </div>
);

const Toggle = ({ label, description, checked, onChange }: { label: string, description: string, checked: boolean, onChange: (v: boolean) => void }) => (
  <label className="flex items-start gap-3 cursor-pointer group">
    <div className="relative flex items-center mt-0.5">
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className={`w-8 h-4 rounded-full transition-colors ${checked ? 'bg-purple-500' : 'bg-slate-700'}`}></div>
      <div className={`absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}></div>
    </div>
    <div className="flex flex-col">
      <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{label}</span>
      <span className="text-[10px] text-slate-500 leading-tight mt-0.5">{description}</span>
    </div>
  </label>
);
