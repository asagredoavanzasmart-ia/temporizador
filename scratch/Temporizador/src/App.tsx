import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { createPortal } from 'react-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Play, Pause, Square, Plus, Minus, Wand2, Clock, AlertTriangle, ExternalLink, X, Users, UserPlus, Trash2, Activity, CheckCircle2, Trophy, Lightbulb, Target, Menu, Link as LinkIcon, FileText, Download, SkipForward, Sun, Moon, CheckSquare, Check, RotateCcw, Camera } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const supabase = createClient(
  'https://bubfhjcnbqioodyutpnh.supabase.co',
  'sb_publishable_umaFDgRaT8C0HE3rvDaTZg_pCfKyk49'
);

// --- Types ---
type Participant = { id: string; name: string; color: string; avatar: string; };
type Block = { id: string; title: string; duration: number; color: string; participantIds: string[]; points?: string; extendedTime?: number; };
type MeetingInfo = { name: string; objective: string; };
type TimeoutState = { active: boolean; used: number; timeLeft: number; };

// --- Constants ---
const TIMEOUT_DURATIONS = [5 * 60, 5 * 60, 3 * 60]; // 5m, 5m, 3m
const DEFAULT_PARTICIPANTS: Participant[] = [
  { id: 'p1', name: 'Ana', color: '#F472B6', avatar: 'https://i.pravatar.cc/150?u=ana' },
  { id: 'p2', name: 'Carlos', color: '#60A5FA', avatar: 'https://i.pravatar.cc/150?u=carlos' },
  { id: 'p3', name: 'Elena', color: '#34D399', avatar: 'https://i.pravatar.cc/150?u=elena' },
];
const DEFAULT_BLOCKS: Block[] = [
  { id: '1', title: 'Inicio y Contexto', duration: 300, color: '#9B0045', participantIds: ['p1'] },
  { id: '2', title: 'Discusión Principal', duration: 900, color: '#D40040', participantIds: ['p1', 'p2', 'p3'] },
  { id: '3', title: 'Decisiones y Cierre', duration: 600, color: '#FF5733', participantIds: [] },
];

const formatTime = (seconds: number) => {
  const sign = seconds < 0 ? '-' : '';
  const absSeconds = Math.abs(seconds);
  const m = Math.floor(absSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(absSeconds % 60).toString().padStart(2, '0');
  return `${sign}${m}:${s}`;
};

// Formatea duración en segundos a "MM min" o "HH:MM hrs" si supera 60 min
const formatDuration = (seconds: number): string => {
  const totalMins = Math.round(seconds / 60);
  if (totalMins < 60) return `${totalMins} min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} hrs`;
};

const TimeInput = ({ seconds, onSave, isDarkMode, className }: { seconds: number; onSave: (s: number) => void; isDarkMode: boolean; className?: string }) => {
  const [val, setVal] = useState(formatTime(seconds));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) setVal(formatTime(seconds));
  }, [seconds, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const parts = val.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10);
      const secs = parseInt(parts[1], 10);
      if (!isNaN(mins) && !isNaN(secs)) {
        onSave(mins * 60 + (secs > 59 ? 59 : secs));
        return;
      }
    }
    setVal(formatTime(seconds));
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => e.key === 'Enter' && handleBlur()}
        className={cn("bg-transparent border-none outline-none text-center focus:ring-0 p-0 m-0", className)}
      />
    );
  }

  return (
    <div onClick={() => setIsEditing(true)} className={cn("cursor-text transition-all hover:text-brand-orange", className)}>
      {val}
    </div>
  );
};

// --- Subcomponents ---
const Switch = ({ checked, onChange, label, isDarkMode }: { checked: boolean; onChange: () => void; label: string; isDarkMode?: boolean }) => (
  <div className="flex items-center gap-2">
    <span className={cn("text-[10px] sm:text-xs font-bold uppercase tracking-wider", !checked ? "text-brand-orange" : (isDarkMode ? "text-zinc-500" : "text-gray-400"))}>Adelante</span>
    <button onClick={onChange} className={cn("w-10 h-6 sm:w-12 sm:h-7 rounded-full transition-colors relative shadow-inner focus:outline-none", checked ? "bg-brand-orange" : (isDarkMode ? "bg-zinc-700" : "bg-gray-300"))}>
      <div className={cn("absolute top-1 left-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white shadow-sm transition-transform duration-300", checked ? "translate-x-4 sm:translate-x-5" : "translate-x-0")} />
    </button>
    <span className={cn("text-[10px] sm:text-xs font-bold uppercase tracking-wider", checked ? "text-brand-orange" : (isDarkMode ? "text-zinc-500" : "text-gray-400"))}>Regresiva</span>
  </div>
);

