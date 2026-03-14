import { useState, useEffect, useRef, useCallback } from 'react';
import { AutomataEngine, MAX_COLORS } from './models/AutomataEngine';
import { AutomataCanvas } from './components/Automata/AutomataCanvas';
import { AutomataControls } from './components/Automata/AutomataControls';
import { Activity, Settings2, ArrowLeft, Sun, Moon } from 'lucide-react';

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#eab308', // yellow
];

interface AutomataAppProps {
  goBack: () => void;
}

export default function AutomataApp({ goBack }: AutomataAppProps) {
  const [engine, setEngine] = useState<AutomataEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  
  const [colors, setColors] = useState<string[]>(DEFAULT_COLORS);
  
  const [numParticles, setNumParticles] = useState(3000);


  const [speed, setSpeed] = useState(1);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [temperature, setTemperature] = useState(0.5);
  const [friction, setFriction] = useState(0.8);

  const [attractionMatrix, setAttractionMatrix] = useState<number[][]>(() => {
    const mat = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0));
    mat[0][0] = 0.5; mat[0][1] = -0.2; mat[0][2] = 0.3; mat[0][3] = 0.1;
    mat[1][0] = 0.2; mat[1][1] = 0.6; mat[1][2] = -0.1; mat[1][3] = 0.2;
    mat[2][0] = -0.3; mat[2][1] = 0.2; mat[2][2] = 0.4; mat[2][3] = -0.2;
    mat[3][0] = 0.1; mat[3][1] = -0.2; mat[3][2] = 0.3; mat[3][3] = 0.5;
    return mat;
  });

  const [radiusMatrix, setRadiusMatrix] = useState<number[][]>(() =>
    Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(60))
  );

  const [minDistanceMatrix, setMinDistanceMatrix] = useState<number[][]>(() =>
    Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(5))
  );
  
  const [bondMatrix, setBondMatrix] = useState<number[][]>(() => 
    Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0))
  );
  
  const [maxBonds, setMaxBonds] = useState<number[][]>(() => {
    const arr = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(2));
    return arr;
  });

  const [bondStrengthMatrix, setBondStrengthMatrix] = useState<number[][]>(() =>
    Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0.5))
  );

  const [idealAngle, setIdealAngle] = useState<number[]>(() => Array(MAX_COLORS).fill(120));
  const [angleStrength, setAngleStrength] = useState<number[]>(() => Array(MAX_COLORS).fill(0));

  const containerRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleRestart = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    
    // Use the actual container size if available, otherwise fallback
    const width = clientWidth || window.innerWidth;
    const height = clientHeight || window.innerHeight;
    
    const newEngine = new AutomataEngine(width, height, numParticles, colors.length);
    setEngine(newEngine);
  }, [numParticles, colors.length]);

  const handleRandomize = useCallback(() => {
    const newNumColors = Math.floor(Math.random() * 4) + 3;
    const newColors = Array.from({length: newNumColors}, () => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`);
    setColors(newColors);
    setNumParticles(Math.floor(Math.random() * 11) * 500 + 500); // 500-6000
    setSpeed(parseFloat((Math.random() * 2.9 + 0.1).toFixed(1)));
    setTemperature(parseFloat((Math.random() * 2.0).toFixed(1)));
    setAnimationSpeed([0.1, 0.25, 0.5, 1, 2][Math.floor(Math.random() * 5)]);
    setFriction(parseFloat((Math.random() * 0.5 + 0.5).toFixed(2))); // 0.5-1.0

    const newAttraction = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0));
    const newRadius = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0));
    const newMinDist = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0));
    const newBond = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0));
    const newMaxBonds = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0));
    const newBondStrength = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0));
    const newIdealAngle = Array(MAX_COLORS).fill(0);
    const newAngleStrength = Array(MAX_COLORS).fill(0);

    for (let i = 0; i < MAX_COLORS; i++) {
      newIdealAngle[i] = Math.floor(Math.random() * 360);
      newAngleStrength[i] = Math.random() > 0.5 ? Math.random() : 0;
      for (let j = 0; j < MAX_COLORS; j++) {
        newAttraction[i][j] = (Math.random() * 2 - 1);
        if (i <= j) {
          const r = Math.floor(Math.random() * 150) + 10;
          const md = Math.floor(Math.random() * 30);
          const b = Math.random() > 0.5 ? Math.floor(Math.random() * 15) + 2 : 0;
          const mb = Math.floor(Math.random() * 4);
          const bs = Math.random();
          newRadius[i][j] = r; newRadius[j][i] = r;
          newMinDist[i][j] = md; newMinDist[j][i] = md;
          newBond[i][j] = b; newBond[j][i] = b;
          newMaxBonds[i][j] = mb; newMaxBonds[j][i] = mb;
          newBondStrength[i][j] = bs; newBondStrength[j][i] = bs;
        }
      }
    }
    setAttractionMatrix(newAttraction);
    setRadiusMatrix(newRadius);
    setMinDistanceMatrix(newMinDist);
    setBondMatrix(newBond);
    setMaxBonds(newMaxBonds);
    setBondStrengthMatrix(newBondStrength);
    setIdealAngle(newIdealAngle);
    setAngleStrength(newAngleStrength);
  }, []);



  useEffect(() => {
    handleRestart();
  }, []); 

  useEffect(() => {
    if (!engine) return;
    engine.setColors(colors.length);
    engine.speed = speed;
    engine.temperature = temperature;
    engine.friction = friction;
    
    for (let i = 0; i < MAX_COLORS; i++) {
      for (let j = 0; j < MAX_COLORS; j++) {
        engine.attractionMatrix[i * MAX_COLORS + j] = attractionMatrix[i]?.[j] ?? 0;
        engine.radiusMatrix[i * MAX_COLORS + j] = radiusMatrix[i]?.[j] ?? 60;
        engine.minDistanceMatrix[i * MAX_COLORS + j] = minDistanceMatrix[i]?.[j] ?? 5;
        engine.bondMatrix[i * MAX_COLORS + j] = bondMatrix[i]?.[j] ?? 0;
        engine.maxBonds[i * MAX_COLORS + j] = maxBonds[i]?.[j] ?? 0;
        engine.bondStrengthMatrix[i * MAX_COLORS + j] = bondStrengthMatrix[i]?.[j] ?? 0.5;
      }
      engine.idealAngle[i] = idealAngle[i] ?? 120;
      engine.angleStrength[i] = angleStrength[i] ?? 0;
    }
  }, [engine, colors.length, speed, temperature, friction, attractionMatrix, radiusMatrix, minDistanceMatrix, bondMatrix, maxBonds, bondStrengthMatrix, idealAngle, angleStrength]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', backgroundColor: '#121212', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }} className="md-flex-row">
      {/* Mobile Header */}
      <div className="md:hidden" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'rgba(18,18,20,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 20 }}>
        <button onClick={goBack} style={{ padding: '0.5rem', color: '#ababab', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '0.5rem' }}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.1em', color: '#ffffff', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity style={{ width: '1.25rem', height: '1.25rem', color: '#FF8C00' }} />
          Física de Enlaces
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ padding: '0.5rem', backgroundColor: 'rgba(45,45,48,0.5)', border: 'none', borderRadius: '0.5rem', color: '#e0e0e0', cursor: 'pointer' }}
          >
            <Settings2 style={{ width: '1.25rem', height: '1.25rem' }} />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 30,
        width: '20rem',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1e1e20',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease-in-out',
      }} className="automata-sidebar">
        {/* PC Header */}
        <div style={{ display: 'none', padding: '1.5rem', backgroundColor: 'rgba(18,18,20,0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'space-between' }} className="md-flex">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={goBack} style={{ padding: '0.5rem', color: '#ababab', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', borderRadius: '0.75rem' }}>
              <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.1em', color: '#FF8C00', textTransform: 'uppercase' }}>
                Laboratorio
              </h1>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>
                Física de Enlaces
              </h2>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <AutomataControls 
            isPlaying={isPlaying} setIsPlaying={setIsPlaying} onRestart={handleRestart} onRandomize={handleRandomize} 
            goBack={goBack}
            numParticles={numParticles} setNumParticles={setNumParticles}
            speed={speed} setSpeed={setSpeed}
            animationSpeed={animationSpeed} setAnimationSpeed={setAnimationSpeed}
            temperature={temperature} setTemperature={setTemperature}
            friction={friction} setFriction={setFriction}
            colors={colors} setColors={setColors}
            attractionMatrix={attractionMatrix} setAttractionMatrix={setAttractionMatrix}
            radiusMatrix={radiusMatrix} setRadiusMatrix={setRadiusMatrix}
            minDistanceMatrix={minDistanceMatrix} setMinDistanceMatrix={setMinDistanceMatrix}
            bondMatrix={bondMatrix} setBondMatrix={setBondMatrix}
            maxBonds={maxBonds} setMaxBonds={setMaxBonds}
            bondStrengthMatrix={bondStrengthMatrix} setBondStrengthMatrix={setBondStrengthMatrix}
            idealAngle={idealAngle} setIdealAngle={setIdealAngle}
            angleStrength={angleStrength} setAngleStrength={setAngleStrength}
          />
        </div>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 relative" ref={containerRef}>
        <AutomataCanvas engine={engine} colors={colors} isPlaying={isPlaying} animationSpeed={animationSpeed} />
        

      </div>
    </div>
  );
}


