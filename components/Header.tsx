import React, { useRef, useState } from 'react';
import { 
  Play, 
  Square, 
  Save, 
  Download, 
  Code, 
  ChevronLeft, 
  Globe,
  Upload,
  Box,
  Layout as LayoutIcon,
  HelpCircle,
  Database,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { Language } from '../translations';
import SmartCommandBar from './SmartCommandBar';
import type { Scene, GameObject, ProjectData } from '../types';

interface HeaderProps {
  onSave: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onExport: () => void;
  onViewCode: () => void;
  onReturnToStart: () => void;
  onImportProject: (e: React.ChangeEvent<HTMLInputElement>) => void;
  projectName: string;
  onUpdateProjectName: (newName: string) => void;
  projectIcon: string;
  onUpdateProjectIcon: (newIcon: string) => void;
  activeScene: Scene | undefined;
  projectData: ProjectData | null;
  onUpdateProjectData: (updates: Partial<ProjectData>) => void;
  onAddObject: (props?: Partial<GameObject>) => void;
  onOpenCharacterSkins?: () => void;
}

const GAME_ICONS = ['🎮', '👾', '🚀', '🧱', '🤠', '⚔️', '⚽', '🪄', '🏰', '💎', '🍎', '🦖', '👻', '👽', '👑', '🌟', '🐱', '🦊', '🦄', '🍕', '🚗', '✈️', '🏝️', '🌋', '🎯', '🎸', '🎨', '🧩', '🔑', '❤️'];

const Header: React.FC<HeaderProps> = ({ 
  onSave, isPlaying, onTogglePlay, onExport, onViewCode, onReturnToStart, onImportProject, projectName, onUpdateProjectName,
  projectIcon, onUpdateProjectIcon,
  activeScene, projectData, onUpdateProjectData, onAddObject,
  onOpenCharacterSkins
}) => {
  const { t, language, setLanguage } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  
  const languages: { code: Language; label: string }[] = [
    { code: 'es', label: 'ESP' },
    { code: 'en', label: 'ENG' },
    { code: 'pt-BR', label: 'POR' },
    { code: 'fr', label: 'FRA' },
    { code: 'it', label: 'ITA' },
  ];

  return (
    <header className="flex items-center justify-between p-0 px-2 bg-[#121212] border-b border-[#333333] shadow-xl shrink-0 h-10 select-none">
      {/* Search / Project Info */}
      <div className="flex items-center gap-4 flex-1">
        <button onClick={onReturnToStart} title={t('header.return')} className="p-1.5 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white">
            <ChevronLeft size={18} />
        </button>
        
        <div className="flex items-center gap-2">
            <div className="relative">
                <button 
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center text-md shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all overflow-hidden p-0"
                    title="Cambiar Icono del Proyecto"
                >
                    {projectIcon && (projectIcon.startsWith('data:image/') || projectIcon.startsWith('http://') || projectIcon.startsWith('https://')) ? (
                        <img src={projectIcon} alt="Project Icon" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                        projectIcon || '🎮'
                    )}
                </button>
                {showIconPicker && (
                    <div className="absolute top-9 left-0 bg-[#161616] border border-[#333333] rounded-lg shadow-2xl p-2 z-[100] w-48 flex flex-col gap-2">
                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest px-1">Elegir Icono</div>
                        <div className="grid grid-cols-5 gap-1">
                            {GAME_ICONS.map(icon => (
                                <button
                                    key={icon}
                                    onClick={() => {
                                        onUpdateProjectIcon(icon);
                                        setShowIconPicker(false);
                                    }}
                                    className={`w-7 h-7 rounded text-center text-sm flex items-center justify-center hover:bg-indigo-600/20 transition-all ${projectIcon === icon ? 'bg-indigo-600 text-white' : 'text-gray-300'}`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-white/5">
                            <label className="flex items-center justify-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] cursor-pointer transition-all font-medium">
                                <Upload size={12} />
                                <span>Subir de PC / Móvil</span>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = () => {
                                                if (typeof reader.result === 'string') {
                                                    onUpdateProjectIcon(reader.result);
                                                    setShowIconPicker(false);
                                                }
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex flex-col">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none">Return 2D Engine</span>
                <input 
                    type="text" 
                    value={projectName} 
                    onChange={(e) => onUpdateProjectName(e.target.value)}
                    className="bg-transparent border-none p-0 text-[11px] font-bold text-gray-200 focus:outline-none focus:ring-0 w-32 md:w-48 placeholder-gray-600"
                    placeholder="Project Name"
                />
            </div>
        </div>

        <SmartCommandBar 
          activeScene={activeScene}
          projectData={projectData}
          onUpdateProjectData={onUpdateProjectData}
          onAddObject={onAddObject}
        />
      </div>

      {/* Center Controls */}
      <div className="flex justify-center flex-1 gap-1 h-full items-center">
        <button 
          onClick={onTogglePlay}
          className={`flex items-center gap-2 px-4 h-7 rounded text-[10px] font-bold uppercase transition-all shadow-lg ${isPlaying ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-[#2a2a2a] hover:bg-green-600 text-gray-300 hover:text-white'}`}
          title={isPlaying ? t('header.stop') : t('header.play')}
        >
          {isPlaying ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
          <span>{isPlaying ? 'Detener' : 'Ejecutar'}</span>
        </button>
        
        <div className="h-4 w-[1px] bg-white/10 mx-2" />

        <div className="flex bg-[#1a1a1a] rounded overflow-hidden border border-white/5">
             <button onClick={onViewCode} className="p-1 px-3 hover:bg-white/5 text-gray-400 hover:text-white transition-colors" title="Ver Código">
                <Code size={14} />
             </button>
             {onOpenCharacterSkins && (
                 <button onClick={onOpenCharacterSkins} className="p-1 px-3 border-l border-white/5 hover:bg-white/5 text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1.5 text-[9px] font-bold uppercase cursor-pointer" title="Skins y Personajes">
                    <Sparkles size={11} className="animate-pulse text-violet-400" />
                    <span className="hidden xl:inline text-[9px] text-violet-300">Skins</span>
                 </button>
             )}
             <button onClick={onSave} className="p-1 px-3 border-l border-white/5 hover:bg-white/5 text-indigo-400 hover:text-indigo-300 transition-colors" title="Guardar">
                <Save size={14} />
             </button>
        </div>
      </div>
      
      {/* Right Controls */}
      <div className="flex items-center justify-end gap-1 flex-1">
        <div className="hidden lg:flex items-center gap-1 mr-2">
            <button className="p-1.5 text-gray-500 hover:text-white"><Database size={14} /></button>
            <button className="p-1.5 text-gray-500 hover:text-white"><HelpCircle size={14} /></button>
        </div>

        <div className="h-4 w-[1px] bg-white/10 mx-1" />

        <div className="flex items-center gap-1 bg-[#1a1a1a] rounded px-1 ml-2">
            <Globe size={12} className="text-gray-600 ml-1" />
            <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-transparent border-none text-[10px] font-bold text-gray-400 focus:outline-none focus:ring-0 p-1 pr-4 cursor-pointer"
            >
                {languages.map(lang => (
                    <option key={lang.code} value={lang.code} className="bg-[#1a1a1a]">{lang.label}</option>
                ))}
            </select>
        </div>

        <button 
          onClick={onExport}
          className="ml-2 flex items-center gap-2 px-3 h-7 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold uppercase transition-all shadow-lg"
          title={t('header.export')}
        >
          <Download size={12} />
          <span className="hidden sm:inline">Exportar</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