const SortableBlock = ({ block, totalDuration, isActive, isPast, blockProgress, onDelete, onAdjustTime, onToggleParticipant, onEdit, participants }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const baseDuration = block.duration;
  const extDuration = block.extendedTime || 0;
  const blockTotal = baseDuration + extDuration;
  const heightPercent = totalDuration > 0 ? Math.max(8, (blockTotal / totalDuration) * 100) : 0;
  const extPercent = blockTotal > 0 ? (extDuration / blockTotal) * 100 : 0;
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(block.title);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editTime, setEditTime] = useState(Math.round(baseDuration / 60).toString());
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleTitleSave = () => {
    setIsEditingTitle(false);
    if (editTitle.trim() !== block.title) onEdit(block.id, { title: editTitle.trim() || 'Bloque' });
  };

  const handleTimeSave = () => {
    setIsEditingTime(false);
    const mins = parseInt(editTime, 10);
    if (!isNaN(mins) && mins > 0) onEdit(block.id, { duration: mins * 60 });
    else setEditTime(Math.round(baseDuration / 60).toString());
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isAddParticipantOpen) setIsAddParticipantOpen(false);
      if (isConfirmingDelete) setIsConfirmingDelete(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isAddParticipantOpen, isConfirmingDelete]);

  // Pointer shared component for main view and mini-player
  const PointerTriangle = ({ className, side }: { className?: string, side: 'left' | 'right' }) => (
    <div className={cn(
      "absolute top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent drop-shadow-sm transition-transform group-hover:scale-110",
      side === 'left' ? "border-l-[10px] border-l-brand-orange -left-3" : "border-r-[10px] border-r-brand-red -right-3",
      className
    )} />
  );

  const PointerLine = ({ progress }: { progress: number }) => (
    <div 
      className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-brand-orange to-brand-red z-50 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(255,99,33,0.5)] pointer-events-none group" 
      style={{ top: `${Math.min(100, progress)}%` }}
    >
      <PointerTriangle side="left" />
      <PointerTriangle side="right" />
    </div>
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    height: `${heightPercent}%`,
    minHeight: '44px', // Altura mínima de seguridad
    backgroundColor: block.color,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 20 : (isActive ? 15 : 1),
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("relative flex flex-col justify-center px-3 sm:px-4 border-b border-black/10 group transition-all", isPast && !isDragging ? "opacity-50 grayscale-[50%]" : "", isActive && !isDragging ? "ring-2 ring-white ring-inset shadow-lg z-10" : "overflow-hidden")}>
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white animate-pulse z-20" />}
      {isActive && !isDragging && <PointerLine progress={blockProgress} />}
      {extDuration > 0 && <div className="absolute bottom-0 left-0 right-0 bg-red-500/80 z-0" style={{ height: `${extPercent}%` }} title={`Extensión: ${Math.round(extDuration/60)}m`} />}
      
      <div className="flex items-center justify-between gap-2 w-full relative z-10">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-black/10 rounded shrink-0">
            <div className="w-4 h-1 border-y-2 border-white/50" />
          </div>
          {isEditingTitle ? (
            <input
              autoFocus
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={e => e.key === 'Enter' && handleTitleSave()}
              className="flex-1 bg-white/20 text-white font-medium px-2 py-1 rounded outline-none w-full text-sm sm:text-base"
            />
          ) : (
            <div onClick={() => setIsEditingTitle(true)} className="flex-1 font-medium text-white drop-shadow-md truncate cursor-text text-sm sm:text-base py-2 hover:bg-white/10 rounded px-1">
              {block.title}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 flex-wrap shrink-0">
          {participants.filter((p: any) => block.participantIds.includes(p.id)).map((p: any) => (
            <div key={p.id} className="relative group/avatar">
              {p.avatar ? (
                <img 
                  src={p.avatar} 
                  alt={p.name} 
                  className="w-5 h-5 sm:w-6 sm:h-6 min-w-[20px] min-h-[20px] sm:min-w-[24px] sm:min-h-[24px] rounded-full border border-white/50 object-cover shadow-sm" 
                />
              ) : (
                <div 
                  className="w-5 h-5 sm:w-6 sm:h-6 min-w-[20px] min-h-[20px] sm:min-w-[24px] sm:min-h-[24px] rounded-full border border-white/50 flex items-center justify-center text-[8px] font-bold text-white uppercase shadow-sm" 
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.charAt(0)}
                </div>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleParticipant(block.id, p.id); }}
                className="absolute -top-1 -right-1 bg-brand-red text-white rounded-full p-0.5 opacity-0 group-hover/avatar:opacity-100 transition-opacity shadow-md"
                title={`Quitar a ${p.name}`}
              >
                <X size={8} />
              </button>
            </div>
          ))}

          {/* Add participant button */}
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsAddParticipantOpen(!isAddParticipantOpen); setIsConfirmingDelete(false); }}
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-dashed border-white/50 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <Plus size={12} />
            </button>
            {isAddParticipantOpen && (
              <div 
                className="absolute right-0 top-full mt-1 bg-zinc-800 rounded-lg shadow-xl p-2 flex gap-1 z-50 w-max border border-zinc-700"
                onClick={(e) => e.stopPropagation()}
              >
                {participants.filter((p:any) => !block.participantIds.includes(p.id)).map((p: any) => (
                  <button key={p.id} onClick={() => { onToggleParticipant(block.id, p.id); setIsAddParticipantOpen(false); }} className="hover:scale-110 transition-transform" title={`Agregar a ${p.name}`}>
                    {p.avatar ? (
                      <img src={p.avatar} className="w-6 h-6 rounded-full border border-zinc-600 object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-zinc-600 flex items-center justify-center text-[8px] font-bold text-white uppercase" style={{ backgroundColor: p.color }}>
                        {p.name.charAt(0)}
                      </div>
                    )}
                  </button>
                ))}
                {participants.filter((p:any) => !block.participantIds.includes(p.id)).length === 0 && <span className="text-xs text-zinc-400 font-arimo px-2">Todos asignados</span>}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center bg-black/20 rounded p-0.5 backdrop-blur-sm shrink-0">
          <button onClick={() => onAdjustTime(block.id, -1)} className="p-0.5 hover:bg-white/20 rounded text-white transition-colors" title="Restar 1 min"><Minus size={12} /></button>
          
          {isEditingTime ? (
            <input
              autoFocus
              value={editTime}
              onChange={e => setEditTime(e.target.value)}
              onBlur={handleTimeSave}
              onKeyDown={e => e.key === 'Enter' && handleTimeSave()}
              className="w-6 bg-white/20 text-white text-xs font-bold text-center rounded outline-none mx-0.5"
            />
          ) : (
            <div onClick={() => setIsEditingTime(true)} className="text-white text-xs font-bold min-w-[2.5ch] text-center cursor-text hover:bg-white/10 rounded px-0.5 mx-0.5">
              {Math.round(blockTotal / 60)}m
            </div>
          )}
          
          <button onClick={() => onAdjustTime(block.id, 1)} className="p-0.5 hover:bg-white/20 rounded text-white transition-colors" title="Sumar 1 min"><Plus size={12} /></button>
        </div>

        <div className="relative">
          {isConfirmingDelete ? (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-red-600 rounded-full px-2 py-1 shadow-lg z-50" onClick={(e) => e.stopPropagation()}>
              <span className="text-[10px] text-white font-bold whitespace-nowrap">¿Eliminar?</span>
              <button onClick={() => onDelete(block.id)} className="text-white hover:text-red-200 p-0.5"><Check size={12} /></button>
              <button onClick={() => setIsConfirmingDelete(false)} className="text-white hover:text-red-200 p-0.5"><X size={12} /></button>
            </div>
          ) : (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(true); setIsAddParticipantOpen(false); }} 
              className="opacity-0 group-hover:opacity-100 p-1 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-all shrink-0"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const BlockEditModal = ({ isOpen, onClose, block, onSave, isDarkMode }: any) => {
  const [title, setTitle] = useState('');
  const [durationMins, setDurationMins] = useState(0);
  const [points, setPoints] = useState('');

  useEffect(() => {
    if (block) {
      setTitle(block.title);
      setDurationMins(Math.round(block.duration / 60));
      setPoints(block.points || '');
    }
  }, [block]);

  if (!isOpen || !block) return null;

  const handleSave = () => {
    onSave(block.id, { title, duration: durationMins * 60, points });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className={cn("rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 border", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-white")}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={cn("text-xl font-bold", isDarkMode ? "text-zinc-100" : "text-slate-800")}>Editar Bloque</h2>
          <button onClick={onClose} className={cn("p-2 rounded-full transition-colors", isDarkMode ? "hover:bg-zinc-700 text-zinc-400" : "hover:bg-slate-100 text-slate-500")}><X size={20} /></button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className={cn("block text-xs font-bold uppercase mb-1", isDarkMode ? "text-zinc-400" : "text-slate-500")}>Título</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={cn("w-full border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-orange", isDarkMode ? "bg-zinc-900 border-zinc-700 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-800")} />
          </div>
          <div>
            <label className={cn("block text-xs font-bold uppercase mb-1", isDarkMode ? "text-zinc-400" : "text-slate-500")}>Duración (minutos)</label>
            <input type="number" value={durationMins} onChange={e => setDurationMins(Number(e.target.value))} className={cn("w-full border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-orange", isDarkMode ? "bg-zinc-900 border-zinc-700 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-800")} />
          </div>
          <div>
            <label className={cn("block text-xs font-bold uppercase mb-1", isDarkMode ? "text-zinc-400" : "text-slate-500")}>Puntos a tratar</label>
            <textarea value={points} onChange={e => setPoints(e.target.value)} rows={4} className={cn("w-full border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-orange resize-none", isDarkMode ? "bg-zinc-900 border-zinc-700 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-800")} placeholder="Escribe los puntos aquí..." />
          </div>
          <button onClick={handleSave} className="w-full py-3 bg-brand-orange text-white rounded-xl font-bold hover:bg-brand-orange/80 transition-colors">Guardar</button>
        </div>
      </div>
    </div>
  );
};

const ParticipantsModal = ({ isOpen, onClose, participants, setParticipants, isDarkMode }: any) => {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#ff851d');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAdd = (avatarData?: string) => {
    if (!newName.trim()) return;
    const newP = {
      id: `p-${Date.now()}`,
      name: newName.trim(),
      color: newColor,
      avatar: avatarData || ''
    };
    setParticipants([...participants, newP]);
    setNewName('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleAdd(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const deleteParticipant = (id: string) => setParticipants(participants.filter((p: any) => p.id !== id));

  return (
    <div className="fixed inset-0 bg-zinc-950/80 flex items-center justify-center z-[100] backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className={cn("rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border transition-all", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-100")}>
        <div className="flex justify-between items-center mb-8">
          <h2 className={cn("text-2xl font-ubuntu font-bold flex items-center gap-3", isDarkMode ? "text-white" : "text-slate-900")}><Users size={28} className="text-brand-orange"/> Participantes</h2>
          <button onClick={onClose} className={cn("p-2 rounded-full transition-all hover:rotate-90", isDarkMode ? "hover:bg-zinc-800 text-zinc-500" : "hover:bg-slate-100 text-slate-400")}><X size={24} /></button>
        </div>
        
        <div className="space-y-4 mb-8">
          <div className="flex gap-3">
            <div className="relative group shrink-0">
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-14 h-14 rounded-2xl cursor-pointer opacity-0 absolute inset-0 z-10" />
              <div onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-2xl border-2 border-dashed border-zinc-500 flex items-center justify-center transition-all group-hover:border-brand-orange overflow-hidden relative" style={{ backgroundColor: newColor }}>
                <Plus size={20} className="text-white/50" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera size={16} className="text-white" />
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <input 
                value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Nombre del participante..."
                className={cn("w-full border rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-brand-orange text-lg font-medium transition-all", isDarkMode ? "bg-zinc-800 border-zinc-700 text-white placeholder-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")}
              />
              <button 
                onClick={() => handleAdd()} 
                disabled={!newName.trim()} 
                className="w-full bg-brand-orange text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all disabled:opacity-50 shadow-lg shadow-brand-orange/20"
              >
                <UserPlus size={18}/> Agregar
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          </div>
        </div>

        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {participants.map((p: any) => (
            <div key={p.id} className={cn("flex items-center justify-between p-4 rounded-2xl border group transition-all animate-in slide-in-from-bottom-2", isDarkMode ? "bg-zinc-800/50 border-zinc-800 hover:bg-zinc-800" : "bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md")}>
              <div className="flex items-center gap-4">
                {p.avatar ? (
                  <img src={p.avatar} alt={p.name} className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white font-bold text-xl uppercase" style={{ backgroundColor: p.color }}>
                    {p.name.charAt(0)}
                  </div>
                )}
                <span className={cn("font-bold text-lg", isDarkMode ? "text-zinc-200" : "text-slate-700")}>{p.name}</span>
              </div>
              <button onClick={() => deleteParticipant(p.id)} className={cn("p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100", isDarkMode ? "text-red-400 hover:bg-red-400/10" : "text-red-500 hover:bg-red-50")}><Trash2 size={20}/></button>
            </div>
          ))}
          {participants.length === 0 && <p className={cn("text-center py-6 font-medium italic", isDarkMode ? "text-zinc-600" : "text-slate-400")}>Comienza agregando a alguien...</p>}
        </div>
      </div>
    </div>
  );
};

const EndMeetingModal = ({ onClose, meetingInfo, elapsedGlobal, targetDuration, blocks, isDarkMode }: any) => {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const isUnderTime = elapsedGlobal < targetDuration;
  const isWithinMargin = elapsedGlobal <= targetDuration * 1.1;
  const score = isUnderTime ? 100 : (isWithinMargin ? 80 : 50);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!process.env.GEMINI_API_KEY) {
        setRecommendations(["Configura tu API Key de Gemini para recibir recomendaciones personalizadas."]);
        setLoading(false);
        return;
      }
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `La reunión "${meetingInfo.name}" (Objetivo: "${meetingInfo.objective}") duró ${Math.round(elapsedGlobal/60)} minutos de un estimado de ${Math.round(targetDuration/60)} minutos. 
        Bloques: ${blocks.map((b:any)=>b.title).join(', ')}.
        Dame 3 recomendaciones MUY CORTAS (máximo 15 palabras cada una) para mejorar la productividad de futuras reuniones similares. 
        Devuelve SOLO un array JSON de strings. Ejemplo: ["Recomendación 1", "Recomendación 2", "Recomendación 3"]`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-preview',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        
        let text = response.text?.trim() || '[]';
        if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        else if (text.startsWith('```')) text = text.replace(/```/g, '').trim();
        
        setRecommendations(JSON.parse(text));
      } catch (e) {
        setRecommendations(["Mantén un orden estricto de la agenda.", "Asigna tiempos realistas a cada tema.", "Evita distracciones durante la reunión."]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, []);

  return (
    <div className="fixed inset-0 bg-zinc-900/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className={cn("rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 flex flex-col items-center text-center border", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-white")}>
        <div className="w-20 h-20 rounded-full bg-brand-orange/10 flex items-center justify-center mb-4">
          {score === 100 ? <Trophy size={40} className="text-yellow-500" /> : (score === 80 ? <CheckCircle2 size={40} className="text-emerald-500" /> : <AlertTriangle size={40} className="text-orange-500" />)}
        </div>
        
        <h2 className={cn("text-2xl font-bold mb-2", isDarkMode ? "text-zinc-100" : "text-slate-800")}>Reunión Finalizada</h2>
        
        <div className={cn("rounded-2xl p-4 w-full mb-6 border", isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-slate-50 border-slate-100")}>
          <div className="flex justify-between items-center mb-2">
            <span className={cn("font-medium", isDarkMode ? "text-zinc-400" : "text-slate-500")}>Tiempo Utilizado:</span>
            <span className={cn("font-bold text-lg", isUnderTime ? "text-emerald-500" : (isWithinMargin ? "text-brand-orange" : "text-red-500"))}>
              {formatTime(elapsedGlobal)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={cn("font-medium", isDarkMode ? "text-zinc-400" : "text-slate-500")}>Tiempo Estimado:</span>
            <span className={cn("font-bold text-lg", isDarkMode ? "text-zinc-300" : "text-slate-700")}>{formatTime(targetDuration)}</span>
          </div>
        </div>

        <div className="mb-6 w-full text-left">
          <h3 className={cn("font-bold flex items-center gap-2 mb-3", isDarkMode ? "text-zinc-100" : "text-slate-800")}><Lightbulb size={18} className="text-amber-500"/> Recomendaciones IA</h3>
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className={cn("h-4 rounded w-full", isDarkMode ? "bg-zinc-700" : "bg-slate-200")}></div>
              <div className={cn("h-4 rounded w-5/6", isDarkMode ? "bg-zinc-700" : "bg-slate-200")}></div>
              <div className={cn("h-4 rounded w-4/6", isDarkMode ? "bg-zinc-700" : "bg-slate-200")}></div>
            </div>
          ) : (
            <ul className="space-y-2">
              {recommendations.map((rec, i) => (
                <li key={i} className={cn("text-sm p-3 rounded-xl border flex gap-2", isDarkMode ? "bg-amber-900/20 border-amber-900/50 text-amber-200/80" : "bg-amber-50/50 border-amber-100 text-slate-600")}>
                  <span className="text-amber-500 font-bold">•</span> {rec}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button 
          onClick={async () => {
            try {
              await supabase.from('meetings').insert([{
                name: meetingInfo.name,
                objective: meetingInfo.objective,
                duration_seconds: targetDuration,
                elapsed_seconds: elapsedGlobal,
                blocks: blocks,
                participants: participants,
                is_dark_mode: isDarkMode
              }]);
            } catch (e) {
              console.error("Error saving to Supabase:", e);
            }
            onClose();
          }} 
          className="w-full py-3.5 bg-brand-orange text-white rounded-xl font-bold hover:bg-brand-orange/80 transition-colors shadow-lg shadow-brand-orange/20"
        >
          Cerrar y Guardar
        </button>
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo>(() => {
    const saved = localStorage.getItem('agenda_info');
    return saved ? JSON.parse(saved) : { name: 'Reunión Estratégica', objective: 'Alinear objetivos y definir próximos pasos.' };
  });
  const [blocks, setBlocks] = useState<Block[]>(() => {
    const saved = localStorage.getItem('agenda_blocks');
    return saved ? JSON.parse(saved) : DEFAULT_BLOCKS;
  });
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const saved = localStorage.getItem('agenda_participants');
    return saved ? JSON.parse(saved) : DEFAULT_PARTICIPANTS;
  });

  const [isRunning, setIsRunning] = useState(false);
  const [elapsedGlobal, setElapsedGlobal] = useState(0);
  const [savedTime, setSavedTime] = useState(0);
  
  // Individual Clock Modes
  const [globalCountDown, setGlobalCountDown] = useState(false);
  const [blockCountDown, setBlockCountDown] = useState(true);
  
  const [checklist, setChecklist] = useState<{ id: string; text: string; completed: boolean }[]>(() => {
    const saved = localStorage.getItem('agenda_checklist');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Timeout State
  const [timeoutState, setTimeoutState] = useState<TimeoutState>({ active: false, used: 0, timeLeft: 5 * 60 });
  
  // Modals
  const [showEndModal, setShowEndModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [isImproving, setIsImproving] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('agenda_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(false);
  const [isBigTimer, setIsBigTimer] = useState(false);
  const [bigTimerMode, setBigTimerMode] = useState<'stopwatch' | 'countdown'>('stopwatch');
  const [bigTimerSeconds, setBigTimerSeconds] = useState(0);
  const [bigTimerTarget, setBigTimerTarget] = useState(300); // Default 5 mins
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockEnabled(true);
        console.log('Wake Lock is active');
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setWakeLockEnabled(false);
      console.log('Wake Lock is released');
    }
  };

  useEffect(() => {
    if (isRunning || timeoutState.active) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [isRunning, timeoutState.active]);

  const lastTickRef = useRef<number>(0);
  const pipWindowRef = useRef<any>(null);
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);
  const [transitionBanner, setTransitionBanner] = useState<{ finished: string, next: string } | null>(null);

  // Notifications
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Auto-save
  useEffect(() => { localStorage.setItem('agenda_blocks', JSON.stringify(blocks)); }, [blocks]);
  useEffect(() => { localStorage.setItem('agenda_participants', JSON.stringify(participants)); }, [participants]);
  useEffect(() => {
    localStorage.setItem('temporizador_info', JSON.stringify(meetingInfo));
  }, [meetingInfo]);

  useEffect(() => {
    const saved = localStorage.getItem('temporizador_saved_meetings');
    if (saved) setSavedMeetings(JSON.parse(saved));
  }, []);
  useEffect(() => { localStorage.setItem('agenda_dark_mode', JSON.stringify(isDarkMode)); }, [isDarkMode]);
  useEffect(() => { localStorage.setItem('agenda_checklist', JSON.stringify(checklist)); }, [checklist]);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalDuration = useMemo(() => blocks.reduce((acc, b) => acc + b.duration + (b.extendedTime || 0), 0), [blocks]);
  const isOvertime = elapsedGlobal > totalDuration;

  let activeIndex = 0;
  let activeBlockElapsed = 0;

  if (elapsedGlobal >= totalDuration && totalDuration > 0) {
    activeIndex = blocks.length - 1;
    activeBlockElapsed = elapsedGlobal - (totalDuration - (blocks[blocks.length - 1].duration + (blocks[blocks.length - 1].extendedTime || 0)));
  } else {
    let accumulated = 0;
    for (let i = 0; i < blocks.length; i++) {
      const bTotal = blocks[i].duration + (blocks[i].extendedTime || 0);
      if (elapsedGlobal < accumulated + bTotal) {
        activeIndex = i;
        activeBlockElapsed = elapsedGlobal - accumulated;
        break;
      }
      accumulated += bTotal;
    }
  }

  const prevBlockRef = useRef(activeIndex);
  const warnedBlocksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isRunning && prevBlockRef.current !== activeIndex) {
      const finishedBlock = blocks[prevBlockRef.current]?.title || 'Bloque';
      const nextBlock = blocks[activeIndex]?.title || 'Fin';
      
      playChime();
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Cambio de Bloque', { body: `Terminó: ${finishedBlock}. Iniciando: ${nextBlock}` });
      }
      
      setTransitionBanner({ finished: finishedBlock, next: nextBlock });
      setTimeout(() => setTransitionBanner(null), 5000);
      
      prevBlockRef.current = activeIndex;
    }

    // 1-minute warning
    if (isRunning && blocks[activeIndex]) {
      const bTotal = blocks[activeIndex].duration + (blocks[activeIndex].extendedTime || 0);
      const remaining = bTotal - activeBlockElapsed;
      if (remaining === 60 && !warnedBlocksRef.current.has(blocks[activeIndex].id)) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('¡Atención!', { body: `Queda 1 minuto para terminar: ${blocks[activeIndex].title}` });
        }
        warnedBlocksRef.current.add(blocks[activeIndex].id);
      }
    }
  }, [activeIndex, isRunning, blocks, activeBlockElapsed]);

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  useEffect(() => {
    let animationFrameId: number;
    const tick = (timestamp: number) => {
      if (!lastTickRef.current) lastTickRef.current = timestamp;
      const delta = timestamp - lastTickRef.current;

      if (delta >= 1000) {
        const secondsPassed = Math.floor(delta / 1000);
        
        if (isBigTimer) {
          if (bigTimerMode === 'stopwatch') {
            setBigTimerSeconds(prev => prev + secondsPassed);
          } else {
            setBigTimerSeconds(prev => {
              if (prev <= secondsPassed) {
                setIsRunning(false);
                playChime();
                return 0;
              }
              return prev - secondsPassed;
            });
          }
          lastTickRef.current = timestamp;
          animationFrameId = requestAnimationFrame(tick);
          return;
        }

        if (timeoutState.active) {
          setTimeoutState(prev => {
            if (prev.timeLeft <= secondsPassed) {
              if (savedTime > 0) {
                const timeToAdd = Math.min(savedTime, 5 * 60); // Add up to 5 mins of saved time
                setSavedTime(s => s - timeToAdd);
                return { ...prev, timeLeft: prev.timeLeft - secondsPassed + timeToAdd, used: prev.used + secondsPassed };
              } else {
                playChime();
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('Time Out Finalizado', { body: 'El tiempo de pausa se ha agotado.' });
                }
                return { ...prev, active: false, timeLeft: 0, used: prev.used + prev.timeLeft };
              }
            }
            return { ...prev, timeLeft: prev.timeLeft - secondsPassed, used: prev.used + secondsPassed };
          });
          
          setBlocks(prevBlocks => {
            const newBlocks = [...prevBlocks];
            if (newBlocks[activeIndex]) {
              newBlocks[activeIndex] = {
                ...newBlocks[activeIndex],
                extendedTime: (newBlocks[activeIndex].extendedTime || 0) + secondsPassed
              };
            }
            return newBlocks;
          });
        } else {
          setElapsedGlobal(prev => prev + secondsPassed);
        }
        lastTickRef.current = timestamp;
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    if (isRunning || timeoutState.active) {
      lastTickRef.current = performance.now();
      animationFrameId = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isRunning, timeoutState.active, activeIndex, savedTime, isBigTimer, bigTimerMode]);

  const isDraggingTimeline = useRef(false);
  const mainTimelineRef = useRef<HTMLDivElement>(null);

  const updateTimelineFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setElapsedGlobal(percentage * totalDuration);
  };

  const handleTimelinePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingTimeline.current = true;
    updateTimelineFromPointer(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleTimelinePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingTimeline.current) {
      updateTimelineFromPointer(e);
    }
  };

  const handleTimelinePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingTimeline.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleMainPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingTimeline.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (mainTimelineRef.current) {
      const rect = mainTimelineRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      setElapsedGlobal(percentage * totalDuration);
    }
  };

  const handleMainPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingTimeline.current && mainTimelineRef.current) {
      const rect = mainTimelineRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      setElapsedGlobal(percentage * totalDuration);
    }
  };

  const handleMainPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingTimeline.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handlePlayPause = () => {
    if (!isRunning && elapsedGlobal === 0) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Reunión Iniciada', { body: `Objetivo: ${meetingInfo.objective}` });
      }
    }
    setIsRunning(!isRunning);
  };

  const handleSkipNext = () => {
    if (activeIndex < blocks.length) {
      const currentBlock = blocks[activeIndex];
      const blockTotal = currentBlock.duration + (currentBlock.extendedTime || 0);
      const remaining = blockTotal - activeBlockElapsed;
      
      if (remaining > 0) {
        const newBlocks = [...blocks];
        
        let newDuration = currentBlock.duration;
        let newExtended = currentBlock.extendedTime || 0;
        
        if (newExtended >= remaining) {
          newExtended -= remaining;
        } else {
          const rem = remaining - newExtended;
          newExtended = 0;
          newDuration -= rem;
        }
        
        newBlocks[activeIndex] = { ...currentBlock, duration: newDuration, extendedTime: newExtended };
        
        setBlocks(newBlocks);
        setSavedTime(prev => prev + remaining);
      } else {
        let newElapsed = 0;
        for (let i = 0; i <= activeIndex; i++) {
          newElapsed += blocks[i].duration + (blocks[i].extendedTime || 0);
        }
        setElapsedGlobal(newElapsed);
      }
    }
  };
  
  const handleStop = () => {
    setIsRunning(false);
    setShowEndModal(true);
  };

  const handleReset = () => {
    if (isBigTimer) {
      setBigTimerSeconds(bigTimerMode === 'countdown' ? bigTimerTarget : 0);
      setIsRunning(false);
      return;
    }
    setIsRunning(false);
    setElapsedGlobal(0);
    setSavedTime(0);
    setTimeoutState({ active: false, used: 0, timeLeft: 5 * 60 });
    warnedBlocksRef.current.clear();
  };

  const handleGenerateAgenda = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-preview',
        contents: `Genera una agenda de reunión basada en este prompt: "${aiPrompt}". 
        Devuelve un JSON con un array de bloques. Cada bloque debe tener:
        - title: string (título del bloque)
        - duration: number (duración en segundos)
        - color: string (un color hexadecimal en tonos anaranjados, rojizos, morados o verdes, ej: #FF6321, #FF3D54, #8B5CF6, #10B981)
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                duration: { type: Type.NUMBER },
                color: { type: Type.STRING }
              },
              required: ["title", "duration", "color"]
            }
          }
        }
      });
      
      const newBlocks = JSON.parse(response.text || '[]');
      const formattedBlocks = newBlocks.map((b: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        title: b.title,
        duration: b.duration,
        color: b.color,
        participantIds: [],
        extendedTime: 0
      }));
      
      if (formattedBlocks.length > 0) {
        setBlocks(formattedBlocks);
        setAiPrompt('');
      }
    } catch (error) {
      console.error("Error generating agenda:", error);
      alert("Hubo un error al generar la agenda. Por favor, verifica tu API Key de Gemini.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTimeoutClick = () => {
    if (timeoutState.active) {
      // Stop timeout
      setTimeoutState(prev => ({ ...prev, active: false }));
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Time Out Detenido', { body: 'El tiempo de pausa ha sido pausado.' });
      }
    } else {
      // Start timeout
      if (timeoutState.timeLeft > 0 || savedTime > 0) {
        if (timeoutState.timeLeft <= 0 && savedTime > 0) {
          const timeToAdd = Math.min(savedTime, 5 * 60);
          setSavedTime(s => s - timeToAdd);
          setTimeoutState(prev => ({ ...prev, active: true, timeLeft: timeToAdd }));
        } else {
          setTimeoutState(prev => ({ ...prev, active: true }));
        }
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Time Out Iniciado', { body: `Tienes ${Math.round((timeoutState.timeLeft > 0 ? timeoutState.timeLeft : Math.min(savedTime, 5 * 60))/60)} minutos restantes.` });
        }
      }
    }
  };

  const adjustBlockTime = (id: string, deltaMins: number) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, duration: Math.max(60, b.duration + deltaMins * 60) } : b));
  };

  const toggleParticipant = (blockId: string, participantId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        const has = b.participantIds.includes(participantId);
        return { ...b, participantIds: has ? b.participantIds.filter(id => id !== participantId) : [...b.participantIds, participantId] };
      }
      return b;
    }));
  };

  const togglePiP = async () => {
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
      setPipContainer(null);
      return;
    }

    let pipWindow: Window | null = null;
    const width = 360;
    const height = 640;
    const left = window.screenX + (window.outerWidth - width);
    const top = window.screenY;

    pipWindow = window.open('', 'pip_window', `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`);
    
    if (!pipWindow) {
      alert('No se pudo abrir la ventana flotante. Por favor, permite las ventanas emergentes (popups) en tu navegador para esta página.');
      return;
    }

    pipWindowRef.current = pipWindow;
    
    const handleClose = () => {
      pipWindowRef.current = null;
      setPipContainer(null);
    };

    pipWindow.addEventListener('pagehide', handleClose);
    pipWindow.addEventListener('beforeunload', handleClose);

    // Clear existing body if it's a reused popup
    pipWindow.document.body.innerHTML = '';

    [...document.head.querySelectorAll('style, link[rel="stylesheet"]')].forEach((el) => {
      pipWindow!.document.head.appendChild(el.cloneNode(true));
    });

    const twScript = pipWindow.document.createElement('script');
    twScript.src = 'https://cdn.tailwindcss.com';
    pipWindow.document.head.appendChild(twScript);

    const container = pipWindow.document.createElement('div');
    container.id = 'pip-root';
    container.style.height = '100%';
    pipWindow.document.body.appendChild(container);

    // Aplicar modo dark al popup desde el inicio
    if (isDarkMode) {
      pipWindow.document.documentElement.classList.add('dark');
    }

    setPipContainer(container);
  };

  // Sincronizar dark mode al popup cuando cambia
  useEffect(() => {
    if (!pipWindowRef.current) return;
    if (isDarkMode) {
      pipWindowRef.current.document.documentElement.classList.add('dark');
    } else {
      pipWindowRef.current.document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode, pipContainer]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks((items) => arrayMove(items, items.findIndex(i => i.id === active.id), items.findIndex(i => i.id === over.id)));
    }
  };

  const improveAgenda = async () => {
    if (!process.env.GEMINI_API_KEY) return alert("Configura tu API Key de Gemini.");
    setIsImproving(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Optimiza esta agenda JSON ajustando duraciones y orden para mayor eficiencia. Mantén IDs. Devuelve SOLO un array JSON válido: ${JSON.stringify(blocks)}`;
      const response = await ai.models.generateContent({ model: 'gemini-3.1-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
      let text = response.text?.trim() || '[]';
      if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      else if (text.startsWith('```')) text = text.replace(/```/g, '').trim();
      const newBlocks = JSON.parse(text);
      if (Array.isArray(newBlocks) && newBlocks.length > 0) setBlocks(newBlocks);
    } catch (error) {
      alert("Error al mejorar la agenda.");
    } finally {
      setIsImproving(false);
    }
  };

  // Paleta oficial de colores para bloques: morado oscuro, carmesí, rojo, naranja-rojo, amarillo
  const PALETTE = ['#4A1040', '#9B0045', '#D40040', '#FF5733', '#FFBF00'];

  const addBlock = () => {
    const lastColor = blocks.length > 0 ? blocks[blocks.length - 1].color : null;
    const availableColors = PALETTE.filter(c => c !== lastColor);
    const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
    setBlocks([...blocks, { id: `b-${Date.now()}`, title: 'Nuevo Bloque', duration: 300, color: randomColor, participantIds: [] }]);
  };

  const handleSaveCurrentMeeting = () => {
    const newMeeting = {
      id: `m-${Date.now()}`,
      name: meetingInfo.name || 'Reunión sin título',
      date: new Date().toLocaleDateString(),
      blocks: [...blocks],
      participants: [...participants],
      objective: meetingInfo.objective
    };
    const updatedMeetings = [newMeeting, ...savedMeetings];
    setSavedMeetings(updatedMeetings);
    localStorage.setItem('temporizador_saved_meetings', JSON.stringify(updatedMeetings));
    alert('Reunión guardada con éxito.');
  };

  // UI States
  const [savedMeetings, setSavedMeetings] = useState<{id: string, name: string, date: string}[]>([]);
  const [resources, setResources] = useState<{id: string, title: string, url: string, type: 'link' | 'doc'}[]>([
    { id: 'r1', title: 'Presentación Principal', url: '#', type: 'doc' },
    { id: 'r2', title: 'Enlace de Meet', url: '#', type: 'link' }
  ]);

  // La base de tiempo total para el eje Y debe incluir tiempo base + todas las extensiones (timeout)
  const effectiveTotal = totalDuration + timeoutState.used;
  const pointerTop = effectiveTotal > 0 
    ? `${Math.min(100, (elapsedGlobal / effectiveTotal) * 100)}%` 
    : '0%';
  const blockProgress = blocks[activeIndex] ? (activeBlockElapsed / blocks[activeIndex].duration) * 100 : 0;

  // Datos para el gráfico circular
  const chartData = [
    { name: 'Transcurrido', value: elapsedGlobal, color: '#ff851d' }, // brand-orange
    { name: 'Restante', value: Math.max(0, totalDuration - elapsedGlobal), color: '#e6e9ef' } // bg-light
  ];

  return (
    <div className={cn(
      "min-h-[100dvh] flex flex-col font-arimo pb-20 lg:pb-0 relative overflow-x-hidden transition-colors",
      isDarkMode ? "dark bg-zinc-900 text-zinc-100" : "bg-bg-light text-brand-dark"
    )}>
      
      {/* Big Timer Mode Overlay */}
      {isBigTimer && (
        <div className={cn("fixed inset-0 z-[60] flex flex-col items-center justify-center p-6 transition-colors", isDarkMode ? "bg-zinc-900 text-white" : "bg-white text-brand-dark")}>
          <button onClick={() => setIsBigTimer(false)} className={cn("absolute top-6 left-6 p-4 rounded-full transition-colors", isDarkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-gray-100 text-gray-500")}>
            <X size={32} />
          </button>
          
          <div className="flex flex-col items-center gap-12 w-full max-w-4xl">
            <div className="flex items-center gap-4">
              <span className={cn("text-xs font-bold uppercase tracking-widest", bigTimerMode === 'stopwatch' ? "text-brand-orange" : "text-gray-400")}>Cronómetro</span>
              <button 
                onClick={() => {
                  setBigTimerMode(prev => prev === 'stopwatch' ? 'countdown' : 'stopwatch');
                  handleReset();
                }} 
                className={cn("w-14 h-8 rounded-full transition-colors relative shadow-inner", bigTimerMode === 'countdown' ? "bg-brand-orange" : (isDarkMode ? "bg-zinc-700" : "bg-gray-300"))}
              >
                <div className={cn("absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300", bigTimerMode === 'countdown' ? "translate-x-6" : "translate-x-0")} />
              </button>
              <span className={cn("text-xs font-bold uppercase tracking-widest", bigTimerMode === 'countdown' ? "text-brand-orange" : "text-gray-400")}>Cuenta Atrás</span>
            </div>

            <TimeInput 
              seconds={bigTimerSeconds}
              onSave={(s) => {
                setBigTimerSeconds(s);
                if (bigTimerMode === 'countdown') setBigTimerTarget(s);
              }}
              isDarkMode={isDarkMode}
              className={cn("text-[12rem] sm:text-[20rem] font-ubuntu font-bold tracking-tighter tabular-nums leading-none transition-all", !isRunning ? "cursor-text hover:scale-105 active:scale-95" : "pointer-events-none")}
            />

            {bigTimerMode === 'countdown' && !isRunning && (
              <div className="flex items-center gap-4 bg-black/5 rounded-2xl p-4">
                <button onClick={() => {
                  const nt = Math.max(60, bigTimerTarget - 60);
                  setBigTimerTarget(nt);
                  setBigTimerSeconds(nt);
                }} className="p-2 hover:bg-black/10 rounded-xl"><Minus /></button>
                <div className="text-2xl font-bold min-w-[3ch] text-center">{Math.round(bigTimerTarget / 60)} min</div>
                <button onClick={() => {
                  const nt = bigTimerTarget + 60;
                  setBigTimerTarget(nt);
                  setBigTimerSeconds(nt);
                }} className="p-2 hover:bg-black/10 rounded-xl"><Plus /></button>
              </div>
            )}

            <div className="flex items-center gap-8">
              <button onClick={handleReset} className={cn("p-6 rounded-full shadow-3d-hover border", isDarkMode ? "bg-zinc-800 text-zinc-100 border-zinc-700" : "bg-white text-brand-dark border-white")}>
                <RotateCcw size={40} />
              </button>
              <button onClick={handlePlayPause} className={cn("p-10 rounded-full text-white shadow-lg hover:scale-105 active:scale-95 transition-transform", isRunning ? "bg-brand-red hover:bg-red-600" : "bg-brand-orange hover:bg-orange-600")}>
                {isRunning ? <Pause size={48} /> : <Play size={48} className="ml-2" />}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Menú Lateral (Sandwich) */}
      <div className={cn("fixed inset-y-0 left-0 w-64 shadow-3d z-50 transform transition-transform duration-300 ease-in-out", isMenuOpen ? "translate-x-0" : "-translate-x-full", isDarkMode ? "bg-zinc-800 border-r border-zinc-700" : "bg-white")}>
        <div className={cn("p-4 border-b flex justify-between items-center", isDarkMode ? "border-zinc-700" : "border-gray-100")}>
          <h2 className={cn("font-ubuntu font-bold text-lg", isDarkMode ? "text-zinc-100" : "text-brand-dark")}>Mis Reuniones</h2>
          <button onClick={() => setIsMenuOpen(false)} className={cn("p-2 rounded-full transition-colors", isDarkMode ? "hover:bg-zinc-700 text-zinc-300" : "hover:bg-gray-100 text-brand-dark")}><X size={20} /></button>
        </div>
        <div className="p-4 space-y-2">
          {savedMeetings.map(m => (
            <button key={m.id} className={cn("w-full text-left p-3 rounded-xl transition-colors border group", isDarkMode ? "hover:bg-zinc-700 border-transparent hover:border-zinc-600" : "hover:bg-gray-50 border-transparent hover:border-gray-100")}>
              <div className="font-bold text-sm group-hover:text-brand-orange transition-colors">{m.name}</div>
              <div className={cn("text-xs mt-1", isDarkMode ? "text-zinc-500" : "text-gray-400")}>{m.date}</div>
            </button>
          ))}
          <button className={cn("w-full mt-4 py-2 border-2 border-dashed rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2", isDarkMode ? "border-zinc-700 text-zinc-500 hover:text-brand-orange hover:border-brand-orange" : "border-gray-200 text-gray-400 hover:text-brand-orange hover:border-brand-orange")}>
            <Plus size={16} /> Nueva Reunión
          </button>
        </div>
      </div>
      
      {/* Overlay del menú */}
      {isMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />}

      {/* Top Header: Meeting Info */}
      <header className={cn("px-4 py-4 sticky top-0 z-30 shadow-sm transition-colors", isDarkMode ? "bg-zinc-800 border-b border-zinc-700" : "bg-white")}>
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex items-center gap-4 w-full md:w-auto flex-wrap">
            <button onClick={() => setIsMenuOpen(true)} className={cn("p-2 rounded-xl transition-colors", isDarkMode ? "hover:bg-zinc-700 text-zinc-100" : "hover:bg-gray-100 text-brand-dark")}>
              <Menu size={24} />
            </button>
            <div className="flex-1 min-w-[200px]">
              <input 
                value={meetingInfo.name} 
                onChange={e => setMeetingInfo({...meetingInfo, name: e.target.value})}
                className={cn("font-ubuntu text-xl md:text-2xl font-bold w-full outline-none bg-transparent", isDarkMode ? "text-zinc-100 placeholder-zinc-500" : "text-brand-dark placeholder-gray-300")}
                placeholder="Nombre de la Reunión"
              />
              <div className="flex items-center gap-2 mt-1">
                <Target size={16} className="text-brand-orange shrink-0" />
                <input 
                  value={meetingInfo.objective} 
                  onChange={e => setMeetingInfo({...meetingInfo, objective: e.target.value})}
                  className={cn("text-sm md:text-base w-full outline-none bg-transparent", isDarkMode ? "text-zinc-400 placeholder-zinc-600" : "text-gray-500 placeholder-gray-300")}
                  placeholder="Objetivo principal..."
                />
              </div>
            </div>
            
            {/* Moved Participants & Duration to the left */}
            <div className={cn("flex items-center gap-4 p-2 md:p-3 rounded-2xl border shadow-3d-pressed w-full md:w-auto", isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-bg-light border-white")}>
              <button onClick={() => setShowParticipantsModal(true)} className="flex -space-x-2 mr-2 hover:scale-105 transition-transform cursor-pointer" title="Gestionar Participantes">
                {participants.slice(0, 4).map(p => <img key={p.id} src={p.avatar} className={cn("w-8 h-8 rounded-full border-2 shadow-sm", isDarkMode ? "border-zinc-800" : "border-white")} alt={p.name}/>)}
                {participants.length > 4 && <div className={cn("w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold", isDarkMode ? "bg-zinc-700 border-zinc-800 text-zinc-300" : "bg-gray-200 border-white text-gray-500")}>+{participants.length - 4}</div>}
                {participants.length === 0 && <div className={cn("w-8 h-8 rounded-full border-2 flex items-center justify-center", isDarkMode ? "bg-zinc-700 border-zinc-800 text-zinc-400" : "bg-gray-200 border-white text-gray-500")}><Users size={16}/></div>}
              </button>
              <div className="text-right">
                <div className={cn("text-[10px] uppercase tracking-wider font-bold", isDarkMode ? "text-zinc-500" : "text-gray-400")}>Duración Total</div>
                <div className="font-bold text-brand-orange">{Math.round(totalDuration / 60)} min</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={cn("p-3 rounded-xl transition-colors shadow-sm border", isDarkMode ? "bg-zinc-800 border-zinc-700 text-yellow-500 hover:bg-zinc-700" : "bg-white border-gray-200 text-slate-600 hover:bg-gray-50")} title="Alternar Modo Oscuro">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {wakeLockEnabled && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-widest animate-pulse" title="Previniendo que la pantalla se apague">
                <Activity size={12} /> Live
              </div>
            )}
          </div>
        </div>
      </header>

      {isOvertime && !timeoutState.active && (
        <div className="bg-brand-red text-white text-center py-1.5 text-sm font-bold animate-pulse flex items-center justify-center gap-2 shadow-md">
          <AlertTriangle size={16} /> ¡Tiempo de reunión excedido!
        </div>
      )}

      <main className="flex-1 flex flex-col lg:flex-row p-4 md:p-6 gap-6 max-w-[1600px] mx-auto w-full relative">
        
        {/* Banner de Transición */}
        {transitionBanner && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-10 fade-in duration-500 border border-zinc-700">
            <CheckCircle2 size={24} className="text-emerald-400" />
            <div>
              <p className="text-sm text-zinc-300 font-arimo">Terminó: <span className="font-bold text-white">{transitionBanner.finished}</span></p>
              <p className="text-base font-ubuntu font-bold text-brand-orange">Siguiente: {transitionBanner.next}</p>
            </div>
          </div>
        )}

        {/* Left Panel: Recursos e Info */}
        <div className="w-full lg:w-[300px] flex flex-col gap-6 shrink-0 order-2 lg:order-1">
          <div className={cn("rounded-3xl p-5 shadow-3d border", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-white")}>
            <h3 className={cn("font-ubuntu font-bold text-lg mb-4 flex items-center gap-2", isDarkMode ? "text-zinc-100" : "text-brand-dark")}>
              <LinkIcon size={18} className="text-brand-orange" /> Recursos
            </h3>
            <div className="space-y-3">
              {resources.map(res => (
                <a key={res.id} href={res.url} className={cn("flex items-center gap-3 p-3 rounded-xl transition-colors group", isDarkMode ? "bg-zinc-900 hover:bg-zinc-700" : "bg-bg-light hover:bg-gray-200")}>
                  <div className={cn("p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform", isDarkMode ? "bg-zinc-800 text-brand-orange" : "bg-white text-brand-pink")}>
                    {res.type === 'link' ? <LinkIcon size={16} /> : <FileText size={16} />}
                  </div>
                  <span className={cn("font-bold text-sm truncate", isDarkMode ? "text-zinc-300" : "text-brand-dark")}>{res.title}</span>
                </a>
              ))}
              <button className={cn("w-full py-2 border-2 border-dashed rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 mt-4", isDarkMode ? "border-zinc-700 text-zinc-500 hover:text-brand-orange hover:border-brand-orange" : "border-gray-200 text-gray-400 hover:text-brand-orange hover:border-brand-orange")}>
                <Plus size={16} /> Añadir Recurso
              </button>
            </div>
          </div>

          <div className={cn("rounded-3xl p-5 shadow-3d border", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-white")}>
            <h3 className={cn("font-ubuntu font-bold text-lg mb-4 flex items-center gap-2", isDarkMode ? "text-zinc-100" : "text-brand-dark")}>
              <CheckSquare size={18} className="text-brand-orange" /> Checklist
            </h3>
            <div className="space-y-3">
              {checklist.map((item) => (
                <div key={item.id} className={cn("group flex items-center gap-3 p-3 rounded-xl transition-colors", isDarkMode ? "bg-zinc-900 hover:bg-zinc-700" : "bg-bg-light hover:bg-gray-200")}>
                  <input 
                    type="checkbox" 
                    checked={item.completed}
                    onChange={() => setChecklist(checklist.map(c => c.id === item.id ? { ...c, completed: !c.completed } : c))}
                    className={cn("w-5 h-5 rounded text-brand-orange focus:ring-brand-orange cursor-pointer", isDarkMode ? "border-zinc-600 bg-zinc-800" : "border-gray-300 bg-white")} 
                  />
                  <input
                    value={item.text}
                    onChange={(e) => setChecklist(checklist.map(c => c.id === item.id ? { ...c, text: e.target.value } : c))}
                    className={cn("flex-1 bg-transparent border-none outline-none font-bold text-sm", item.completed ? "line-through opacity-50" : "", isDarkMode ? "text-zinc-300" : "text-brand-dark")}
                  />
                  <button onClick={() => setChecklist(checklist.filter(c => c.id !== item.id))} className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-500/10 rounded transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => setChecklist([...checklist, { id: Date.now().toString(), text: '', completed: false }])}
                className={cn("w-full py-2 border-2 border-dashed rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 mt-4", isDarkMode ? "border-zinc-700 text-zinc-500 hover:text-brand-orange hover:border-brand-orange" : "border-gray-200 text-gray-400 hover:text-brand-orange hover:border-brand-orange")}
              >
                <Plus size={16} /> Añadir Tarea
              </button>
            </div>
          </div>

          <div className={cn("rounded-3xl p-5 shadow-3d border", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-white")}>
            <h3 className={cn("font-ubuntu font-bold text-lg mb-4 flex items-center gap-2", isDarkMode ? "text-zinc-100" : "text-brand-dark")}>
              <Wand2 size={18} className="text-brand-orange" /> Generar con IA
            </h3>
            <div className="space-y-3">
              <textarea 
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Ej: Crea una reunión de 30 min para revisar el diseño de la nueva app..."
                className={cn("w-full p-3 rounded-xl text-sm outline-none resize-none h-24", isDarkMode ? "bg-zinc-900 text-zinc-300 placeholder-zinc-600 focus:ring-1 focus:ring-brand-orange" : "bg-bg-light text-brand-dark placeholder-gray-400 focus:ring-1 focus:ring-brand-orange")}
              />
              <button 
                onClick={handleGenerateAgenda}
                disabled={isGenerating || !aiPrompt.trim()}
                className="w-full py-2 bg-brand-orange text-white rounded-xl text-sm font-bold hover:bg-brand-orange/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? <Activity size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {isGenerating ? 'Generando...' : 'Generar Agenda'}
              </button>
            </div>
          </div>
        </div>

        {/* Center Panel: Clocks & Controls */}
        <div className="flex-1 flex flex-col items-center justify-start gap-8 py-2 order-1 lg:order-2">
          
          {/* Reloj Circular 3D */}
          <div className={cn("relative w-full max-w-[400px] aspect-square flex items-center justify-center transition-opacity", timeoutState.active ? "opacity-30 pointer-events-none" : "")}>
            {/* Gráfico Circular de fondo (Reloj Global) */}
            <div className="absolute inset-0 drop-shadow-xl">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="80%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={10}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Contenido Central (Reloj de Bloque) */}
            <div className={cn("absolute inset-4 rounded-full shadow-3d-pressed flex flex-col items-center justify-center p-6 border-4", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-white")}>
              <h2 className={cn("font-ubuntu uppercase tracking-widest text-sm sm:text-base font-bold text-center mb-2 line-clamp-2", isDarkMode ? "text-zinc-100" : "text-brand-dark")}>
                {blocks[activeIndex]?.title || 'Fin'}
              </h2>
              
              <div className={cn("text-5xl sm:text-7xl font-ubuntu font-bold tracking-tighter tabular-nums leading-none drop-shadow-sm mb-2", isDarkMode ? "text-zinc-100" : "text-brand-dark")}>
                {formatTime(blockCountDown ? (((blocks[activeIndex]?.duration || 0) + (blocks[activeIndex]?.extendedTime || 0)) - activeBlockElapsed) : activeBlockElapsed)}
              </div>
              
              <div className="flex items-center gap-2">
                <Switch checked={blockCountDown} onChange={() => setBlockCountDown(!blockCountDown)} label="" isDarkMode={isDarkMode} />
              </div>
            </div>
          </div>

          {/* Reloj Global (Secundario, más pequeño) */}
          <div className={cn("flex flex-col items-center px-6 py-3 rounded-2xl shadow-3d border", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-white")}>
            <div className="flex items-center gap-4 mb-1">
              <span className={cn("uppercase tracking-[0.2em] text-[10px] font-bold", isDarkMode ? "text-zinc-500" : "text-gray-400")}>Reloj Global</span>
              <Switch checked={globalCountDown} onChange={() => setGlobalCountDown(!globalCountDown)} label="" isDarkMode={isDarkMode} />
            </div>
            <div className={cn("text-3xl font-ubuntu font-bold tracking-tighter tabular-nums leading-none drop-shadow-sm", isOvertime ? "text-brand-red" : "text-brand-orange")}>
              {formatTime(globalCountDown ? (totalDuration - elapsedGlobal) : elapsedGlobal)}
            </div>
          </div>

          {/* Timeout Button (Redesigned) */}
          <button 
            onClick={handleTimeoutClick} 
            disabled={(timeoutState.timeLeft <= 0 && savedTime <= 0 && !timeoutState.active)}
            className={cn(
              "w-full max-w-[400px] p-1 rounded-2xl flex items-center transition-all shadow-3d relative overflow-hidden border group",
              timeoutState.active ? (isDarkMode ? "bg-zinc-800 border-brand-red" : "bg-white border-brand-red") : 
              (timeoutState.timeLeft <= 0 && savedTime <= 0 ? (isDarkMode ? "bg-zinc-800 text-zinc-600 border-zinc-700 cursor-not-allowed" : "bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed") : (isDarkMode ? "bg-zinc-800 text-brand-red border-zinc-700 hover:border-brand-red" : "bg-white text-brand-red border-white hover:border-brand-red"))
            )}
          >
            {timeoutState.active && (
              <div 
                className="absolute left-0 top-0 bottom-0 bg-brand-red/10 transition-all duration-1000" 
                style={{ width: `${(timeoutState.timeLeft / 300) * 100}%` }} 
              />
            )}
            <div className={cn("p-3 rounded-xl m-1 transition-colors flex items-center justify-center shrink-0", timeoutState.active ? "bg-brand-red text-white" : "bg-brand-red/10 text-brand-red group-hover:bg-brand-red group-hover:text-white")}>
              <AlertTriangle size={24} className={timeoutState.active ? "animate-pulse" : ""} />
            </div>
            <div className="flex-1 flex items-center justify-between px-4">
              <span className={cn("font-bold text-sm tracking-tight uppercase", isDarkMode && !timeoutState.active ? "text-zinc-400" : "")}>
                {timeoutState.active ? 'Time Out Activo' : 'Solicitar Time Out'}
              </span>
              <span className={cn("font-ubuntu font-bold text-xl tabular-nums", timeoutState.active ? "text-brand-red" : (isDarkMode ? "text-zinc-300" : "text-brand-dark"))}>
                {formatTime(timeoutState.used)}
              </span>
            </div>
          </button>

          {/* Main Controls */}
          <div className="flex items-center gap-4 sm:gap-6 mt-4 flex-wrap justify-center">
            <button onClick={() => setIsBigTimer(true)} className={cn("p-4 rounded-full shadow-3d-hover border transition-all", isDarkMode ? "bg-zinc-800 text-brand-orange border-zinc-700" : "bg-white text-brand-orange border-white")} title="Modo Pantalla Completa">
              <Clock size={24} />
            </button>
            <button onClick={handleReset} className={cn("p-4 rounded-full shadow-3d-hover border transition-all", isDarkMode ? "bg-zinc-800 text-zinc-100 border-zinc-700" : "bg-white text-brand-dark border-white")} title="Reiniciar">
              <RotateCcw size={24} />
            </button>
            <button onClick={handlePlayPause} className={cn("p-6 sm:p-8 rounded-full text-white shadow-lg hover:scale-105 active:scale-95 transition-transform", isRunning ? "bg-brand-red hover:bg-red-600" : "bg-brand-orange hover:bg-orange-600")} title={isRunning ? "Pausar" : "Iniciar"}>
              {isRunning ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
            </button>
            <button onClick={handleSkipNext} className={cn("p-4 rounded-full shadow-3d-hover border transition-all", isDarkMode ? "bg-zinc-800 text-zinc-100 border-zinc-700" : "bg-white text-brand-dark border-white")} title="Siguiente Etapa">
              <SkipForward size={24} />
            </button>
            <button onClick={handleStop} className={cn("p-4 rounded-full shadow-3d-hover border transition-all", isDarkMode ? "bg-zinc-800 text-zinc-100 border-zinc-700" : "bg-white text-brand-dark border-white")} title="Finalizar Reunión">
              <Square size={24} />
            </button>
            <button onClick={togglePiP} className={cn("p-4 rounded-full shadow-3d-hover border transition-all", isDarkMode ? "bg-zinc-800 text-zinc-100 border-zinc-700" : "bg-white text-brand-dark border-white")} title="Mini Reproductor (Popup)">
              <ExternalLink size={24} />
            </button>
          </div>
        </div>

        {/* Right Panel: Timeline */}
        <div className={cn("w-full lg:w-[480px] flex flex-col rounded-3xl shadow-3d border overflow-hidden h-[500px] lg:h-[750px] shrink-0 order-3", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-white")}>
          <div className={cn("p-4 sm:p-5 border-b flex justify-between items-center", isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-slate-50 border-slate-100")}>
            <div>
              <h3 className={cn("font-bold text-base sm:text-lg", isDarkMode ? "text-zinc-100" : "text-slate-800")}>Agenda Interactiva</h3>
              <p className={cn("text-[10px] sm:text-xs font-medium mt-0.5", isDarkMode ? "text-zinc-500" : "text-slate-500")}>Arrastra para reordenar • Usa +/- para tiempo</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleSaveCurrentMeeting} 
                className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border", isDarkMode ? "bg-zinc-800 text-brand-orange border-brand-orange/30 hover:bg-brand-orange/10" : "bg-white text-brand-orange border-brand-orange/30 hover:bg-brand-orange/5")}
                title="Guardar esta reunión"
              >
                <Download size={14} /> <span>Guardar</span>
              </button>
              <button onClick={addBlock} className="p-2 sm:p-2.5 rounded-xl bg-brand-orange text-white hover:bg-brand-orange/80 transition-colors shadow-md shadow-brand-orange/20" title="Agregar Bloque">
                <Plus size={18} />
              </button>
            </div>
          </div>
          
          <div className={cn("flex-1 relative p-3 sm:p-5 overflow-y-auto custom-scrollbar", isDarkMode ? "bg-zinc-900/50" : "bg-slate-50/50")}>
            <div ref={mainTimelineRef} className={cn("relative min-h-full w-full rounded-2xl flex flex-col shadow-inner border", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-slate-100 border-slate-200")}>
              <DndContext sensors={useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks} strategy={verticalListSortingStrategy}>
                  {blocks.map((block, index) => (
                    <SortableBlock 
                      key={block.id} block={block} totalDuration={totalDuration} 
                      isActive={index === activeIndex && !timeoutState.active} isPast={index < activeIndex} blockProgress={blockProgress}
                      onDelete={(id:string) => setBlocks(blocks.filter(b => b.id !== id))} onAdjustTime={adjustBlockTime} onToggleParticipant={toggleParticipant} onEdit={(id: string, data: any) => setBlocks(blocks.map(b => b.id === id ? { ...b, ...data } : b))} participants={participants}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              
              {/* Total Sum */}
              <div className={cn("mt-auto pt-4 border-t-4 border-dashed flex justify-between items-center px-4 pb-4 backdrop-blur-sm z-10", isDarkMode ? "border-zinc-700 bg-zinc-800/80" : "border-slate-300 bg-slate-100/80")}>
                <span className={cn("font-ubuntu font-bold uppercase tracking-wider text-lg", isDarkMode ? "text-zinc-400" : "text-slate-600")}>Tiempo Total</span>
                <span className="font-ubuntu font-bold text-3xl text-brand-orange">
                  {Math.floor(totalDuration / 3600).toString().padStart(2, '0')}:
                  {Math.floor((totalDuration % 3600) / 60).toString().padStart(2, '0')} hrs
                </span>
              </div>
              
              {/* Red Line for Timeout (Fixed position) - Now handled globally at the container but offset logic might be needed */}
              {/* Note: In a localized active block paradigm, the timeout red line should be at the very bottom since timeout stops the block timer, or if we want a global trace, we can keep a static red overlay. Keeping simple global overlay for timeout trace. */}
            </div>
          </div>
        </div>
      </main>

      {showEndModal && <EndMeetingModal onClose={() => {setShowEndModal(false); handleReset();}} meetingInfo={meetingInfo} elapsedGlobal={elapsedGlobal} targetDuration={totalDuration} blocks={blocks} isDarkMode={isDarkMode} />}
      <ParticipantsModal isOpen={showParticipantsModal} onClose={() => setShowParticipantsModal(false)} participants={participants} setParticipants={setParticipants} isDarkMode={isDarkMode} />
      <BlockEditModal isOpen={!!editingBlock} onClose={() => setEditingBlock(null)} block={editingBlock} onSave={(id: string, data: any) => setBlocks(blocks.map(b => b.id === id ? { ...b, ...data } : b))} isDarkMode={isDarkMode} />
      
      {pipContainer && createPortal(
        <div className={cn(
          "flex flex-col h-screen p-4 font-arimo overflow-hidden relative",
          isDarkMode
            ? "bg-gradient-to-b from-zinc-950 to-[#0f0f0f] text-zinc-100"
            : "bg-gradient-to-b from-slate-100 to-slate-300 text-[#1a1a1a]"
        )}>
          
          <div className={cn("absolute top-2 right-4 text-[10px] font-bold opacity-60", isDarkMode ? "text-white" : "text-black")}>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>

          {isBigTimer ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="flex items-center gap-3">
                <span className={cn("text-[8px] font-bold uppercase tracking-widest", bigTimerMode === 'stopwatch' ? "text-brand-orange" : "text-gray-400")}>Stopwatch</span>
                <button 
                  onClick={() => {
                    setBigTimerMode(prev => prev === 'stopwatch' ? 'countdown' : 'stopwatch');
                    handleReset();
                  }} 
                  className={cn("w-10 h-6 rounded-full transition-colors relative shadow-inner", bigTimerMode === 'countdown' ? "bg-brand-orange" : (isDarkMode ? "bg-zinc-700" : "bg-gray-300"))}
                >
                  <div className={cn("absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform", bigTimerMode === 'countdown' ? "translate-x-4" : "translate-x-0")} />
                </button>
                <span className={cn("text-[8px] font-bold uppercase tracking-widest", bigTimerMode === 'countdown' ? "text-brand-orange" : "text-gray-400")}>Timer</span>
                <button onClick={() => setIsBigTimer(false)} className={cn("ml-2 p-1 rounded-full hover:bg-black/10 transition-colors", isDarkMode ? "text-zinc-500" : "text-slate-400")}>
                  <X size={12} />
                </button>
              </div>
              <TimeInput 
                seconds={bigTimerSeconds}
                onSave={(s) => {
                  setBigTimerSeconds(s);
                  if (bigTimerMode === 'countdown') setBigTimerTarget(s);
                }}
                isDarkMode={isDarkMode}
                className={cn(
                  "text-[7rem] font-ubuntu font-bold tracking-tighter tabular-nums leading-none transition-all",
                  isDarkMode ? "text-zinc-100" : "text-brand-dark",
                  !isRunning ? "cursor-text" : "pointer-events-none"
                )}
              />
              {!isRunning && bigTimerMode === 'countdown' && (
                <div className="flex items-center gap-3 bg-black/5 rounded-xl p-2 scale-75">
                  <button onClick={() => {
                    const nt = Math.max(60, bigTimerTarget - 60);
                    setBigTimerTarget(nt);
                    setBigTimerSeconds(nt);
                  }} className="p-1 hover:bg-black/10 rounded"><Minus size={14} /></button>
                  <div className="text-sm font-bold">{Math.round(bigTimerTarget / 60)}m</div>
                  <button onClick={() => {
                    const nt = bigTimerTarget + 60;
                    setBigTimerTarget(nt);
                    setBigTimerSeconds(nt);
                  }} className="p-1 hover:bg-black/10 rounded"><Plus size={14} /></button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Top: Clocks & Title */}
              <div className="text-center mb-4 shrink-0">
                <div className={cn("text-sm font-ubuntu font-bold mb-1 uppercase tracking-wider truncate px-2", isDarkMode ? "text-zinc-400" : "text-slate-500")}>
                  {blocks[activeIndex]?.title || 'Fin'}
                </div>
                <div className={cn("text-6xl font-ubuntu font-bold tracking-tighter mb-2", isDarkMode ? "text-zinc-100" : "text-[#1a1a1a]")}>
                  {formatTime(blockCountDown ? (((blocks[activeIndex]?.duration || 0) + (blocks[activeIndex]?.extendedTime || 0)) - activeBlockElapsed) : activeBlockElapsed)}
                </div>
                <div className={cn("flex flex-col justify-center items-center gap-1", isDarkMode ? "text-zinc-400" : "text-slate-500")}>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] uppercase tracking-wider font-bold", isDarkMode ? "text-zinc-500" : "text-slate-400")}>Global</span>
                    <span className={cn("text-xl font-ubuntu font-bold tracking-tighter", isDarkMode ? "text-brand-orange" : "text-brand-orange")}>
                      {formatTime(globalCountDown ? (totalDuration - elapsedGlobal) : elapsedGlobal)}
                    </span>
                  </div>
                  {timeoutState.active || timeoutState.used > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-red-500">Timeout</span>
                      <span className={cn("text-xl font-ubuntu font-bold tracking-tighter text-red-500", timeoutState.active ? "animate-pulse" : "")}>
                        {formatTime(timeoutState.used)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
              
              {/* Middle: Timeline */}
              <div className={cn("flex-1 flex min-h-0 mb-4 rounded-xl overflow-hidden border shadow-inner", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-slate-50 border-slate-200")}>
                <div 
                  className="w-full relative flex flex-col cursor-ns-resize touch-none"
                  onPointerDown={handleTimelinePointerDown}
                  onPointerMove={handleTimelinePointerMove}
                  onPointerUp={handleTimelinePointerUp}
                  onPointerCancel={handleTimelinePointerUp}
                >
                  {blocks.map((b, i) => {
                    const bTotal = b.duration + (b.extendedTime || 0);
                    const hPct = totalDuration > 0 ? (bTotal / totalDuration) * 100 : 0;
                    const extPercent = bTotal > 0 ? ((b.extendedTime || 0) / bTotal) * 100 : 0;
                    const isActive = i === activeIndex;
                    const blockParticipants = participants.filter(p => b.participantIds.includes(p.id));

                    return (
                      <div 
                        key={b.id} 
                        style={{ 
                          height: `${hPct}%`, 
                          minHeight: '38px', 
                          flexGrow: hPct,
                          backgroundColor: isDarkMode ? (isActive ? 'rgba(39, 39, 42, 0.5)' : 'transparent') : (isActive ? 'rgba(241, 245, 249, 1)' : 'white')
                        }} 
                        className={cn(
                          "relative w-full flex pointer-events-none border-b shrink-0 transition-colors", 
                          isDarkMode ? "border-zinc-700" : "border-slate-200", 
                          isActive ? "z-10 shadow-sm" : "opacity-90"
                        )}
                      >
                        {isActive && <PointerLine progress={blockProgress} />}
                        {/* Left side: Title and Participants */}
                        <div className="flex-1 flex flex-col items-start justify-center pl-4 pr-2 relative overflow-hidden z-10">
                          <span className={cn("font-bold text-sm text-left leading-tight truncate w-full", isDarkMode ? "text-zinc-100" : "text-slate-800")}>{b.title}</span>
                          {blockParticipants.length > 0 && (
                            <div className="flex items-center justify-start gap-0.5 mt-1 w-full flex-wrap">
                              {blockParticipants.map(p => (
                                <div key={p.id} className="relative aspect-square w-6 h-6">
                                  {p.avatar ? (
                                    <img 
                                      src={p.avatar} 
                                      alt={p.name} 
                                      className={cn("w-full h-full rounded-full border-2 object-cover shadow-sm", isDarkMode ? "border-zinc-800" : "border-white")} 
                                    />
                                  ) : (
                                    <div className={cn("w-full h-full rounded-full border-2 flex items-center justify-center text-[8px] font-bold text-white uppercase", isDarkMode ? "border-zinc-800" : "border-white")} style={{ backgroundColor: p.color }}>
                                      {p.name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Right side: Timeline block color indicator */}
                        <div className="w-16 h-full relative border-l border-black/5 shrink-0 flex items-center justify-center z-10" style={{ backgroundColor: b.color }}>
                          <span className="text-[10px] font-bold text-white drop-shadow-sm z-10">{Math.round(bTotal / 60)}m</span>
                          {(b.extendedTime || 0) > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-red-500 z-0" style={{ height: `${extPercent}%` }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          
          {/* Bottom: Minimalist Controls */}
          <div className="flex justify-center items-center gap-4 shrink-0 pb-2">
            <button onClick={() => setIsBigTimer(!isBigTimer)} className={cn(
              "p-3 rounded-full transition-all active:scale-95 border",
              isBigTimer
                ? "bg-gradient-to-br from-brand-orange to-orange-600 text-white border-orange-700"
                : isDarkMode
                  ? "bg-zinc-800 text-brand-orange border-zinc-700 hover:bg-zinc-700"
                  : "bg-white text-brand-orange border-slate-200 hover:bg-slate-50"
            )}>
              <Clock size={20} />
            </button>
            <button onClick={handleReset} className={cn(
              "p-3 rounded-full transition-all active:scale-95 border",
              isDarkMode
                ? "bg-zinc-800 text-zinc-100 border-zinc-700 hover:bg-zinc-700"
                : "bg-white text-[#1a1a1a] border-slate-200 hover:bg-slate-50"
            )}>
              <RotateCcw size={20} />
            </button>
            <button
              onClick={handlePlayPause}
              className="p-4 rounded-full transition-all active:scale-90 text-white"
              style={{
                background: isRunning
                  ? 'linear-gradient(135deg, #f34551, #b91c1c)'
                  : 'linear-gradient(135deg, #ff851d, #ea580c)',
                boxShadow: isRunning
                  ? '0 4px 0 #7f1d1d'
                  : '0 4px 0 #7c2d12',
              }}
            >
              {isRunning ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
            </button>
            {!isBigTimer && (
              <>
                <button onClick={handleSkipNext} className={cn(
                  "p-3 rounded-full transition-all active:scale-95 border",
                  isDarkMode
                    ? "bg-zinc-800 text-zinc-100 border-zinc-700 hover:bg-zinc-700"
                    : "bg-white text-[#1a1a1a] border-slate-200 hover:bg-slate-50"
                )}>
                  <SkipForward size={20} />
                </button>
                <button onClick={handleTimeoutClick} className={cn(
                  "p-3 rounded-full transition-all active:scale-95 border",
                  timeoutState.active
                    ? "bg-gradient-to-br from-brand-red to-red-700 text-white border-red-950 animate-pulse"
                    : isDarkMode
                      ? "bg-zinc-800 text-brand-red border-zinc-700 hover:bg-zinc-900"
                      : "bg-white text-brand-red border-red-100 hover:bg-red-50"
                )}>
                  <AlertTriangle size={20} />
                </button>
              </>
            )}
          </div>
        </div>,
        pipContainer
      )}
    </div>
  );
}
