import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Activity, Shuffle } from 'lucide-react';
import { MAX_COLORS } from '../../models/AutomataEngine';

interface ControlsProps {
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  onRestart: () => void;
  onRandomize: () => void;
  goBack: () => void;
  
  numParticles: number;
  setNumParticles: (v: number) => void;
  speed: number;
  setSpeed: (v: number) => void;
  animationSpeed: number;
  setAnimationSpeed: (v: number) => void;
  temperature: number;
  setTemperature: (v: number) => void;
  friction: number;
  setFriction: (v: number) => void;
  
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
}

const MatrixControl = ({ colors, matrix, onChange, min, max, step, isFloat = false }: any) => {
  return (
    <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
      <div style={{ display: 'inline-grid', gap: '4px', gridTemplateColumns: `auto repeat(${colors.length}, minmax(3rem, 1fr))` }}>
        <div />
        {colors.map((c: string, i: number) => (
          <div key={`col-${i}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: c, boxShadow: '0 1px 2px rgba(0,0,0,0.5)' }} />
          </div>
        ))}
        
        {colors.map((colorI: string, i: number) => (
          <React.Fragment key={`row-${i}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: colorI, boxShadow: '0 1px 2px rgba(0,0,0,0.5)' }} />
            </div>
            {colors.map((_: string, j: number) => {
              const val = matrix[i] ? matrix[i][j] : 0;
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
                  style={{
                    width: '3rem', height: '2rem',
                    backgroundColor: 'rgba(18,18,20,0.9)',
                    border: '1px solid rgba(62,62,66,0.8)',
                    borderRadius: '4px',
                    textAlign: 'center',
                    color: '#FF8C00',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const Accordion = ({ title, children, defaultOpen = false }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem', background: 'none', border: 'none', cursor: 'pointer',
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#ababab', textTransform: 'uppercase' }}>
          {title}
        </span>
        <Activity style={{ width: '12px', height: '12px', color: isOpen ? '#FF8C00' : '#3e3e42', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s, color 0.3s' }} />
      </button>
      {isOpen && (
        <div style={{ padding: '1rem', paddingTop: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {children}
        </div>
      )}
    </div>
  );
};

export const AutomataControls: React.FC<ControlsProps> = ({
  isPlaying, setIsPlaying, onRestart, onRandomize, goBack,
  numParticles, setNumParticles,
  speed, setSpeed,
  animationSpeed, setAnimationSpeed,
  temperature, setTemperature,
  friction, setFriction,
  colors, setColors,
  attractionMatrix, setAttractionMatrix,
  radiusMatrix, setRadiusMatrix,
  minDistanceMatrix, setMinDistanceMatrix,
  bondMatrix, setBondMatrix,
  maxBonds, setMaxBonds,
  bondStrengthMatrix, setBondStrengthMatrix,
  idealAngle, setIdealAngle,
  angleStrength, setAngleStrength,
}) => {

  const SPEED_OPTIONS = [0.1, 0.25, 0.5, 1, 2];

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
    if (!attractionMatrix[i]) return;
    const newMat = [...attractionMatrix];
    newMat[i] = [...newMat[i]];
    newMat[i][j] = val;
    setAttractionMatrix(newMat);
  };

  const updateRadius = (i: number, j: number, val: number) => {
    if (!radiusMatrix[i] || !radiusMatrix[j]) return;
    const newMat = [...radiusMatrix];
    newMat[i] = [...newMat[i]]; newMat[i][j] = val;
    newMat[j] = [...newMat[j]]; newMat[j][i] = val;
    setRadiusMatrix(newMat);
  };

  const updateMinDistance = (i: number, j: number, val: number) => {
    if (!minDistanceMatrix[i] || !minDistanceMatrix[j]) return;
    const newMat = [...minDistanceMatrix];
    newMat[i] = [...newMat[i]]; newMat[i][j] = val;
    newMat[j] = [...newMat[j]]; newMat[j][i] = val;
    setMinDistanceMatrix(newMat);
  };

  const updateBond = (i: number, j: number, val: number) => {
    if (!bondMatrix[i] || !bondMatrix[j]) return;
    const newMat = [...bondMatrix];
    newMat[i] = [...newMat[i]]; newMat[i][j] = val;
    newMat[j] = [...newMat[j]]; newMat[j][i] = val;
    setBondMatrix(newMat);
  };

  const updateMaxBonds = (i: number, j: number, val: number) => {
    if (!maxBonds[i] || !maxBonds[j]) return;
    const newMat = [...maxBonds];
    newMat[i] = [...newMat[i]]; newMat[i][j] = val;
    newMat[j] = [...newMat[j]]; newMat[j][i] = val;
    setMaxBonds(newMat);
  };

  const updateBondStrength = (i: number, j: number, val: number) => {
    if (!bondStrengthMatrix[i] || !bondStrengthMatrix[j]) return;
    const newMat = [...bondStrengthMatrix];
    newMat[i] = [...newMat[i]]; newMat[i][j] = val;
    newMat[j] = [...newMat[j]]; newMat[j][i] = val;
    setBondStrengthMatrix(newMat);
  };

  const updateAngle = (i: number, val: number) => {
    const newArr = [...idealAngle]; newArr[i] = val; setIdealAngle(newArr);
  };

  const updateAngleStrength = (i: number, val: number) => {
    const newArr = [...angleStrength]; newArr[i] = val; setAngleStrength(newArr);
  };

  /* ---- Estilos inline reutilizables ---- */
  const sChip = (active: boolean): React.CSSProperties => ({
    padding: '3px 10px',
    borderRadius: '9999px',
    fontSize: '10px',
    fontWeight: 700,
    cursor: 'pointer',
    border: active ? '1px solid #FF8C00' : '1px solid rgba(255,255,255,0.1)',
    backgroundColor: active ? 'rgba(255,140,0,0.15)' : 'rgba(45,45,48,0.4)',
    color: active ? '#FF8C00' : '#ababab',
    transition: 'all 0.15s',
  });

  const sFrictionLabel: React.CSSProperties = {
    fontSize: '9px', color: '#64748b', fontWeight: 600,
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }} className="custom-scrollbar">

      {/* ──── CONFIGURACIÓN ──── */}
      <Accordion title="Configuración" defaultOpen={true}>
        <div className="slider-group">
          <ControlSlider label="Partículas" value={numParticles} min={500} max={6000} step={500} onChange={setNumParticles} />
          <ControlSlider label="Velocidad" value={speed} min={0.1} max={5} step={0.1} onChange={setSpeed} />
          <ControlSlider label="Temperatura" value={temperature} min={0} max={10} step={0.1} onChange={setTemperature} />
        </div>

        {/* Velocidad de animación — chips */}
        <div style={{ marginTop: '8px' }}>
          <span style={{ fontSize: '10px', color: '#ababab', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
            Velocidad de Animación
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {SPEED_OPTIONS.map(opt => (
              <button
                key={opt}
                style={sChip(animationSpeed === opt)}
                onClick={() => setAnimationSpeed(opt)}
              >
                {opt}x
              </button>
            ))}
          </div>
        </div>
      </Accordion>

      {/* ──── DINÁMICA (Fricción) ──── */}
      <Accordion title="Dinámica">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Etiquetas de extremos */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={sFrictionLabel}>🪨 Fricción alta</span>
            <span style={sFrictionLabel}>🌐 Espacio libre</span>
          </div>
          <input
            type="range"
            min={0.5} max={1.0} step={0.01}
            value={friction}
            onChange={(e) => setFriction(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#FF8C00' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '9px', color: '#64748b' }}>Roce</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#FF8C00', fontVariantNumeric: 'tabular-nums' }}>
              {(friction * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </Accordion>

      {/* ──── PARTÍCULAS Y COLORES ──── */}
      <Accordion title="Partículas y Colores">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Activos: {colors.length}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="icon-btn" style={{ padding: '2px 8px', fontSize: '9px', height: '24px' }}
                onClick={() => handleRemoveColor(colors.length - 1)} disabled={colors.length <= 1}>
                − Quitar
              </button>
              <button className="icon-btn" style={{ padding: '2px 8px', fontSize: '9px', height: '24px' }}
                onClick={handleAddColor} disabled={colors.length >= MAX_COLORS}>
                + Agregar
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {colors.map((color, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(45,45,48,0.3)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <input type="color" value={color}
                  onChange={(e) => { const nc = [...colors]; nc[i] = e.target.value; setColors(nc); }}
                  style={{ width: '16px', height: '16px', borderRadius: '2px', cursor: 'pointer', border: 'none', padding: 0, background: 'transparent' }}
                />
                <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{color}</span>
              </div>
            ))}
          </div>
        </div>
      </Accordion>

      {/* ──── ATRACCIÓN Y RADIO ──── */}
      <Accordion title="Atracción y Radio">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Fuerzas</span>
              <button className="icon-btn" style={{ padding: '2px 8px', fontSize: '9px', height: '20px' }} onClick={onRandomize}>
                <Shuffle size={10} /> Aleatorio
              </button>
            </div>
            <MatrixControl colors={colors} matrix={attractionMatrix} onChange={updateAttraction} min={-1} max={1} step={0.05} isFloat />
          </div>
          <div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Radio de Acción</span>
            <MatrixControl colors={colors} matrix={radiusMatrix} onChange={updateRadius} min={10} max={200} step={5} />
          </div>
        </div>
      </Accordion>

      {/* ──── FÍSICA DE ENLACES ──── */}
      <Accordion title="Física de Enlaces">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Longitud</span>
            <MatrixControl colors={colors} matrix={bondMatrix} onChange={updateBond} min={0} max={20} step={1} />
          </div>
          <div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Máximo Enlaces</span>
            <MatrixControl colors={colors} matrix={maxBonds} onChange={updateMaxBonds} min={0} max={8} step={1} />
          </div>
        </div>
      </Accordion>

      {/* ──── GEOMETRÍA MOLECULAR ──── */}
      <Accordion title="Geometría Molecular">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {colors.map((color, i) => (
            <div key={`geom-${i}`} style={{ backgroundColor: 'rgba(45,45,48,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color }} />
                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>Tipo {i + 1}</span>
              </div>
              <SliderWithInput label="Ángulo" value={idealAngle[i]} min={0} max={360} step={1} onChange={(v) => updateAngle(i, v)} />
              <SliderWithInput label="Fuerza" value={angleStrength[i]} min={0} max={1} step={0.01} onChange={(v) => updateAngleStrength(i, v)} />
            </div>
          ))}
        </div>
      </Accordion>

      {/* ──── FOOTER: 3 botones de acción ──── */}
      <div style={{ padding: '1rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(18,18,20,0.7)', position: 'sticky', bottom: 0, backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="primary-btn"
            style={{ flex: 1, height: '38px', fontSize: '10px', backgroundColor: 'rgba(255,140,0,0.12)', borderColor: 'rgba(255,140,0,0.3)', color: '#FF8C00' }}
            onClick={onRandomize}
            title="Generar configuración aleatoria"
          >
            <Shuffle size={13} /> Aleatorizar
          </button>
          <button
            className="primary-btn outline"
            style={{ flex: 1, height: '38px', fontSize: '10px' }}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />} {isPlaying ? 'Pausa' : 'Seguir'}
          </button>
          <button
            className="primary-btn outline"
            style={{ flex: 1, height: '38px', fontSize: '10px' }}
            onClick={onRestart}
          >
            <RotateCcw size={13} /> Reiniciar
          </button>
        </div>
      </div>

    </div>
  );
};

/* Slider + input numérico editable side by side */
const SliderWithInput = ({ label, value, min, max, step, onChange }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void }) => (
  <div className="slider-row" style={{ gap: '6px' }}>
    <span className="slider-label">{label}</span>
    <input 
      type="range" 
      min={min} max={max} step={step} 
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ flex: 1 }}
    />
    <input
      type="number"
      min={min} max={max} step={step}
      value={value.toFixed(2)}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(Math.min(max, Math.max(min, parseFloat(v.toFixed(2)))));
      }}
      style={{
        width: '52px', height: '22px',
        backgroundColor: 'rgba(18,18,20,0.9)',
        border: '1px solid rgba(62,62,66,0.8)',
        borderRadius: '4px',
        textAlign: 'center',
        color: '#FF8C00',
        fontFamily: 'monospace',
        fontSize: '11px',
        outline: 'none',
        flexShrink: 0,
      }}
    />
  </div>
);

const ControlSlider = ({ label, value, min, max, step, onChange }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void }) => (
  <div className="slider-row">
    <span className="slider-label">{label}</span>
    <input 
      type="range" 
      min={min} max={max} step={step} 
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
    <span className="slider-value">{value.toFixed(2)}</span>
  </div>
);


const Toggle = ({ label, description, checked, onChange }: { label: string, description: string, checked: boolean, onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between group">
    <div className="flex flex-col">
      <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{label}</span>
      <span className="text-[9px] text-slate-500 leading-tight">{description}</span>
    </div>
    <label className="switch-label">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="switch-visual" />
    </label>
  </div>
);

