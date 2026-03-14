import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, type FunctionDeclaration } from "@google/genai";
import { X, Send, Bot, User, Loader2 } from 'lucide-react';

interface AIChatProps {
  onClose: () => void;
  onApplyParameters: (params: any) => void;
  currentColors: string[];
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const updateSimulationParametersDeclaration: FunctionDeclaration = {
  name: "updateSimulationParameters",
  description: "Update the simulation parameters based on the user's request. Matrices must be NxN where N is the number of colors.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      colors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Hex color codes" },
      numParticles: { type: Type.NUMBER },
      speed: { type: Type.NUMBER },
      temperature: { type: Type.NUMBER },
      attractionMatrix: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } } },
      radiusMatrix: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } } },
      minDistanceMatrix: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } } },
      bondMatrix: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } } },
      maxBonds: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } } },
      bondStrengthMatrix: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } } },
      idealAngle: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "Ideal bond angle in degrees (0-360) for each color" },
      angleStrength: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "Strength of the angle constraint (0.0 to 1.0) for each color" }
    },
    required: ["colors", "attractionMatrix", "radiusMatrix", "minDistanceMatrix", "bondMatrix", "maxBonds", "bondStrengthMatrix", "idealAngle", "angleStrength"]
  }
};

const SYSTEM_PROMPT = `You are an expert in artificial life, particle physics simulations, and generative art. 
You control a particle engine by setting its parameters.
The user will ask you to create specific behaviors (e.g., "a cell", "a crystal", "a breathing organism").
You must use the 'updateSimulationParameters' tool to apply the exact numerical matrices needed to achieve this.

Parameters guide:
- colors: Array of hex colors (e.g., ["#ff0000", "#00ff00"]). The length of this array (N) defines the size of all matrices (NxN).
- attractionMatrix: -1.0 to 1.0. Positive attracts, negative repels.
- radiusMatrix: 10 to 200. Max interaction distance.
- minDistanceMatrix: 0 to 50. Distance where repulsion starts. 0 allows overlap (singularities).
- bondMatrix: 0 to 20. 0 = no bond. >0 = target bond length.
- maxBonds: 0 to 8. Max bonds between color pairs.
- bondStrengthMatrix: 0.0 to 1.0. Resistance to breaking.
- idealAngle: 0 to 360. Preferred angle between bonds for a color (e.g., 120 for hexagons, 90 for squares). Array of length N.
- angleStrength: 0.0 to 1.0. How strictly the angle is enforced. Array of length N.

Always call the tool and then provide a brief explanation of what you did.`;

export const AutomataChat: React.FC<AIChatProps> = ({ onClose, onApplyParameters }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: '¡Hola! Soy tu asistente de IA. Pídeme que cree estructuras como "una célula con núcleo", "un cristal hexagonal" o "un ecosistema depredador-presa".' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI(import.meta.env.VITE_GEMINI_API_KEY || "");
      
      const chatHistory = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
          { role: 'model', parts: [{ text: "Understood. I will use the tool to configure the simulation." }] },
          ...chatHistory,
          { role: 'user', parts: [{ text: userMsg }] }
        ],
        config: {
          tools: [{ functionDeclarations: [updateSimulationParametersDeclaration] }],
          temperature: 0.7,
        }
      });

      let modelText = response.text || '';

      if (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        if (call.name === 'updateSimulationParameters' && call.args) {
          onApplyParameters(call.args);
          if (!modelText) {
            modelText = "He aplicado los nuevos parámetros a la simulación. ¡Observa los resultados!";
          }
        }
      }

      setMessages(prev => [...prev, { role: 'model', text: modelText }]);

    } catch (error) {
      console.error("Error calling Gemini:", error);
      setMessages(prev => [...prev, { role: 'model', text: 'Hubo un error al procesar tu solicitud. Asegúrate de que la API Key esté configurada correctamente.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
        <h2 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Asistente IA
        </h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`p-3 rounded-xl max-w-[80%] text-sm leading-relaxed ${msg.role === 'user' ? 'bg-emerald-500/10 text-emerald-100 rounded-tr-none' : 'bg-slate-800 text-slate-300 rounded-tl-none'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-xl bg-slate-800 text-slate-300 rounded-tl-none flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs text-slate-400">Pensando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pide una estructura..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
