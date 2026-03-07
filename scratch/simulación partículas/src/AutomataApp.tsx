import { useState, useEffect, useRef, useCallback } from 'react';
import { AutomataEngine, MAX_COLORS } from './models/AutomataEngine';
import { AutomataCanvas } from './components/Automata/AutomataCanvas';
import { AutomataControls } from './components/Automata/AutomataControls';
import { AutomataChat } from './components/Automata/AutomataChat';
import { Activity, Settings2, MessageSquareText, ArrowLeft } from 'lucide-react';

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
  
  const [attractionMatrix, setAttractionMatrix] = useState<number[][]>(() => {
    const mat = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0));
    mat[0][0] = 0.5; mat[0][1] = -0.2; mat[0][2] = 0.3; mat[0][3] = 0.1;
    mat[1][0] = 0.2; mat[1][1] = 0.6; mat[1][2] = -0.1; mat[1][3] = 0.2;
    mat[2][0] = -0.3; mat[2][1] = 0.2; mat[2][2] = 0.4; mat[2][3] = -0.2;
    mat[3][0] = 0.1; mat[3][1] = -0.2; mat[3][2] = 0.3; mat[3][3] = 0.5;
    return mat;
  });

  const [radiusMatrix, setRadiusMatrix] = useState<number[][]>(() => {
    return Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(60));
  });

  const [minDistanceMatrix, setMinDistanceMatrix] = useState<number[][]>(() => {
    return Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(5));
  });
  
  const [bondMatrix, setBondMatrix] = useState<number[][]>(() => 
    Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0))
  );
  
  const [maxBonds, setMaxBonds] = useState<number[][]>(() => {
    const arr = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0));
    arr[0][0] = 2; arr[1][1] = 2; arr[2][2] = 2; arr[3][3] = 2;
    return arr;
  });

  const [bondStrengthMatrix, setBondStrengthMatrix] = useState<number[][]>(() => {
    return Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0.5));
  });

  const [idealAngle, setIdealAngle] = useState<number[]>(() => Array(MAX_COLORS).fill(120));
  const [angleStrength, setAngleStrength] = useState<number[]>(() => Array(MAX_COLORS).fill(0));

  // Advanced Features
  const [enableMetabolism, setEnableMetabolism] = useState(false);
  const [enableMutation, setEnableMutation] = useState(false);
  const [enableStigmergy, setEnableStigmergy] = useState(false);
  const [enableTransmutation, setEnableTransmutation] = useState(false);
  const [enableChirality, setEnableChirality] = useState(false);

  const [pheromoneAttractionMatrix, setPheromoneAttractionMatrix] = useState<number[][]>(() => Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0)));
  const [transmutationMatrix, setTransmutationMatrix] = useState<number[][]>(() => Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(-1)));
  const [chiralityMatrix, setChiralityMatrix] = useState<number[][]>(() => Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0)));

  const containerRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleRestart = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const newEngine = new AutomataEngine(clientWidth, clientHeight, numParticles, colors.length);
    setEngine(newEngine);
  }, [numParticles, colors.length]);

  const handleRandomize = useCallback(() => {
    const newNumColors = Math.floor(Math.random() * 4) + 3; // 3 to 6
    const newColors = Array.from({length: newNumColors}, () => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`);
    setColors(newColors);
    setNumParticles(Math.floor(Math.random() * 9) * 500 + 1000);
    setSpeed(parseFloat((Math.random() * 2.9 + 0.1).toFixed(1)));
    setTemperature(parseFloat((Math.random() * 2.0).toFixed(1)));
    setAnimationSpeed(Math.floor(Math.random() * 4) + 1);

    const newAttraction = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0));
    const newRadius = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0));
    const newMinDist = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0));
    const newBond = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0));
    const newMaxBonds = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0));
    const newBondStrength = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0));
    const newIdealAngle = Array(MAX_COLORS).fill(0);
    const newAngleStrength = Array(MAX_COLORS).fill(0);
    
    const newPheromone = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0));
    const newTransmutation = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(-1));
    const newChirality = Array(MAX_COLORS).fill(0).map(() => Array(MAX_COLORS).fill(0));

    for (let i = 0; i < MAX_COLORS; i++) {
      newIdealAngle[i] = Math.floor(Math.random() * 360);
      newAngleStrength[i] = Math.random() > 0.5 ? Math.random() : 0;
      
      for (let j = 0; j < MAX_COLORS; j++) {
        newAttraction[i][j] = (Math.random() * 2 - 1); // -1 to 1
        
        if (i <= j) {
          const r = Math.floor(Math.random() * 150) + 10;
          const md = Math.floor(Math.random() * 30);
          const b = Math.random() > 0.5 ? Math.floor(Math.random() * 15) + 2 : 0;
          const mb = Math.floor(Math.random() * 4);
          const bs = Math.random();

          newRadius[i][j] = r;
          newRadius[j][i] = r;
          
          newMinDist[i][j] = md;
          newMinDist[j][i] = md;
          
          newBond[i][j] = b;
          newBond[j][i] = b;
          
          newMaxBonds[i][j] = mb;
          newMaxBonds[j][i] = mb;

          newBondStrength[i][j] = bs;
          newBondStrength[j][i] = bs;
          
          newPheromone[i][j] = (Math.random() * 2 - 1);
          newTransmutation[i][j] = Math.random() > 0.8 ? Math.floor(Math.random() * newNumColors) : -1;
          newChirality[i][j] = (Math.random() * 2 - 1);
          newChirality[j][i] = -newChirality[i][j]; // Anti-symmetric
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
    setPheromoneAttractionMatrix(newPheromone);
    setTransmutationMatrix(newTransmutation);
    setChiralityMatrix(newChirality);
  }, []);

  const handleApplyParameters = useCallback((params: any) => {
    if (params.colors) setColors(params.colors);
    if (params.numParticles) setNumParticles(params.numParticles);
    if (params.speed) setSpeed(params.speed);
    if (params.temperature) setTemperature(params.temperature);
    if (params.attractionMatrix) setAttractionMatrix(params.attractionMatrix);
    if (params.radiusMatrix) setRadiusMatrix(params.radiusMatrix);
    if (params.minDistanceMatrix) setMinDistanceMatrix(params.minDistanceMatrix);
    if (params.bondMatrix) setBondMatrix(params.bondMatrix);
    if (params.maxBonds) setMaxBonds(params.maxBonds);
    if (params.bondStrengthMatrix) setBondStrengthMatrix(params.bondStrengthMatrix);
    if (params.idealAngle) setIdealAngle(params.idealAngle);
    if (params.angleStrength) setAngleStrength(params.angleStrength);
    
    if (params.enableMetabolism !== undefined) setEnableMetabolism(params.enableMetabolism);
    if (params.enableMutation !== undefined) setEnableMutation(params.enableMutation);
    if (params.enableStigmergy !== undefined) setEnableStigmergy(params.enableStigmergy);
    if (params.enableTransmutation !== undefined) setEnableTransmutation(params.enableTransmutation);
    if (params.enableChirality !== undefined) setEnableChirality(params.enableChirality);
    if (params.pheromoneAttractionMatrix) setPheromoneAttractionMatrix(params.pheromoneAttractionMatrix);
    if (params.transmutationMatrix) setTransmutationMatrix(params.transmutationMatrix);
    if (params.chiralityMatrix) setChiralityMatrix(params.chiralityMatrix);
  }, []);

  useEffect(() => {
    handleRestart();
  }, [handleRestart]);

  useEffect(() => {
    if (!engine) return;
    engine.setColors(colors.length);
    engine.speed = speed;
    engine.temperature = temperature;
    
    engine.enableMetabolism = enableMetabolism;
    engine.enableMutation = enableMutation;
    engine.enableStigmergy = enableStigmergy;
    engine.enableTransmutation = enableTransmutation;
    engine.enableChirality = enableChirality;
    
    for (let i = 0; i < MAX_COLORS; i++) {
      for (let j = 0; j < MAX_COLORS; j++) {
        engine.attractionMatrix[i * MAX_COLORS + j] = attractionMatrix[i]?.[j] || 0;
        engine.radiusMatrix[i * MAX_COLORS + j] = radiusMatrix[i]?.[j] || 60;
        engine.minDistanceMatrix[i * MAX_COLORS + j] = minDistanceMatrix[i]?.[j] ?? 5;
        engine.bondMatrix[i * MAX_COLORS + j] = bondMatrix[i]?.[j] || 0;
        engine.maxBonds[i * MAX_COLORS + j] = maxBonds[i]?.[j] || 0;
        engine.bondStrengthMatrix[i * MAX_COLORS + j] = bondStrengthMatrix[i]?.[j] ?? 0.5;
        
        engine.pheromoneAttractionMatrix[i * MAX_COLORS + j] = pheromoneAttractionMatrix[i]?.[j] || 0;
        engine.transmutationMatrix[i * MAX_COLORS + j] = transmutationMatrix[i]?.[j] ?? -1;
        engine.chiralityMatrix[i * MAX_COLORS + j] = chiralityMatrix[i]?.[j] || 0;
      }
      engine.idealAngle[i] = idealAngle[i] ?? 120;
      engine.angleStrength[i] = angleStrength[i] ?? 0;
    }
  }, [engine, colors.length, speed, temperature, attractionMatrix, radiusMatrix, minDistanceMatrix, bondMatrix, maxBonds, bondStrengthMatrix, idealAngle, angleStrength, enableMetabolism, enableMutation, enableStigmergy, enableTransmutation, enableChirality, pheromoneAttractionMatrix, transmutationMatrix, chiralityMatrix]);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-950 overflow-hidden font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 z-20">
        <button onClick={goBack} className="p-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold tracking-tight text-white uppercase flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          Física de Enlaces
        </h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="p-2 bg-slate-800 rounded text-purple-400"
          >
            <MessageSquareText className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-slate-800 rounded text-slate-300"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        w-80 md:w-80 h-full flex flex-col
      `}>
        <div className="hidden md:flex p-4 bg-slate-950 border-b border-slate-800 items-center gap-4">
          <button onClick={goBack} className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg bg-slate-800">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold tracking-tight text-white uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Física de Enlaces
          </h1>
        </div>
        <div className="flex-1 overflow-hidden">
          <AutomataControls 
            isPlaying={isPlaying} setIsPlaying={setIsPlaying} onRestart={handleRestart} onRandomize={handleRandomize}
            numParticles={numParticles} setNumParticles={setNumParticles}
            speed={speed} setSpeed={setSpeed}
            animationSpeed={animationSpeed} setAnimationSpeed={setAnimationSpeed}
            temperature={temperature} setTemperature={setTemperature}
            colors={colors} setColors={setColors}
            attractionMatrix={attractionMatrix} setAttractionMatrix={setAttractionMatrix}
            radiusMatrix={radiusMatrix} setRadiusMatrix={setRadiusMatrix}
            minDistanceMatrix={minDistanceMatrix} setMinDistanceMatrix={setMinDistanceMatrix}
            bondMatrix={bondMatrix} setBondMatrix={setBondMatrix}
            maxBonds={maxBonds} setMaxBonds={setMaxBonds}
            bondStrengthMatrix={bondStrengthMatrix} setBondStrengthMatrix={setBondStrengthMatrix}
            idealAngle={idealAngle} setIdealAngle={setIdealAngle}
            angleStrength={angleStrength} setAngleStrength={setAngleStrength}
            enableMetabolism={enableMetabolism} setEnableMetabolism={setEnableMetabolism}
            enableMutation={enableMutation} setEnableMutation={setEnableMutation}
            enableStigmergy={enableStigmergy} setEnableStigmergy={setEnableStigmergy}
            enableTransmutation={enableTransmutation} setEnableTransmutation={setEnableTransmutation}
            enableChirality={enableChirality} setEnableChirality={setEnableChirality}
            pheromoneAttractionMatrix={pheromoneAttractionMatrix} setPheromoneAttractionMatrix={setPheromoneAttractionMatrix}
            transmutationMatrix={transmutationMatrix} setTransmutationMatrix={setTransmutationMatrix}
            chiralityMatrix={chiralityMatrix} setChiralityMatrix={setChiralityMatrix}
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
        
        {/* Floating Chat Button (Desktop) */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="hidden md:flex absolute bottom-6 right-6 p-4 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-2xl transition-all hover:scale-105 z-40 items-center justify-center"
        >
          <MessageSquareText className="w-6 h-6" />
        </button>

        {/* AI Chat Panel */}
        {isChatOpen && (
          <div className="absolute inset-y-0 right-0 w-full md:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col">
            <AutomataChat 
              onClose={() => setIsChatOpen(false)} 
              onApplyParameters={handleApplyParameters}
              currentColors={colors}
            />
          </div>
        )}
      </div>
    </div>
  );
}
