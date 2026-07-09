import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { Scene, GameObject, ProjectData, GameEvent, Condition, Action } from '../types';

interface SmartCommandBarProps {
  activeScene: Scene | undefined;
  projectData: ProjectData | null;
  onUpdateProjectData: (updates: Partial<ProjectData>) => void;
  onAddObject: (props?: Partial<GameObject>) => void;
}

const SmartCommandBar: React.FC<SmartCommandBarProps> = ({ activeScene, projectData, onUpdateProjectData, onAddObject }) => {
  const [command, setCommand] = useState('');
  const [clipboard, setClipboard] = useState<Partial<GameObject> | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = [
    "crear player.",
    "crear moneda.",
    "crear enemigo.",
    "crear plataforma.",
    "crear plataforma patrulla.",
    "crear marcador.",
    "crear jefe.",
    "crear escalera.",
    "crear cubo rojo.",
    "crear circulo azul.",
    "crear vida.",
    "al colisionar Player con Moneda se destruya.",
    "al colisionar Player con Enemigo sonido golpe.",
    "copiar Player.",
    "pegar.",
    "limpiar escena.",
    "fondo negro."
  ];

  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    
    // Remove trailing dot if present for processing
    const hasDot = trimmed.endsWith('.');
    const text = (hasDot ? trimmed.slice(0, -1) : trimmed).toLowerCase();

    // 1. Scene Management
    if (text === 'limpiar escena' && activeScene && projectData) {
      const updatedScenes = projectData.scenes.map(s => 
        s.id === activeScene.id ? { ...s, gameObjects: [], events: [] } : s
      );
      onUpdateProjectData({ scenes: updatedScenes });
      setCommand('');
      setShowSuggestions(false);
      return;
    }

    if (text.startsWith('fondo ') && activeScene && projectData) {
      const colorName = text.replace('fondo ', '').trim();
      const colors: Record<string, string> = {
        rojo: '#ef4444', azul: '#3b82f6', verde: '#22c55e', amarillo: '#eab308', 
        negro: '#000000', blanco: '#ffffff', naranja: '#f97316', morado: '#a855f7',
        gris: '#4b5563', oscuro: '#111827'
      };
      const color = colors[colorName] || colorName;
      const updatedScenes = projectData.scenes.map(s => 
        s.id === activeScene.id ? { ...s, backgroundColor: color } : s
      );
      onUpdateProjectData({ scenes: updatedScenes });
      setCommand('');
      setShowSuggestions(false);
      return;
    }

    // 2. Copy/Paste
    if (text.startsWith('copiar ') && activeScene) {
      const targetName = text.replace('copiar ', '').trim();
      const target = activeScene.gameObjects.find(o => o.name.toLowerCase() === targetName);
      if (target) {
        setClipboard(JSON.parse(JSON.stringify(target)));
      }
      setCommand('');
      setShowSuggestions(false);
      return;
    }

    if (text === 'pegar' && clipboard) {
      onAddObject({
        ...clipboard,
        id: undefined, // Let the app generate a new ID
        x: (clipboard.x || 0) + 20,
        y: (clipboard.y || 0) + 20,
        name: `${clipboard.name}_copia`
      });
      setCommand('');
      setShowSuggestions(false);
      return;
    }

    // 2. Generic Object Creation
    const createRegex = /(?:crear|añadir) (?:un |una )?(?:(\w+) )?(\w+)/i;
    const createMatch = text.match(createRegex);
    if (createMatch) {
      const arg1 = createMatch[1]; // color or undefined
      const arg2 = createMatch[2]; // type
      
      let type = 'cuadrado';
      let color = '#ffffff';

      const colors: Record<string, string> = {
        rojo: '#ef4444', azul: '#3b82f6', verde: '#22c55e', amarillo: '#eab308', 
        negro: '#000000', blanco: '#ffffff', naranja: '#f97316', morado: '#a855f7'
      };

      if (colors[arg1]) { color = colors[arg1]; type = arg2; }
      else if (colors[arg2]) { color = colors[arg2]; type = arg1; }
      else { type = arg2 || arg1; }

      if (type.includes('player')) {
        onAddObject({
          name: 'Player', color: '#3b82f6', width: 40, height: 60,
          behaviors: [
            { name: 'PlatformerCharacter', properties: { speed: 200, jumpForce: 400, gravity: 600 } }, 
            { name: 'FollowCamera', properties: {} },
            { name: 'LadderClimber', properties: { speed: 150 } }
          ]
        });
      } else if (type.includes('marcador') || type.includes('puntos')) {
        onAddObject({ 
          name: 'Marcador', color: '#ffffff', width: 100, height: 30, isUI: true,
          behaviors: [{ name: 'ScoreCounter', properties: { variableName: 'score', format: 'Puntos: {value}' } }]
        });
      } else if (type.includes('jefe') || type.includes('boss')) {
        onAddObject({ 
          name: 'Boss', color: '#991b1b', width: 80, height: 80, 
          behaviors: [{ name: 'Boss', properties: { hp: 500, maxHp: 500, speed: 80, jumpForce: 350 } }]
        });
      } else if (type.includes('escalera')) {
        onAddObject({ 
          name: 'Escalera', color: '#78350f', width: 40, height: 200, 
          behaviors: [{ name: 'Ladder', properties: {} }]
        });
      } else if (type.includes('moneda')) {
        onAddObject({ name: 'Moneda', color: '#fbbf24', width: 20, height: 20, isTouchable: true });
      } else if (type.includes('enemigo') || type.includes('malo')) {
        onAddObject({ name: 'Enemigo', color: '#ef4444', width: 40, height: 40, isTouchable: true });
      } else if (type.includes('vida') || type.includes('corazon')) {
        onAddObject({ name: 'Vida', color: '#f472b6', width: 25, height: 25, isTouchable: true });
      } else if (type.includes('patrulla')) {
        onAddObject({ 
          name: 'Plataforma_Movil', color: color, width: 100, height: 20, 
          behaviors: [{ name: 'Patrol', properties: { speed: 80, range: 200 } }]
        });
      } else if (type.includes('plataforma') || type.includes('suelo')) {
        onAddObject({ name: 'Plataforma', color: color, width: 200, height: 20 });
      } else {
        onAddObject({ name: type.charAt(0).toUpperCase() + type.slice(1), color: color, width: 50, height: 50 });
      }
      setCommand('');
      setShowSuggestions(false);
      return;
    }

    // 3. Events
    const collisionRegex = /al colisionar (.*) (?:con|el) (.*) (?:se destruya|sonido (.*))/i;
    const match = text.match(collisionRegex);
    
    if (match && activeScene && projectData) {
      const nameA = match[1].trim();
      const nameB = match[2].trim();
      const soundName = match[3]?.trim();

      const objA = activeScene.gameObjects.find(o => o.name.toLowerCase() === nameA.toLowerCase());
      const objB = activeScene.gameObjects.find(o => o.name.toLowerCase() === nameB.toLowerCase());

      if (objA && objB) {
        const actions: Action[] = [];
        if (soundName) {
           actions.push({ object: 'Global', action: 'PlaySound', params: { soundName } });
        } else {
           actions.push({ object: objB.name, action: 'Destroy' });
        }

        const newEvent: GameEvent = {
          id: `ev_${Date.now()}`,
          conditions: [{ object: objA.name, trigger: 'OnCollisionWith', target: objB.name }],
          actions: actions
        };

        const updatedScenes = projectData.scenes.map(s => 
          s.id === activeScene.id ? { ...s, events: [...s.events, newEvent] } : s
        );

        onUpdateProjectData({ scenes: updatedScenes });
      }
    }
    
    setCommand('');
    setShowSuggestions(false);
  };

  return (
    <div className="relative hidden md:flex items-center gap-1.5 bg-[#1a1a1a] border border-[#333333] rounded px-2 py-0.5 mx-2 flex-1 max-w-[320px] lg:max-w-md shadow-inner group transition-all hover:border-indigo-500/50">
      <Sparkles size={12} className="text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
      <input 
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        onKeyDown={(e) => { 
          if (e.key === 'Enter') executeCommand(command);
          if (e.key === 'Escape') setShowSuggestions(false);
        }}
        placeholder="Detector inteligente... (p. ej: crear player.)"
        className="bg-transparent border-none focus:outline-none text-[10px] text-gray-300 w-full placeholder-gray-600 font-medium"
      />
      <div className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter opacity-40 shrink-0 select-none">Smart</div>
      
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#333333] rounded-md shadow-xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-1.5 border-b border-[#333333] bg-[#222222]">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest px-1">Comandos Inteligentes</span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {suggestions.filter(s => s.toLowerCase().includes(command.toLowerCase())).map((s, i) => (
              <button 
                key={i}
                className="w-full text-left px-3 py-1.5 text-[10px] text-gray-400 hover:bg-indigo-600/20 hover:text-indigo-300 transition-colors border-b border-[#333333]/50 last:border-0"
                onClick={() => {
                  setCommand(s);
                  executeCommand(s);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartCommandBar;
