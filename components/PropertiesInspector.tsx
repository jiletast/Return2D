import React, { useState } from 'react';
import type { GameObject, GameAsset, Scene, ProjectData, Variable } from '../types';
import { 
  Box, 
  Settings, 
  Cpu, 
  Image as ImageIcon, 
  Shield, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  Copy, 
  Grid,
  Save,
  Lock,
  Plus,
  Eye,
  EyeOff,
  ArrowLeft,
  Upload,
  FileImage,
  Zap,
  Database,
  Video,
  Film
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { availableBehaviors } from '../behaviors/definitions';

const SectionHeader: React.FC<{ 
    title: string, 
    icon: React.ReactNode, 
    isOpen: boolean, 
    onToggle: () => void,
    action?: React.ReactNode
}> = ({ title, icon, isOpen, onToggle, action }) => (
    <div className="flex flex-col">
        <div 
            onClick={onToggle}
            className="flex items-center gap-2 h-8 px-2 bg-[#2a2a2a] hover:bg-[#333333] cursor-pointer transition-colors border-b border-[#1a1a1a]"
        >
            <div className="w-4 flex items-center justify-center text-gray-500">
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
            <div className="w-4 flex items-center justify-center text-indigo-400">
                {icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300 flex-grow">{title}</span>
            {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
        </div>
    </div>
);

const PropertyRow: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex items-center min-h-[28px] border-b border-[#1a1a1a] last:border-0 hover:bg-white/[0.02] transition-colors">
        <span className="w-24 px-3 text-[11px] text-gray-500 truncate" title={label}>{label}</span>
        <div className="flex-grow px-1">
            {children}
        </div>
    </div>
);

const CompactInput: React.FC<{ 
    value: string | number, 
    onChange: (val: string | number) => void, 
    type?: string,
    width?: string,
    placeholder?: string
}> = ({ value, onChange, type = 'text', width = 'w-full', placeholder }) => (
    <input 
        type={type}
        value={value}
        onChange={e => onChange(type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)}
        placeholder={placeholder}
        className={`${width} bg-[#1a1a1a] border border-transparent hover:border-[#444444] focus:border-indigo-500 rounded px-1.5 py-0.5 text-[11px] text-gray-200 focus:outline-none transition-all`}
    />
);

interface PropertiesInspectorProps {
  selectedObject: GameObject | null;
  projectData: ProjectData;
  onUpdateProjectData: (updates: Partial<ProjectData>) => void;
  onUpdateObject: (id: number, updates: Partial<GameObject>) => void;
  onDeleteObject: (id: number) => void;
  onCloneObject: (id: number) => void;
  onSaveAsGlobalObject?: (obj: GameObject) => void;
  onAddAsset?: (asset: GameAsset) => void;
  width: number;
  onToggleCollapse: () => void;
}

const PropertiesInspector: React.FC<PropertiesInspectorProps> = ({ 
    selectedObject, projectData, onUpdateProjectData, onUpdateObject, onDeleteObject, onCloneObject, onSaveAsGlobalObject, onAddAsset, width, onToggleCollapse 
}) => {
  const { t } = useLanguage();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['transform', 'appearance', 'logic', 'scene', 'settings', 'collision', 'tilemap', 'objectVariables', 'globalVariables', 'uiSettings']));
  const [isSelectingAsset, setIsSelectingAsset] = useState(false);
  const [selectingAssetType, setSelectingAssetType] = useState<'image' | 'video'>('image');
  const [isAddingBehavior, setIsAddingBehavior] = useState(false);
  const [expandedBehaviors, setExpandedBehaviors] = useState<Set<string>>(new Set());

  const getBehaviorKey = (name: string): string => {
    switch (name) {
        case 'PlatformerCharacter': return 'platformer';
        case 'Physics': return 'physics';
        case 'Solid': return 'solid';
        case 'TopDownRPGMovement': return 'topdown';
        case 'Patrol': return 'patrol';
        case 'Oscillate': return 'oscillate';
        case 'Rotate': return 'rotate';
        case 'Pulse': return 'pulse';
        case 'FollowCamera': return 'camera';
        case 'Tilemap': return 'tilemap';
        default: return name.toLowerCase();
    }
  };

  const toggleBehaviorExpand = (behaviorName: string) => {
    setExpandedBehaviors(prev => {
        const next = new Set(prev);
        if (next.has(behaviorName)) next.delete(behaviorName);
        else next.add(behaviorName);
        return next;
    });
  };

  const handleUpdateBehaviorProperty = (behaviorName: string, propKey: string, newValue: any) => {
    if (!selectedObject) return;
    const nextBehaviors = selectedObject.behaviors?.map(b => {
        if (b.name === behaviorName) {
            return {
                ...b,
                properties: {
                    ...(b.properties || {}),
                    [propKey]: newValue
                }
            };
        }
        return b;
    }) || [];
    handleUpdate({ behaviors: nextBehaviors });
  };
  
  const activeScene = projectData.scenes.find(s => s.id === projectData.activeSceneId) ?? null;

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
  };

  const handleUpdate = (updates: Partial<GameObject>) => {
    if (!selectedObject) return;
    onUpdateObject(selectedObject.id, updates);
  };

  const onUpdateScene = (updates: Partial<Scene>) => {
    if (!activeScene) return;
    const newScenes = projectData.scenes.map(s => s.id === activeScene.id ? {...s, ...updates} : s);
    onUpdateProjectData({ scenes: newScenes });
  };

  if (width <= 32) {
    return (
        <div className="flex flex-col items-center py-4 gap-4 bg-[#1a1a1a] h-full border-l border-[#333333]">
            <button onClick={onToggleCollapse} className="text-gray-500 hover:text-white transition-colors"><ChevronRight className="rotate-180" size={20} /></button>
            <div className="h-[1px] w-4 bg-white/10" />
            <button className="text-gray-400"><Settings size={18} /></button>
            <button className="text-gray-400"><Cpu size={18} /></button>
        </div>
    );
  }

  if (isSelectingAsset && selectedObject) {
    const isImage = selectingAssetType === 'image';
    const imageAssets = projectData.assets?.filter(a => a.type === 'image') || [];
    const videoAssets = projectData.assets?.filter(a => a.type === 'video') || [];
    const currentAssets = isImage ? imageAssets : videoAssets;

    return (
      <div className="flex flex-col h-full bg-[#202020] select-none border-l border-[#333333]">
        {/* Header */}
        <div className="h-10 px-3 flex items-center gap-2 border-b border-[#333333] bg-[#1a1a1a]">
          <button 
            onClick={() => setIsSelectingAsset(false)}
            className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-300">
            {isImage ? 'Seleccionar Sprite' : 'Seleccionar Video'}
          </span>
        </div>

        <div className="flex-grow p-4 overflow-y-auto custom-scrollbar space-y-4">
          {/* Subir archivo local */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              {isImage ? 'Subir imagen desde dispositivo' : 'Subir video desde dispositivo'}
            </label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#333333] hover:border-indigo-500 rounded-lg p-5 cursor-pointer bg-[#181818] text-gray-400 hover:text-white transition-all text-center">
              {isImage ? <Upload size={20} className="text-indigo-400 mb-1.5" /> : <Video size={20} className="text-indigo-400 mb-1.5" />}
              <span className="text-[11px] font-bold">{isImage ? 'Subir archivo de imagen' : 'Subir archivo de video'}</span>
              <span className="text-[9px] text-gray-500 mt-1">{isImage ? 'Soporta PNG, JPG, GIF y SVG' : 'Soporta MP4, WebM y Ogg (con audio)'}</span>
              <input 
                type="file" 
                accept={isImage ? "image/*" : "video/*"}
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (fileEvent) => {
                    const url = fileEvent.target?.result as string;
                    if (url && onAddAsset) {
                      const newAsset: GameAsset = {
                        id: `asset_${Date.now()}`,
                        name: file.name,
                        type: isImage ? 'image' : 'video',
                        url: url
                      };
                      onAddAsset(newAsset);
                      if (isImage) {
                        handleUpdate({ imageUrl: url, videoUrl: undefined, color: 'transparent' });
                      } else {
                        handleUpdate({ videoUrl: url, imageUrl: undefined, color: 'transparent', videoLoop: true, videoAutoplay: true, videoMuted: false });
                      }
                      setIsSelectingAsset(false);
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>

          {/* Grid de assets preestablecidos del proyecto */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                {isImage ? `Galería de imágenes (${imageAssets.length})` : `Galería de videos (${videoAssets.length})`}
              </label>
              {((isImage && selectedObject.imageUrl) || (!isImage && selectedObject.videoUrl)) && (
                <button 
                  onClick={() => {
                    if (isImage) {
                      handleUpdate({ imageUrl: undefined, color: '#eab308' });
                    } else {
                      handleUpdate({ videoUrl: undefined, color: '#eab308' });
                    }
                    setIsSelectingAsset(false);
                  }}
                  className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase transition-colors"
                >
                  {isImage ? 'Quitar Textura' : 'Quitar Video'}
                </button>
              )}
            </div>

            {currentAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 border border-dashed border-[#333333] rounded bg-[#181818]/60 text-gray-500">
                {isImage ? <FileImage size={24} className="opacity-30 mb-2" /> : <Film size={24} className="opacity-30 mb-2" />}
                <span className="text-[10px] uppercase font-bold tracking-wider">{isImage ? 'No hay imágenes' : 'No hay videos'}</span>
                <span className="text-[9px] mt-0.5 text-center px-4 leading-relaxed">
                  {isImage ? 'Sube una imagen local usando la opción de arriba.' : 'Sube un video local usando la opción de arriba.'}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {currentAssets.map((asset) => {
                  const isCurrent = isImage ? selectedObject.imageUrl === asset.url : selectedObject.videoUrl === asset.url;
                  return (
                    <button
                      key={asset.id}
                      onClick={() => {
                        if (isImage) {
                          handleUpdate({ imageUrl: asset.url, videoUrl: undefined, color: 'transparent' });
                        } else {
                          handleUpdate({ videoUrl: asset.url, imageUrl: undefined, color: 'transparent', videoLoop: true, videoAutoplay: true, videoMuted: false });
                        }
                        setIsSelectingAsset(false);
                      }}
                      className={`aspect-square relative rounded border bg-[#151515] p-1 overflow-hidden group flex flex-col items-center justify-center transition-all ${
                        isCurrent 
                          ? 'border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.3)] bg-indigo-950/20' 
                          : 'border-[#333333] hover:border-gray-500'
                      }`}
                      title={asset.name}
                    >
                      {isImage ? (
                        <img src={asset.url} className="max-w-full max-h-full object-contain pointer-events-none" />
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <Film size={20} className="text-indigo-400 mb-1 pointer-events-none" />
                          <span className="text-[8px] text-gray-400 truncate max-w-full px-1 pointer-events-none">{asset.name}</span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity truncate text-center text-[7px] text-gray-300 font-mono">
                        {asset.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#202020] select-none border-l border-[#333333]">
      {/* Header */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-[#333333] bg-[#1a1a1a]">
        <div className="flex items-center gap-2">
            <Settings size={14} className="text-gray-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-300">Inspector</span>
        </div>
        <button onClick={onToggleCollapse} className="p-1 hover:bg-white/5 rounded text-gray-500 hover:text-white transition-colors">
            <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {selectedObject ? (
          <div className="flex flex-col">
            {/* Base Info */}
            <div className="p-3 bg-[#1a1a1a] border-b border-[#333333]">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded bg-[#2a2a2a] flex items-center justify-center border border-[#444444]">
                        {selectedObject.imageUrl ? (
                            <img src={selectedObject.imageUrl} className="w-8 h-8 object-contain" />
                        ) : (
                            <Box size={24} className="text-indigo-400" />
                        )}
                    </div>
                    <div className="flex-grow min-w-0">
                        <CompactInput 
                            value={selectedObject.name} 
                            onChange={(val) => handleUpdate({ name: val as string })} 
                        />
                        <span className="text-[9px] font-mono text-gray-500 uppercase mt-1 block tracking-tighter opacity-50">ID: {selectedObject.id}</span>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => onCloneObject(selectedObject.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[#2a2a2a] hover:bg-[#333333] rounded text-[10px] font-bold text-gray-400 hover:text-white transition-colors">
                        <Copy size={12} /> DUPLICAR
                    </button>
                    <button onClick={() => onDeleteObject(selectedObject.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-900/10 hover:bg-red-900/20 rounded text-[10px] font-bold text-red-500 transition-colors border border-red-900/20">
                        <Trash2 size={12} /> ELIMINAR
                    </button>
                </div>
            </div>

            {/* Transform */}
            <SectionHeader 
                title="Transformar" 
                icon={<Grid size={14} />} 
                isOpen={openSections.has('transform')}
                onToggle={() => toggleSection('transform')}
            />
            {openSections.has('transform') && (
                <div className="bg-[#1a1a1a]/40 pb-1">
                    <PropertyRow label="Posición">
                        <div className="flex gap-2 py-1">
                            <div className="flex items-center gap-1 flex-1">
                                <span className="text-[10px] text-red-500 font-bold opacity-70">X</span>
                                <CompactInput type="number" value={selectedObject.x} onChange={val => handleUpdate({ x: val as number })} />
                            </div>
                            <div className="flex items-center gap-1 flex-1">
                                <span className="text-[10px] text-green-500 font-bold opacity-70">Y</span>
                                <CompactInput type="number" value={selectedObject.y} onChange={val => handleUpdate({ y: val as number })} />
                            </div>
                        </div>
                    </PropertyRow>
                    <PropertyRow label="Dimensión">
                        <div className="flex gap-2 py-1">
                            <div className="flex items-center gap-1 flex-1">
                                <span className="text-[10px] text-gray-500 font-bold">W</span>
                                <CompactInput type="number" value={selectedObject.width} onChange={val => handleUpdate({ width: val as number })} />
                            </div>
                            <div className="flex items-center gap-1 flex-1">
                                <span className="text-[10px] text-gray-500 font-bold">H</span>
                                <CompactInput type="number" value={selectedObject.height} onChange={val => handleUpdate({ height: val as number })} />
                            </div>
                        </div>
                    </PropertyRow>
                    <PropertyRow label="Escala">
                        <div className="flex gap-2 py-1">
                            <div className="flex items-center gap-1 flex-1">
                                <span className="text-[10px] text-gray-500">X</span>
                                <CompactInput type="number" value={selectedObject.scaleX ?? 1} onChange={val => handleUpdate({ scaleX: val as number })} />
                            </div>
                            <div className="flex items-center gap-1 flex-1">
                                <span className="text-[10px] text-gray-500">Y</span>
                                <CompactInput type="number" value={selectedObject.scaleY ?? 1} onChange={val => handleUpdate({ scaleY: val as number })} />
                            </div>
                        </div>
                    </PropertyRow>
                    <PropertyRow label="Rotación">
                        <CompactInput type="number" value={selectedObject.rotation || 0} onChange={val => handleUpdate({ rotation: val as number })} />
                    </PropertyRow>
                    <PropertyRow label="Z-Index">
                        <CompactInput type="number" value={selectedObject.zIndex || 0} onChange={val => handleUpdate({ zIndex: val as number })} />
                    </PropertyRow>
                    <PropertyRow label="Padre">
                        <select
                            value={selectedObject.parentId || ''}
                            onChange={e => handleUpdate({ parentId: e.target.value ? parseFloat(e.target.value) : null })}
                            className="w-full bg-[#1a1a1a] border border-transparent hover:border-[#444444] focus:border-indigo-500 rounded px-1.5 py-1 text-[11px] text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                        >
                            <option value="">(Ninguno)</option>
                            {(activeScene ? activeScene.gameObjects.filter(o => o.id !== selectedObject.id) : []).map(obj => (
                                <option key={obj.id} value={obj.id}>{obj.name}</option>
                            ))}
                        </select>
                    </PropertyRow>
                </div>
            )}

            {/* Appearance */}
            <SectionHeader 
                title="Apariencia" 
                icon={<ImageIcon size={14} />} 
                isOpen={openSections.has('appearance')}
                onToggle={() => toggleSection('appearance')}
            />
            {openSections.has('appearance') && (
                <div className="bg-[#1a1a1a]/40 p-3 space-y-3">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Sprite de Imagen</label>
                        <div 
                          onClick={() => {
                            setSelectingAssetType('image');
                            setIsSelectingAsset(true);
                          }}
                          className="aspect-square w-full bg-[#151515] rounded border border-[#333333] flex flex-col items-center justify-center gap-2 p-4 relative group overflow-hidden shadow-inner cursor-pointer"
                        >
                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                            {selectedObject.imageUrl ? (
                                <img src={selectedObject.imageUrl} className="max-w-full max-h-full object-contain relative z-10" />
                            ) : (
                                <>
                                    <ImageIcon size={24} className="text-gray-700" />
                                    <span className="text-[9px] text-gray-600 text-center uppercase tracking-widest font-bold">Sin Textura</span>
                                </>
                            )}
                            <div className="absolute inset-0 bg-indigo-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 backdrop-blur-sm">
                                 <button className="px-3 py-1.5 bg-white text-indigo-600 rounded text-[10px] font-bold uppercase shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">Cambiar Sprite</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Video del Objeto (Con Audio)</label>
                        <div 
                          onClick={() => {
                            setSelectingAssetType('video');
                            setIsSelectingAsset(true);
                          }}
                          className="aspect-video w-full bg-[#151515] rounded border border-[#333333] flex flex-col items-center justify-center gap-2 p-2 relative group overflow-hidden shadow-inner cursor-pointer"
                        >
                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                            {selectedObject.videoUrl ? (
                                <div className="flex flex-col items-center justify-center relative z-10">
                                    <Film size={24} className="text-indigo-400 mb-1" />
                                    <span className="text-[9px] text-gray-300 text-center truncate max-w-xs">{selectedObject.videoUrl.substring(0, 40)}...</span>
                                    {selectedObject.videoMuted === false ? (
                                        <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono mt-1">Con Audio</span>
                                    ) : (
                                        <span className="text-[8px] bg-gray-500/20 text-gray-400 px-1.5 py-0.5 rounded font-mono mt-1">Silenciado</span>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <Film size={24} className="text-gray-700" />
                                    <span className="text-[9px] text-gray-600 text-center uppercase tracking-widest font-bold">Sin Video</span>
                                </>
                            )}
                            <div className="absolute inset-0 bg-indigo-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 backdrop-blur-sm">
                                 <button className="px-3 py-1.5 bg-white text-indigo-600 rounded text-[10px] font-bold uppercase shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">Cambiar Video</button>
                            </div>
                        </div>
                    </div>
                    <PropertyRow label="Color">
                        <div className="flex gap-2">
                             <input 
                                type="color" 
                                value={selectedObject.color === 'transparent' ? '#000000' : selectedObject.color} 
                                onChange={e => handleUpdate({ color: e.target.value, imageUrl: undefined })}
                                className="w-8 h-5 rounded bg-transparent border border-[#333333] cursor-pointer"
                            />
                            <CompactInput value={selectedObject.color} onChange={v => handleUpdate({ color: v as string })} />
                        </div>
                    </PropertyRow>
                    <PropertyRow label="Visibilidad">
                        <button 
                            onClick={() => handleUpdate({ visible: selectedObject.visible !== false })}
                            className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] transition-colors ${selectedObject.visible !== false ? 'text-indigo-400 bg-indigo-400/10' : 'text-gray-500 bg-gray-500/10'}`}
                        >
                            {selectedObject.visible !== false ? <Eye size={12} /> : <EyeOff size={12} />}
                            {selectedObject.visible !== false ? 'Visible' : 'Oculto'}
                        </button>
                    </PropertyRow>
                    <PropertyRow label="Opacidad">
                        <input 
                            type="range" min="0" max="1" step="0.1" 
                            value={selectedObject.opacity ?? 1} 
                            onChange={e => handleUpdate({ opacity: parseFloat(e.target.value) })}
                            className="w-full accent-indigo-500 h-1 bg-[#151515] rounded-full appearance-none mt-2"
                        />
                    </PropertyRow>
                    {selectedObject.videoUrl && (
                        <div className="mt-3 pt-2 border-t border-[#333333] space-y-2">
                            <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Configuración de Video</div>
                            <PropertyRow label="Bucle (Loop)">
                                <button 
                                    onClick={() => handleUpdate({ videoLoop: selectedObject.videoLoop !== false ? false : true })}
                                    className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] transition-colors ${selectedObject.videoLoop !== false ? 'text-indigo-400 bg-indigo-400/10' : 'text-gray-500 bg-gray-500/10'}`}
                                >
                                    {selectedObject.videoLoop !== false ? 'En bucle' : 'Reproducir una vez'}
                                </button>
                            </PropertyRow>
                            <PropertyRow label="Audio (Sonido)">
                                <button 
                                    onClick={() => handleUpdate({ videoMuted: selectedObject.videoMuted === false ? true : false })}
                                    className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] transition-colors ${selectedObject.videoMuted === false ? 'text-indigo-400 bg-indigo-400/10' : 'text-gray-500 bg-gray-500/10'}`}
                                >
                                    {selectedObject.videoMuted === false ? 'Con Audio' : 'Silenciado'}
                                </button>
                            </PropertyRow>
                        </div>
                    )}
                </div>
            )}

            {/* End of Transform */}

            {/* UI Settings */}
            <SectionHeader 
                title="Interfaz de Usuario (UI) & Salud" 
                icon={<Eye size={14} className="text-emerald-400" />} 
                isOpen={openSections.has('uiSettings')}
                onToggle={() => toggleSection('uiSettings')}
            />
            {openSections.has('uiSettings') && (
                <div className="bg-[#1a1a1a]/40 p-3 space-y-3">
                    <PropertyRow label="Fijo en Pantalla (UI)">
                        <button 
                            onClick={() => handleUpdate({ isUI: selectedObject.isUI !== true })}
                            className={`w-full py-1 text-[10px] font-bold rounded m-0.5 border transition-all ${selectedObject.isUI ? 'bg-indigo-600 border-indigo-500 text-white animate-pulse-subtle' : 'bg-[#2a2a2a] border-[#333333] text-gray-500'}`}
                        >
                            {selectedObject.isUI ? 'SÍ (FIJO EN PANTALLA)' : 'NO (EN MAPA DE ESCENA)'}
                        </button>
                    </PropertyRow>

                    {selectedObject.isUI && (
                        <>
                            <PropertyRow label="Es Barra de Salud">
                                <button 
                                    onClick={() => handleUpdate({ isHealthBar: selectedObject.isHealthBar !== true })}
                                    className={`w-full py-1 text-[10px] font-bold rounded m-0.5 border transition-all ${selectedObject.isHealthBar ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-[#2a2a2a] border-[#333333] text-gray-500'}`}
                                >
                                    {selectedObject.isHealthBar ? 'SÍ (REPRESENTA HP DEL OBJ)' : 'NO (TEXTO / BOTÓN COMÚN)'}
                                </button>
                            </PropertyRow>

                            {selectedObject.isHealthBar && (
                                <PropertyRow label="Seguir Objeto (HP)">
                                    <input 
                                        type="text"
                                        list="game-objects-datalist"
                                        value={selectedObject.healthBarTarget || ''}
                                        onChange={e => handleUpdate({ healthBarTarget: e.target.value })}
                                        className="w-full bg-[#1a1a1a] border border-transparent hover:border-[#444444] focus:border-indigo-500 rounded px-1.5 py-1 text-[11px] text-indigo-300 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                                        placeholder="ej. Jugador TopDown"
                                    />
                                    <datalist id="game-objects-datalist">
                                        <option value="Jugador TopDown" />
                                        <option value="Jugador 2D" />
                                        {projectData.scenes?.flatMap(s => s.gameObjects || []).map(o => o.name).filter((value, index, self) => self.indexOf(value) === index).map(name => (
                                            <option key={name} value={name} />
                                        ))}
                                    </datalist>
                                </PropertyRow>
                            )}

                            <PropertyRow label="Texto UI">
                                <CompactInput 
                                    value={selectedObject.text || ''} 
                                    onChange={v => handleUpdate({ text: v as string })} 
                                    placeholder="ej. HP / SCORE: {score}"
                                />
                            </PropertyRow>

                            <PropertyRow label="Mapear Botón Táctil">
                                <select 
                                    value={selectedObject.controlAction || 'none'} 
                                    onChange={e => handleUpdate({ controlAction: e.target.value as any })}
                                    className="w-full bg-[#1a1a1a] border border-[#2b2b2b] rounded px-1.5 py-1 text-[10px] text-gray-200 focus:outline-none font-sans"
                                >
                                    <option value="none">Ninguno (Sólo de adorno / visual)</option>
                                    <option value="moveLeft">Mover Izquierda (🎮)</option>
                                    <option value="moveRight">Mover Derecha (🎮)</option>
                                    <option value="moveUp">Mover Arriba (RPG 🎮)</option>
                                    <option value="moveDown">Mover Abajo (RPG 🎮)</option>
                                    <option value="jump">Saltar / Subir (🎮)</option>
                                    <option value="run">Correr (Shift 🎮)</option>
                                    <option value="attack">Atacar (Atajo X/Golpe 🎮)</option>
                                </select>
                            </PropertyRow>
                        </>
                    )}
                </div>
            )}

            {/* Collision */}
            <SectionHeader 
                title="Colisión" 
                icon={<Shield size={14} />} 
                isOpen={openSections.has('collision')}
                onToggle={() => toggleSection('collision')}
            />
            {openSections.has('collision') && (
                <div className="bg-[#1a1a1a]/40 pb-1">
                    <PropertyRow label="Habilitada">
                        <button 
                            onClick={() => handleUpdate({ isTouchable: selectedObject.isTouchable !== false ? false : true })}
                            className={`w-full py-1 text-[10px] font-bold rounded m-0.5 border transition-all ${selectedObject.isTouchable !== false ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#2a2a2a] border-[#333333] text-gray-500'}`}
                        >
                            {selectedObject.isTouchable !== false ? 'ACTIVO' : 'INACTIVO'}
                        </button>
                    </PropertyRow>
                    <PropertyRow label="Arrastrable">
                        <button 
                            onClick={() => handleUpdate({ isDraggable: selectedObject.isDraggable !== true })}
                            className={`w-full py-1 text-[10px] font-bold rounded m-0.5 border transition-all ${selectedObject.isDraggable ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#2a2a2a] border-[#333333] text-gray-500'}`}
                        >
                            {selectedObject.isDraggable ? 'SÍ (ACTIVO)' : 'NO'}
                        </button>
                    </PropertyRow>
                    {selectedObject.isDraggable && (
                        <>
                            <PropertyRow label="Bloqueo Ejes">
                                <div className="flex gap-2 py-1">
                                    <button 
                                        onClick={() => handleUpdate({ dragXLocked: !selectedObject.dragXLocked })}
                                        className={`flex-1 py-1 text-[9px] font-bold rounded border transition-all ${selectedObject.dragXLocked ? 'bg-red-900/40 border-red-500/30 text-red-300' : 'bg-[#2a2a2a] border-[#333333] text-gray-400'}`}
                                    >
                                        BLOQUEAR X
                                    </button>
                                    <button 
                                        onClick={() => handleUpdate({ dragYLocked: !selectedObject.dragYLocked })}
                                        className={`flex-1 py-1 text-[9px] font-bold rounded border transition-all ${selectedObject.dragYLocked ? 'bg-red-900/40 border-red-500/30 text-red-300' : 'bg-[#2a2a2a] border-[#333333] text-gray-400'}`}
                                    >
                                        BLOQUEAR Y
                                    </button>
                                </div>
                            </PropertyRow>
                            <PropertyRow label="Límites X">
                                <div className="flex gap-2 py-1">
                                    <div className="flex items-center gap-1 flex-1">
                                        <span className="text-[9px] text-gray-500">Mín</span>
                                        <input 
                                            type="number" 
                                            value={selectedObject.dragMinX ?? ''} 
                                            onChange={e => handleUpdate({ dragMinX: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                                            placeholder="Libre"
                                            className="w-full bg-[#1a1a1a] border border-transparent hover:border-[#444444] focus:border-indigo-500 rounded px-1.5 py-0.5 text-[11px] text-gray-200 focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1 flex-1">
                                        <span className="text-[9px] text-gray-500">Máx</span>
                                        <input 
                                            type="number" 
                                            value={selectedObject.dragMaxX ?? ''} 
                                            onChange={e => handleUpdate({ dragMaxX: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                                            placeholder="Libre"
                                            className="w-full bg-[#1a1a1a] border border-transparent hover:border-[#444444] focus:border-indigo-500 rounded px-1.5 py-0.5 text-[11px] text-gray-200 focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </PropertyRow>
                            <PropertyRow label="Límites Y">
                                <div className="flex gap-2 py-1">
                                    <div className="flex items-center gap-1 flex-1">
                                        <span className="text-[9px] text-gray-500">Mín</span>
                                        <input 
                                            type="number" 
                                            value={selectedObject.dragMinY ?? ''} 
                                            onChange={e => handleUpdate({ dragMinY: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                                            placeholder="Libre"
                                            className="w-full bg-[#1a1a1a] border border-transparent hover:border-[#444444] focus:border-indigo-500 rounded px-1.5 py-0.5 text-[11px] text-gray-200 focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1 flex-1">
                                        <span className="text-[9px] text-gray-500">Máx</span>
                                        <input 
                                            type="number" 
                                            value={selectedObject.dragMaxY ?? ''} 
                                            onChange={e => handleUpdate({ dragMaxY: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                                            placeholder="Libre"
                                            className="w-full bg-[#1a1a1a] border border-transparent hover:border-[#444444] focus:border-indigo-500 rounded px-1.5 py-0.5 text-[11px] text-gray-200 focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </PropertyRow>
                        </>
                    )}
                    <PropertyRow label="Obstáculo Sólido">
                        <button 
                            onClick={() => {
                                const currentBehaviors = selectedObject.behaviors || [];
                                const isSolid = currentBehaviors.some(b => b.name === 'Solid');
                                if (isSolid) {
                                    handleUpdate({ behaviors: currentBehaviors.filter(b => b.name !== 'Solid') });
                                } else {
                                    handleUpdate({ behaviors: [...currentBehaviors, { name: 'Solid', properties: {} }] });
                                }
                            }}
                            className={`w-full py-1 text-[10px] font-bold rounded m-0.5 border transition-all ${selectedObject.behaviors?.some(b => b.name === 'Solid') ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#2a2a2a] border-[#333333] text-gray-500'}`}
                        >
                            {selectedObject.behaviors?.some(b => b.name === 'Solid') ? 'SÍ' : 'NO'}
                        </button>
                    </PropertyRow>
                    <PropertyRow label="Caja Personalizada">
                        <button 
                            onClick={() => {
                                const useCustom = !selectedObject.useCustomCollision;
                                const collisionData = useCustom 
                                    ? (selectedObject.collision || { width: selectedObject.width, height: selectedObject.height, offsetX: 0, offsetY: 0 })
                                    : selectedObject.collision;
                                handleUpdate({ useCustomCollision: useCustom, collision: collisionData });
                            }}
                            className={`w-full py-1 text-[10px] font-bold rounded m-0.5 border border-[#333333] transition-all bg-[#2a2a2a] text-gray-300 ${selectedObject.useCustomCollision ? 'text-indigo-400 bg-indigo-400/10 border-indigo-500/20' : ''}`}
                        >
                            {selectedObject.useCustomCollision ? "PERSONALIZADA" : "BÁSICA"}
                        </button>
                    </PropertyRow>
                    {selectedObject.useCustomCollision && selectedObject.collision && (
                        <>
                            <PropertyRow label="Tamaño Box">
                                <div className="flex gap-2 py-1">
                                    <div className="flex items-center gap-1 flex-1">
                                        <span className="text-[10px] text-gray-500">W</span>
                                        <CompactInput type="number" value={selectedObject.collision.width} onChange={val => handleUpdate({ collision: { ...selectedObject.collision!, width: val as number } })} />
                                    </div>
                                    <div className="flex items-center gap-1 flex-1">
                                        <span className="text-[10px] text-gray-500">H</span>
                                        <CompactInput type="number" value={selectedObject.collision.height} onChange={val => handleUpdate({ collision: { ...selectedObject.collision!, height: val as number } })} />
                                    </div>
                                </div>
                            </PropertyRow>
                            <PropertyRow label="Offset">
                                <div className="flex gap-2 py-1">
                                    <div className="flex items-center gap-1 flex-1">
                                        <span className="text-[10px] text-gray-500">X</span>
                                        <CompactInput type="number" value={selectedObject.collision.offsetX} onChange={val => handleUpdate({ collision: { ...selectedObject.collision!, offsetX: val as number } })} />
                                    </div>
                                    <div className="flex items-center gap-1 flex-1">
                                        <span className="text-[10px] text-gray-500">Y</span>
                                        <CompactInput type="number" value={selectedObject.collision.offsetY} onChange={val => handleUpdate({ collision: { ...selectedObject.collision!, offsetY: val as number } })} />
                                    </div>
                                </div>
                            </PropertyRow>
                        </>
                    )}
                </div>
            )}

            {/* Tilemap Properties */}
            {selectedObject.behaviors?.some(b => b.name === 'Tilemap') && (
                <>
                    <SectionHeader 
                        title="Configuración Tilemap" 
                        icon={<Grid size={14} />} 
                        isOpen={openSections.has('tilemap')}
                        onToggle={() => toggleSection('tilemap')}
                    />
                    {openSections.has('tilemap') && (() => {
                        const tilemapBehavior = selectedObject.behaviors?.find(b => b.name === 'Tilemap');
                        if (!tilemapBehavior) return null;
                        const { tileSize = 32, collisionData = '' } = tilemapBehavior.properties || {};
                        const rows = String(collisionData).split('\n');
                        const curRowsCount = rows.length;
                        const curColsCount = rows[0]?.length || 0;

                        const handleTileSizeChange = (newSize: number) => {
                            if (newSize < 4) return;
                            const newBehaviors = selectedObject.behaviors?.map(b => b.name === 'Tilemap' ? {
                                ...b,
                                properties: { ...b.properties, tileSize: newSize }
                            } : b) || [];
                            handleUpdate({ behaviors: newBehaviors });
                        };

                        const handleResizeGrid = (newCols: number, newRows: number) => {
                            if (newCols < 1 || newRows < 1) return;
                            
                            const lines = String(collisionData).split('\n');
                            const grid: string[] = [];
                            
                            for (let y = 0; y < newRows; y++) {
                                let lineStr = lines[y] ?? '';
                                if (lineStr.length < newCols) {
                                    lineStr = lineStr.padEnd(newCols, '0');
                                } else if (lineStr.length > newCols) {
                                    lineStr = lineStr.substring(0, newCols);
                                }
                                grid.push(lineStr);
                            }
                            
                            const newCollisionData = grid.join('\n');
                            const newBehaviors = selectedObject.behaviors?.map(b => b.name === 'Tilemap' ? {
                                ...b,
                                properties: { ...b.properties, collisionData: newCollisionData }
                            } : b) || [];
                            
                            // Also adjust object width/height to match new grid size * tileSize
                            handleUpdate({ 
                                behaviors: newBehaviors,
                                width: newCols * tileSize,
                                height: newRows * tileSize
                            });
                        };

                        return (
                            <div className="bg-[#1a1a1a]/40 pb-2 space-y-1">
                                <PropertyRow label="Tamaño Tile">
                                    <CompactInput 
                                        type="number" 
                                        value={tileSize} 
                                        onChange={val => handleTileSizeChange(val as number)} 
                                    />
                                </PropertyRow>
                                <PropertyRow label="Columnas (Ancho)">
                                    <CompactInput 
                                        type="number" 
                                        value={curColsCount} 
                                        onChange={val => handleResizeGrid(val as number, curRowsCount)} 
                                    />
                                </PropertyRow>
                                <PropertyRow label="Filas (Alto)">
                                    <CompactInput 
                                        type="number" 
                                        value={curRowsCount} 
                                        onChange={val => handleResizeGrid(curColsCount, val as number)} 
                                    />
                                </PropertyRow>
                                <div className="px-3 py-2 text-[10px] text-gray-500 italic leading-relaxed">
                                    💡 ¡Activa el <b>Pincel Tilemap</b> en la barra de herramientas inferior para dibujar bloques con el ratón directamente sobre la rejilla!
                                </div>
                            </div>
                        );
                    })()}
                </>
            )}

            {/* Logic */}
            <SectionHeader 
                title="Lógica & Comportamientos" 
                icon={<Cpu size={14} />} 
                isOpen={openSections.has('logic')}
                onToggle={() => toggleSection('logic')}
                action={
                    !isAddingBehavior && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsAddingBehavior(true);
                            }}
                            className="p-1 hover:bg-white/10 rounded text-indigo-400"
                            title="Añadir Comportamiento"
                        >
                            <Plus size={14} />
                        </button>
                    )
                }
            />
            {openSections.has('logic') && (
                <div className="bg-[#1a1a1a]/40 p-3 space-y-3">
                    {isAddingBehavior ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between border-b border-[#333333] pb-1.5 mb-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Añadir Comportamiento</span>
                                <button 
                                    onClick={() => setIsAddingBehavior(false)}
                                    className="text-[9px] font-bold text-indigo-400 hover:text-white uppercase transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                            
                            {(() => {
                                const objectBehaviors = selectedObject.behaviors || [];
                                const unaddedBehaviors = availableBehaviors.filter(bDef => !objectBehaviors.some(ob => ob.name === bDef.name));
                                
                                if (unaddedBehaviors.length === 0) {
                                    return (
                                        <div className="text-[10px] text-gray-500 italic text-center py-4 bg-[#151515] rounded border border-dashed border-[#333333]">
                                            Ya tienes todos los comportamientos posibles activos.
                                        </div>
                                    );
                                }
                                
                                return (
                                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                                        {unaddedBehaviors.map(bDef => {
                                            const key = getBehaviorKey(bDef.name);
                                            const labelStr = t(`behavior.${key}`) || bDef.name;
                                            return (
                                                <button
                                                    key={bDef.name}
                                                    onClick={() => {
                                                        const newBehaviors = [
                                                            ...objectBehaviors,
                                                            { name: bDef.name, properties: { ...bDef.defaultProperties } }
                                                        ];
                                                        handleUpdate({ behaviors: newBehaviors });
                                                        setIsAddingBehavior(false);
                                                    }}
                                                    className="w-full text-left p-2.5 bg-[#202020] border border-[#333333] hover:border-indigo-500 rounded flex flex-col hover:bg-indigo-950/20 transition-all cursor-pointer group"
                                                >
                                                    <span className="font-bold text-[10px] uppercase tracking-wider text-gray-200 group-hover:text-indigo-400 flex items-center gap-1.5">
                                                        <Zap size={11} className="text-indigo-400" />
                                                        {labelStr}
                                                    </span>
                                                    <span className="text-[9px] text-gray-500 mt-1 leading-normal font-sans">
                                                        {bDef.description}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <button 
                                onClick={() => setIsAddingBehavior(true)}
                                className="w-full py-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded text-[10px] font-bold uppercase hover:bg-indigo-600 hover:text-white transition-all tracking-wider shadow-sm flex items-center justify-center gap-1.5"
                            >
                                <Plus size={12} /> Añadir Comportamiento
                            </button>
                            
                            {/* List of active behaviors */}
                            {(() => {
                                const objectBehaviors = selectedObject.behaviors || [];
                                if (objectBehaviors.length === 0) {
                                    return (
                                        <div className="flex flex-col items-center justify-center py-6 border border-dashed border-[#333333] rounded bg-[#181818]">
                                            <Cpu size={20} className="text-gray-700 mb-2" />
                                            <span className="text-[10px] text-gray-600 font-medium uppercase tracking-widest">Sin Comportamientos</span>
                                        </div>
                                    );
                                }
                                
                                return (
                                    <div className="space-y-2">
                                        {objectBehaviors.map(behavior => {
                                            const bKey = getBehaviorKey(behavior.name);
                                            const bLabel = t(`behavior.${bKey}`) || behavior.name;
                                            const isExpanded = expandedBehaviors.has(behavior.name);
                                            const propertiesKeys = Object.keys(behavior.properties || {});
                                            
                                            return (
                                                <div key={behavior.name} className="border border-[#333333] rounded bg-[#1c1c1c]/40 overflow-hidden">
                                                    <div 
                                                        onClick={() => toggleBehaviorExpand(behavior.name)}
                                                        className="flex items-center justify-between p-2 bg-[#202020] hover:bg-[#252525] cursor-pointer transition-colors"
                                                    >
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            {isExpanded ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
                                                            <Zap size={10} className="text-indigo-400 shrink-0" />
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-200 truncate">{bLabel}</span>
                                                        </div>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newBehaviors = objectBehaviors.filter(b => b.name !== behavior.name);
                                                                handleUpdate({ behaviors: newBehaviors });
                                                            }}
                                                            className="p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                            title="Eliminar comportamiento"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                    
                                                    {isExpanded && (
                                                        <div className="p-2 border-t border-[#1c1c1c] bg-[#141414]/60 space-y-2.5">
                                                            {propertiesKeys.length === 0 ? (
                                                                <div className="text-[9px] text-gray-500 italic p-1">No tiene propiedades ajustables.</div>
                                                            ) : (
                                                                propertiesKeys.map(propKey => {
                                                                    const val = behavior.properties[propKey];
                                                                    const isAnimSelectKey = ['idleAnimId', 'runAnimId', 'jumpAnimId', 'attackAnimId'].includes(propKey);
                                                                    return (
                                                                        <PropertyRow key={propKey} label={propKey === 'idleAnimId' ? 'Animación Reposo' : propKey === 'runAnimId' ? 'Animación Correr' : propKey === 'jumpAnimId' ? 'Animación Saltar' : propKey === 'attackAnimId' ? 'Animación Atacar' : propKey}>
                                                                            {isAnimSelectKey ? (
                                                                                <select
                                                                                    value={val ?? ''}
                                                                                    onChange={(e) => handleUpdateBehaviorProperty(behavior.name, propKey, e.target.value)}
                                                                                    className="w-full bg-[#161616] border border-[#2a2a2a] hover:border-[#444444] focus:border-indigo-500 rounded px-1.5 py-1 text-[10px] font-semibold text-gray-200 focus:outline-none"
                                                                                >
                                                                                    <option value="">-- Ninguna --</option>
                                                                                    {(projectData?.animations ?? []).map(a => (
                                                                                        <option key={a.id} value={a.id}>{a.name}</option>
                                                                                    ))}
                                                                                </select>
                                                                            ) : typeof val === 'boolean' ? (
                                                                                <button 
                                                                                    onClick={() => handleUpdateBehaviorProperty(behavior.name, propKey, !val)}
                                                                                    className={`w-full py-0.5 text-[10px] font-bold rounded border transition-colors ${val ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#2a2a2a] border-[#333333] text-gray-500'}`}
                                                                                >
                                                                                    {val ? 'SÍ' : 'NO'}
                                                                                </button>
                                                                            ) : (
                                                                                <CompactInput 
                                                                                    type={typeof val === 'number' ? 'number' : 'text'}
                                                                                    value={val ?? ''}
                                                                                    onChange={(newVal) => handleUpdateBehaviorProperty(behavior.name, propKey, newVal)}
                                                                                />
                                                                            )}
                                                                        </PropertyRow>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}

            {/* Object Variables */}
            <SectionHeader 
                title={t('properties.objectVariables') || 'Variables del Objeto'} 
                icon={<Database size={14} />} 
                isOpen={openSections.has('objectVariables')}
                onToggle={() => toggleSection('objectVariables')}
                action={
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            const currentVars = selectedObject.variables || [];
                            const newVar: Variable = {
                                name: `variable_${currentVars.length + 1}`,
                                value: 0
                            };
                            handleUpdate({ variables: [...currentVars, newVar] });
                        }}
                        className="p-1 hover:bg-white/10 rounded text-indigo-400 font-bold"
                        title={t('properties.addVariable') || 'Añadir Variable'}
                    >
                        <Plus size={14} />
                    </button>
                }
            />
            {openSections.has('objectVariables') && (
                <div className="bg-[#1a1a1a]/40 p-3 space-y-2">
                    {(!selectedObject.variables || selectedObject.variables.length === 0) ? (
                        <div className="text-[10px] text-gray-500 italic text-center py-4 bg-[#151515]/60 rounded border border-dashed border-[#333333]">
                            {t('properties.noVariables') || 'No hay variables de objeto definidas.'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {(selectedObject.variables || []).map((v, index) => {
                                const handleDelete = () => {
                                    const nextVars = (selectedObject.variables || []).filter((_, i) => i !== index);
                                    handleUpdate({ variables: nextVars });
                                };
                                const handleNameChange = (newName: string) => {
                                    const nextVars = (selectedObject.variables || []).map((item, i) => 
                                        i === index ? { ...item, name: newName } : item
                                    );
                                    handleUpdate({ variables: nextVars });
                                };
                                const handleValueChange = (newVal: string | number) => {
                                    const nextVars = (selectedObject.variables || []).map((item, i) => 
                                        i === index ? { ...item, value: newVal } : item
                                    );
                                    handleUpdate({ variables: nextVars });
                                };

                                return (
                                    <div key={index} className="flex flex-col gap-1.5 p-2 rounded bg-[#1c1c1c]/40 border border-[#333333]">
                                        <div className="flex items-center gap-1.5 justify-between">
                                            <input 
                                                type="text"
                                                value={v.name}
                                                onChange={(e) => handleNameChange(e.target.value)}
                                                className="bg-[#161616] border border-transparent hover:border-[#444444] focus:border-indigo-500 rounded px-1.5 py-0.5 text-[10px] font-bold font-mono text-indigo-300 w-2/3 focus:outline-none"
                                                placeholder={t('properties.variableName') || 'Nombre'}
                                            />
                                            <button 
                                                onClick={handleDelete}
                                                className="p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                title="Eliminar variable"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider pl-1.5 mr-1">Valor</span>
                                            <div className="flex-grow">
                                                <CompactInput 
                                                    type={typeof v.value === 'number' ? 'number' : 'text'}
                                                    value={typeof v.value === 'boolean' ? String(v.value) : (v.value as string | number ?? '')}
                                                    onChange={handleValueChange}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <button 
                        onClick={() => {
                            const currentVars = selectedObject.variables || [];
                            const newVar: Variable = {
                                name: `variable_${currentVars.length + 1}`,
                                value: 0
                            };
                            handleUpdate({ variables: [...currentVars, newVar] });
                        }}
                        className="w-full py-1.5 border border-[#333333] hover:border-indigo-500 rounded text-[10px] uppercase font-bold text-gray-400 hover:text-indigo-400 text-center transition-all bg-[#2a2a2a]/40"
                    >
                        + {t('properties.addVariable') || 'Añadir Variable'}
                    </button>
                </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Scene */}
            <SectionHeader 
                title="Propiedades Escena" 
                icon={<Grid size={14} />} 
                isOpen={openSections.has('scene')}
                onToggle={() => toggleSection('scene')}
            />
            {openSections.has('scene') && activeScene && (
                <div className="bg-[#1a1a1a]/40 pb-1">
                    <PropertyRow label="Nombre">
                        <CompactInput value={activeScene.name} onChange={val => onUpdateScene({ name: val as string })} />
                    </PropertyRow>
                    <PropertyRow label="Color Fondo">
                        <div className="flex items-center gap-2">
                            <input 
                                type="color" 
                                value={activeScene.backgroundColor} 
                                onChange={e => onUpdateScene({ backgroundColor: e.target.value })}
                                className="w-8 h-5 rounded border border-[#333333] bg-transparent cursor-pointer"
                            />
                            <CompactInput value={activeScene.backgroundColor} onChange={val => onUpdateScene({ backgroundColor: val as string })} />
                        </div>
                    </PropertyRow>
                </div>
            )}

            {/* 3D Camera Configuration */}
            <SectionHeader 
                title="Cámara 3D" 
                icon={<Settings size={14} className="text-pink-400" />} 
                isOpen={openSections.has('camera3D')}
                onToggle={() => toggleSection('camera3D')}
            />
            {openSections.has('camera3D') && activeScene && (
                <div className="bg-[#1a1a1a]/40 p-3 space-y-3">
                    <PropertyRow label="Modo Cámara">
                        <select 
                            value={activeScene.camera3DMode || 'top-down'} 
                            onChange={e => onUpdateScene({ camera3DMode: e.target.value })}
                            className="w-full bg-[#1a1a1a] border border-[#2b2b2b] rounded px-1.5 py-1 text-[10px] text-gray-200 focus:outline-none"
                        >
                            <option value="top-down">Cenital (Top-Down)</option>
                            <option value="look-down">Picado (Inclinado)</option>
                            <option value="front">Frente (Frontal)</option>
                            <option value="below">Contrapicado (Desde Abajo)</option>
                            <option value="custom">Manual (OrbitControls)</option>
                        </select>
                    </PropertyRow>
                    <PropertyRow label="Seguir Objeto">
                        <select 
                            value={activeScene.camera3DTargetId || ''} 
                            onChange={e => onUpdateScene({ camera3DTargetId: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="w-full bg-[#1a1a1a] border border-[#2b2b2b] rounded px-1.5 py-1 text-[10px] text-gray-200 focus:outline-none"
                        >
                            <option value="">Ninguno (Estática)</option>
                            {activeScene.gameObjects.map(obj => (
                                <option key={obj.id} value={obj.id}>{obj.name}</option>
                            ))}
                        </select>
                    </PropertyRow>
                    <PropertyRow label="Offset Cámara">
                        <div className="flex gap-1 py-1">
                            <div className="flex items-center gap-0.5 flex-1">
                                <span className="text-[9px] text-red-500 font-bold">X</span>
                                <CompactInput 
                                    type="number" 
                                    value={activeScene.camera3DOffset?.x ?? 0} 
                                    onChange={val => onUpdateScene({ camera3DOffset: { ...(activeScene.camera3DOffset || { x:0, y:5, z:10 }), x: val as number } })} 
                                />
                            </div>
                            <div className="flex items-center gap-0.5 flex-1">
                                <span className="text-[9px] text-green-500 font-bold">Y</span>
                                <CompactInput 
                                    type="number" 
                                    value={activeScene.camera3DOffset?.y ?? 5} 
                                    onChange={val => onUpdateScene({ camera3DOffset: { ...(activeScene.camera3DOffset || { x:0, y:5, z:10 }), y: val as number } })} 
                                />
                            </div>
                            <div className="flex items-center gap-0.5 flex-1">
                                <span className="text-[9px] text-blue-500 font-bold">Z</span>
                                <CompactInput 
                                    type="number" 
                                    value={activeScene.camera3DOffset?.z ?? 10} 
                                    onChange={val => onUpdateScene({ camera3DOffset: { ...(activeScene.camera3DOffset || { x:0, y:5, z:10 }), z: val as number } })} 
                                />
                            </div>
                        </div>
                    </PropertyRow>
                </div>
            )}

            {/* Global Settings */}
            <SectionHeader 
                title="Configuración Proyecto" 
                icon={<Settings size={14} />} 
                isOpen={openSections.has('settings')}
                onToggle={() => toggleSection('settings')}
            />
            {openSections.has('settings') && (
                <div className="bg-[#1a1a1a]/40 pb-1">
                    <PropertyRow label="Ancho">
                        <CompactInput type="number" value={projectData.gameWidth} onChange={val => onUpdateProjectData({ gameWidth: val as number })} />
                    </PropertyRow>
                    <PropertyRow label="Alto">
                        <CompactInput type="number" value={projectData.gameHeight} onChange={val => onUpdateProjectData({ gameHeight: val as number })} />
                    </PropertyRow>
                    <PropertyRow label="Resolución">
                        <select 
                            className="w-full bg-[#1a1a1a] border border-transparent rounded px-1.5 py-0.5 text-[11px] text-gray-200 focus:outline-none"
                            onChange={e => {
                                const [w, h] = e.target.value.split('x').map(Number);
                                onUpdateProjectData({ gameWidth: w, gameHeight: h });
                            }}
                        >
                            <option value="1280x720">HD (1280x720)</option>
                            <option value="1920x1080">FHD (1920x1080)</option>
                            <option value="3840x2160">4K Ultra HD (3840x2160)</option>
                            <option value="1024x768">XGA (1024x768)</option>
                            <option value="custom">Custom</option>
                        </select>
                    </PropertyRow>
                    <PropertyRow label="FPS Juego (10-60)">
                        <div className="flex items-center gap-2 w-full">
                            <input 
                                type="range" 
                                min="10" 
                                max="60" 
                                value={projectData.fps || 60} 
                                onChange={e => onUpdateProjectData({ fps: Number(e.target.value) })}
                                className="w-[65%] h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <span className="text-[10px] text-gray-300 font-mono w-[35%] text-right font-bold">
                                {projectData.fps || 60} FPS
                            </span>
                        </div>
                    </PropertyRow>
                    <PropertyRow label="Sprites HD / 4K">
                        <div className="flex flex-col gap-1.5 pt-0.5">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="hd-rendering-chk"
                                    checked={projectData.hdRendering !== false} 
                                    onChange={e => onUpdateProjectData({ hdRendering: e.target.checked })}
                                    className="w-3.5 h-3.5 rounded border-[#333333] bg-[#1a1a1a] text-indigo-600 focus:ring-indigo-500 accent-indigo-500 cursor-pointer"
                                />
                                <label htmlFor="hd-rendering-chk" className="text-[10px] text-gray-400 cursor-pointer select-none">Renderizado HD (Suavizado de texturas)</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="uhd-rendering-chk"
                                    checked={projectData.fourKRendering === true} 
                                    onChange={e => onUpdateProjectData({ fourKRendering: e.target.checked })}
                                    className="w-3.5 h-3.5 rounded border-[#333333] bg-[#1a1a1a] text-indigo-600 focus:ring-indigo-500 accent-indigo-500 cursor-pointer"
                                />
                                <label htmlFor="uhd-rendering-chk" className="text-[10px] text-gray-400 cursor-pointer select-none">Habilitar renderizado supremo 4K UHD</label>
                            </div>
                        </div>
                    </PropertyRow>

                    <div className="border-t border-stone-800/80 my-2 pt-2 px-1">
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block mb-2 px-3">
                            Joystick Virtual Tactil
                        </span>
                        <PropertyRow label="Habilitar Joystick">
                            <button 
                                onClick={() => {
                                    const current = projectData.joystick || { enabled: false, position: 'left' };
                                    onUpdateProjectData({ joystick: { ...current, enabled: !current.enabled } });
                                }}
                                className={`w-full py-1 text-[10px] font-bold rounded m-0.5 border transition-all ${projectData.joystick?.enabled ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#2a2a2a] border-[#333333] text-gray-500'}`}
                            >
                                {projectData.joystick?.enabled ? 'SÍ (HABILITADO)' : 'NO (DESHABILITADO)'}
                            </button>
                        </PropertyRow>
                        {projectData.joystick?.enabled && (
                            <>
                                <PropertyRow label="Posición">
                                    <select 
                                        className="w-full bg-[#1a1a1a] border border-transparent rounded px-1.5 py-0.5 text-[11px] text-gray-200 focus:outline-none"
                                        value={projectData.joystick.position || 'left'}
                                        onChange={e => onUpdateProjectData({ joystick: { ...projectData.joystick, position: e.target.value as 'left' | 'right' } })}
                                    >
                                        <option value="left">Izquierda (Predeterminado)</option>
                                        <option value="right">Derecha</option>
                                    </select>
                                </PropertyRow>
                                <PropertyRow label="Tamaño (px)">
                                    <CompactInput 
                                        type="number" 
                                        value={projectData.joystick.size || 120} 
                                        onChange={v => onUpdateProjectData({ joystick: { ...projectData.joystick, size: Number(v) } })} 
                                    />
                                </PropertyRow>
                                <PropertyRow label="Opacidad Base">
                                    <div className="flex items-center gap-2 w-full">
                                        <input 
                                            type="range" 
                                            min="0.05" 
                                            max="1" 
                                            step="0.05"
                                            value={projectData.joystick.opacity ?? 0.1} 
                                            onChange={e => onUpdateProjectData({ joystick: { ...projectData.joystick, opacity: Number(e.target.value) } })}
                                            className="w-[65%] h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                        <span className="text-[10px] text-gray-300 font-mono w-[35%] text-right font-bold">
                                            {Math.round((projectData.joystick.opacity ?? 0.1) * 100)}%
                                        </span>
                                    </div>
                                </PropertyRow>
                                <PropertyRow label="Imagen Base">
                                    <select 
                                        className="w-full bg-[#1a1a1a] border border-transparent rounded px-1.5 py-0.5 text-[11px] text-gray-200 focus:outline-none font-mono"
                                        value={projectData.joystick.backgroundImageUrl || ''}
                                        onChange={e => onUpdateProjectData({ joystick: { ...projectData.joystick, backgroundImageUrl: e.target.value } })}
                                    >
                                        <option value="">Sin imagen (Color sólido)</option>
                                        {projectData.assets?.filter(a => a.type === 'image').map(asset => (
                                            <option key={asset.id} value={asset.url}>{asset.name}</option>
                                        ))}
                                    </select>
                                </PropertyRow>
                                <PropertyRow label="Imagen Knob">
                                    <select 
                                        className="w-full bg-[#1a1a1a] border border-transparent rounded px-1.5 py-0.5 text-[11px] text-gray-200 focus:outline-none font-mono"
                                        value={projectData.joystick.handleImageUrl || ''}
                                        onChange={e => onUpdateProjectData({ joystick: { ...projectData.joystick, handleImageUrl: e.target.value } })}
                                    >
                                        <option value="">Sin imagen (Color sólido)</option>
                                        {projectData.assets?.filter(a => a.type === 'image').map(asset => (
                                            <option key={asset.id} value={asset.url}>{asset.name}</option>
                                        ))}
                                    </select>
                                </PropertyRow>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Global Variables */}
            <SectionHeader 
                title={t('properties.variables') || 'Variables Globales'} 
                icon={<Database size={14} />} 
                isOpen={openSections.has('globalVariables')}
                onToggle={() => toggleSection('globalVariables')}
                action={
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            const currentVars = projectData.globalVariables || [];
                            const newVar: Variable = {
                                name: `variable_${currentVars.length + 1}`,
                                value: 0
                            };
                            onUpdateProjectData({ globalVariables: [...currentVars, newVar] });
                        }}
                        className="p-1 hover:bg-white/10 rounded text-indigo-400 font-bold"
                        title={t('properties.addVariable') || 'Añadir Variable'}
                    >
                        <Plus size={14} />
                    </button>
                }
            />
            {openSections.has('globalVariables') && (
                <div className="bg-[#1a1a1a]/40 p-3 space-y-2">
                    {(!projectData.globalVariables || projectData.globalVariables.length === 0) ? (
                        <div className="text-[10px] text-gray-500 italic text-center py-4 bg-[#151515]/60 rounded border border-dashed border-[#333333]">
                            {t('properties.noVariables') || 'No hay variables globales definidas.'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {(projectData.globalVariables || []).map((v, index) => {
                                const handleDelete = () => {
                                    const nextVars = (projectData.globalVariables || []).filter((_, i) => i !== index);
                                    onUpdateProjectData({ globalVariables: nextVars });
                                };
                                const handleNameChange = (newName: string) => {
                                    const nextVars = (projectData.globalVariables || []).map((item, i) => 
                                        i === index ? { ...item, name: newName } : item
                                    );
                                    onUpdateProjectData({ globalVariables: nextVars });
                                };
                                const handleValueChange = (newVal: string | number) => {
                                    const nextVars = (projectData.globalVariables || []).map((item, i) => 
                                        i === index ? { ...item, value: newVal } : item
                                    );
                                    onUpdateProjectData({ globalVariables: nextVars });
                                };

                                return (
                                    <div key={index} className="flex flex-col gap-1.5 p-2 rounded bg-[#1c1c1c]/40 border border-[#333333]">
                                        <div className="flex items-center gap-1.5 justify-between">
                                            <input 
                                                type="text"
                                                value={v.name}
                                                onChange={(e) => handleNameChange(e.target.value)}
                                                className="bg-[#161616] border border-transparent hover:border-[#444444] focus:border-indigo-500 rounded px-1.5 py-0.5 text-[10px] font-bold font-mono text-indigo-300 w-2/3 focus:outline-none"
                                                placeholder={t('properties.variableName') || 'Nombre'}
                                            />
                                            <button 
                                                onClick={handleDelete}
                                                className="p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                title="Eliminar variable"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider pl-1.5 mr-1">Valor</span>
                                            <div className="flex-grow">
                                                <CompactInput 
                                                    type={typeof v.value === 'number' ? 'number' : 'text'}
                                                    value={typeof v.value === 'boolean' ? String(v.value) : (v.value as string | number ?? '')}
                                                    onChange={handleValueChange}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <button 
                        onClick={() => {
                            const currentVars = projectData.globalVariables || [];
                            const newVar: Variable = {
                                name: `variable_${currentVars.length + 1}`,
                                value: 0
                            };
                            onUpdateProjectData({ globalVariables: [...currentVars, newVar] });
                        }}
                        className="w-full py-1.5 border border-[#333333] hover:border-indigo-500 rounded text-[10px] uppercase font-bold text-gray-400 hover:text-indigo-400 text-center transition-all bg-[#2a2a2a]/40"
                    >
                        + {t('properties.addVariable') || 'Añadir Variable'}
                    </button>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="h-8 px-3 border-t border-[#333333] flex items-center justify-between bg-[#1a1a1a]">
         <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">GPU VULKAN OK</span>
         </div>
         <div className="flex gap-3">
            <button className="text-gray-600 hover:text-white transition-colors"><Lock size={12} /></button>
            <button className="text-gray-600 hover:text-white transition-colors"><Save size={12} /></button>
         </div>
      </div>
    </div>
  );
};

export default PropertiesInspector;
