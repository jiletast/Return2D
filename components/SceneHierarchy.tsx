import React, { useState, useRef } from 'react';
import type { GameObject, Scene, GameAsset } from '../types';
import { 
  Box, 
  FolderOpen, 
  Plus, 
  Copy, 
  Trash2,
  ChevronRight, 
  ChevronDown, 
  Image as ImageIcon, 
  Music, 
  Video, 
  Layers,
  Settings,
  MoreVertical,
  Search,
  Eye,
  EyeOff,
  Lock,
  Cpu
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { compressImageBase64, compressAudioBase64, compressVideoBase64 } from '../services/exportService';

const ObjectTreeItem: React.FC<{ 
    obj: GameObject, 
    level: number, 
    selectedId: number | null, 
    onSelect: (id: number) => void,
    onSetParent: (childId: number, parentId: number | null) => void,
    hasChildren: boolean,
    isExpanded: boolean,
    onToggleExpand: (id: number) => void,
    onUpdateObject: (id: number, updates: Partial<GameObject>) => void
}> = ({ obj, level, selectedId, onSelect, onSetParent, hasChildren, isExpanded, onToggleExpand, onUpdateObject }) => {
    
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/game-object-id', obj.id.toString());
        e.dataTransfer.effectAllowed = 'move';
        e.stopPropagation();
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const childId = parseInt(e.dataTransfer.getData('application/game-object-id'), 10);
        if (childId && childId !== obj.id) {
            onSetParent(childId, obj.id);
        }
    };

    return (
        <div
            onClick={(e) => { e.stopPropagation(); onSelect(obj.id); }}
            draggable={true}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`group flex items-center h-7 px-1 cursor-pointer select-none transition-colors border-l-2 ${
                selectedId === obj.id
                    ? 'bg-indigo-600/30 border-indigo-500 text-white'
                    : 'hover:bg-white/5 border-transparent text-gray-400'
            }`}
            style={{ paddingLeft: `${(level * 12) + 4}px` }}
        >
            <div className="w-4 flex items-center justify-center shrink-0">
                {hasChildren && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggleExpand(obj.id); }}
                        className="hover:text-white"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                )}
            </div>
            
            <div className="w-5 h-5 flex items-center justify-center shrink-0 mx-1">
                {obj.imageUrl ? (
                    <img src={obj.imageUrl} className="w-4 h-4 object-contain rounded-sm" alt="" />
                ) : obj.isUI ? (
                    <Layers size={14} className="text-teal-400" />
                ) : (
                    <Box size={14} className={obj.color === 'transparent' ? 'text-gray-600' : 'text-indigo-400'} />
                )}
            </div>

            <span className="text-[11px] font-medium truncate flex-grow mr-2">{obj.name}</span>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 pr-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateObject(obj.id, { visible: obj.visible === false }); }}
                    className={`p-1 hover:text-white ${obj.visible === false ? 'text-indigo-400' : 'text-gray-600'}`}
                >
                    {obj.visible === false ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                <MoreVertical size={12} className="text-gray-600" />
            </div>
        </div>
    );
};

interface SceneHierarchyProps {
  scenes: Scene[];
  activeSceneId: string | null;
  onSelectScene: (id: string) => void;
  onAddScene: () => void;
  onCloneScene?: (id: string) => void;
  onDeleteScene?: (id: string) => void;
  objects: GameObject[];
  globalObjects?: GameObject[];
  onAddObject: (props?: Partial<GameObject>) => void;
  onDeleteGlobalObject?: (name: string) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onUpdateObject: (id: number, updates: Partial<GameObject>) => void;
  assets: GameAsset[];
  onAddAsset: (asset: GameAsset) => void;
  onUpdateAsset: (asset: GameAsset) => void;
  onOpenAnimationEditor: () => void;
  onOpenSpriteEditor: (assetId: string | null) => void;
  onOpenAudioLab: () => void;
  onOpenSoundtrackEditor: () => void;
  width: number;
  onToggleCollapse: () => void;
}

const ObjectTree: React.FC<{
    objects: GameObject[],
    parentId: number | null,
    selectedId: number | null,
    onSelect: (id: number) => void,
    onSetParent: (childId: number, parentId: number | null) => void,
    onUpdateObject: (id: number, updates: Partial<GameObject>) => void,
    level: number,
    expandedIds: Set<number>,
    onToggleExpand: (id: number) => void
}> = ({ objects, parentId, selectedId, onSelect, onSetParent, onUpdateObject, level, expandedIds, onToggleExpand }) => {
    const children = objects.filter(o => (o.parentId || null) === parentId);
    if (children.length === 0) return null;

    return (
        <div>
            {children.map(obj => {
                const hasChildren = objects.some(o => o.parentId === obj.id);
                const isExpanded = expandedIds.has(obj.id);
                return (
                    <React.Fragment key={obj.id}>
                        <ObjectTreeItem 
                            obj={obj} 
                            level={level} 
                            selectedId={selectedId} 
                            onSelect={onSelect} 
                            onSetParent={onSetParent}
                            hasChildren={hasChildren}
                            isExpanded={isExpanded}
                            onToggleExpand={onToggleExpand}
                            onUpdateObject={onUpdateObject}
                        />
                        {isExpanded && (
                            <ObjectTree 
                                objects={objects}
                                parentId={obj.id}
                                selectedId={selectedId}
                                onSelect={onSelect}
                                onSetParent={onSetParent}
                                onUpdateObject={onUpdateObject}
                                level={level + 1}
                                expandedIds={expandedIds}
                                onToggleExpand={onToggleExpand}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

interface SceneHierarchyProps {
  scenes: Scene[];
  activeSceneId: string | null;
  onSelectScene: (id: string) => void;
  onAddScene: () => void;
  onCloneScene?: (id: string) => void;
  onDeleteScene?: (id: string) => void;
  objects: GameObject[];
  globalObjects?: GameObject[];
  onAddObject: (props?: Partial<GameObject>) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onUpdateObject: (id: number, updates: Partial<GameObject>) => void;
  assets: GameAsset[];
  onAddAsset: (asset: GameAsset) => void;
  onUpdateAsset: (asset: GameAsset) => void;
  onOpenAnimationEditor: () => void;
  onOpenSpriteEditor: (assetId: string | null) => void;
  onOpenAudioLab: () => void;
  onOpenSoundtrackEditor: () => void;
  width: number;
  onToggleCollapse: () => void;
  onOpenPoseAnimationEditor?: () => void;
  projectData?: any;
  onUpdateProjectData?: (updates: any) => void;
}

const SceneHierarchy: React.FC<SceneHierarchyProps> = ({ 
    scenes, activeSceneId, onSelectScene, onAddScene, onCloneScene, onDeleteScene,
    objects, globalObjects = [], onAddObject, 
    selectedId, onSelect, onUpdateObject, 
    assets, onAddAsset, onOpenAnimationEditor, onOpenPoseAnimationEditor, onOpenSpriteEditor, onOpenAudioLab, onOpenSoundtrackEditor, 
    width, onToggleCollapse, projectData, onUpdateProjectData
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'scene' | 'project'>('scene');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [showAssetsSection, setShowAssetsSection] = useState(true);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
  };

  const handleSetParent = (childId: number, newParentId: number | null) => {
    // Logic moved to App.tsx in my previous thought but let's implement it here if needed or just call prop
    onUpdateObject(childId, { parentId: newParentId });
  };

  if (width <= 32) {
      return (
          <div className="flex flex-col items-center py-4 gap-4">
              <button onClick={onToggleCollapse} className="text-gray-500 hover:text-white transition-colors"><ChevronRight size={20} /></button>
              <div className="h-[1px] w-4 bg-white/10" />
              <button onClick={() => setActiveTab('scene')} className={`p-2 rounded ${activeTab === 'scene' ? 'text-indigo-400 bg-indigo-400/10' : 'text-gray-500 hover:text-white'}`}><Layers size={18} /></button>
              <button onClick={() => setActiveTab('project')} className={`p-2 rounded ${activeTab === 'project' ? 'text-indigo-400 bg-indigo-400/10' : 'text-gray-500 hover:text-white'}`}><FolderOpen size={18} /></button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-[#202020]">
      {/* Search / Filter */}
      <div className="p-2 border-b border-[#333333]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
          <input 
            type="text" 
            placeholder="Filtrar..." 
            className="w-full pl-7 pr-2 py-1 bg-[#151515] border border-[#333333] rounded text-[11px] focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#1a1a1a] border-b border-[#333333]">
        <button 
            onClick={() => setActiveTab('scene')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'scene' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
            <Layers size={12} />
            Escena
        </button>
        <button 
            onClick={() => setActiveTab('project')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'project' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
            <FolderOpen size={12} />
            Proyecto
        </button>
      </div>

      <div className="flex-grow overflow-y-auto overflow-x-hidden custom-scrollbar">
        {activeTab === 'scene' ? (
          <div className="py-2">
             <div className="px-2 mb-2">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Escenas</span>
                    <button onClick={onAddScene} className="p-1 hover:bg-emerald-600/30 border border-transparent hover:border-emerald-500 rounded text-gray-400 hover:text-white transition-all flex items-center justify-center" title="Añadir Escena"><Plus size={14} /></button>
                </div>
                <div className="space-y-0.5 bg-[#161616] p-1.5 rounded border border-[#232323] max-h-36 overflow-y-auto custom-scrollbar">
                    {scenes.map(s => (
                        <div 
                            key={s.id} 
                            onClick={() => onSelectScene(s.id)}
                            className={`flex items-center justify-between px-2 py-1 rounded text-[11px] cursor-pointer group transition-all ${activeSceneId === s.id ? 'bg-indigo-600/90 text-white font-bold shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                        >
                            <span className="truncate max-w-[140px]">{s.name}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onCloneScene) onCloneScene(s.id);
                                    }}
                                    className="p-0.5 hover:bg-white/20 rounded text-gray-300 hover:text-white transition-all"
                                    title="Clonar Escena"
                                >
                                    <Copy size={11} />
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onDeleteScene) onDeleteScene(s.id);
                                    }}
                                    className="p-0.5 hover:bg-rose-600/30 rounded text-rose-400 hover:text-rose-200 transition-all"
                                    title="Eliminar Escena"
                                >
                                    <Trash2 size={11} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
             </div>

             {/* Atajos de Creación */}
             <div className="px-2 mt-4">
                 <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest block mb-1.5">Atajos de Creación</span>
                 <div className="grid grid-cols-2 gap-1 bg-[#1a1a1a]/30 p-1.5 rounded border border-[#232323]">
                     <button 
                         onClick={() => onAddObject({
                             name: 'Jugador 2D',
                             width: 35,
                             height: 50,
                             color: '#6366f1',
                             zIndex: 10,
                             behaviors: [
                                 { name: 'PlatformerCharacter', properties: { speed: 175, jumpForce: 380, gravity: 600 } },
                                 { name: 'FollowCamera', properties: {} },
                                 { name: 'Health', properties: { hp: 100, maxHp: 100 } }
                             ],
                             stats: { hp: 100, maxHp: 100, attack: 10 }
                         })}
                         className="flex items-center gap-1 justify-start text-[9px] text-gray-300 hover:text-white bg-[#222222] hover:bg-indigo-600/30 border border-[#333333] hover:border-indigo-500 rounded p-1 transition-all text-left"
                         title="Añadir Jugador de Plataformas 2D con salud y cámara"
                     >
                         👾 Jugador 2D
                     </button>
                     <button 
                         onClick={() => onAddObject({
                             name: 'Jugador TopDown',
                             width: 32,
                             height: 32,
                             color: '#38bdf8',
                             zIndex: 10,
                             behaviors: [
                                 { name: 'TopDownRPGMovement', properties: { speed: 140 } },
                                 { name: 'FollowCamera', properties: {} },
                                 { name: 'Health', properties: { hp: 100, maxHp: 100 } }
                             ],
                             stats: { hp: 100, maxHp: 100, attack: 10 }
                         })}
                         className="flex items-center gap-1 justify-start text-[9px] text-gray-300 hover:text-white bg-[#222222] hover:bg-sky-600/30 border border-[#333333] hover:border-sky-500 rounded p-1 transition-all text-left"
                         title="Añadir Jugador con movimiento RPG de 4 direcciones, salud y cámara"
                     >
                         🏃‍♂️ Jugador RPG
                     </button>
                     <button 
                         onClick={() => onAddObject({
                             name: 'Moneda',
                             width: 18,
                             height: 18,
                             color: '#eab308',
                             zIndex: 4,
                             isTouchable: true,
                             scripts: [
                                 {
                                     id: `coin_col_${Date.now()}`,
                                     trigger: 'OnCollisionWith',
                                     params: { targetObjectName: 'Jugador 2D' },
                                     actions: [
                                         { object: 'System', action: 'AddToVariable', params: { variable: 'score', value: 10 } },
                                         { object: 'Self', action: 'Destroy', params: {} }
                                     ]
                                 }
                             ]
                         })}
                         className="flex items-center gap-1 justify-start text-[9px] text-gray-300 hover:text-white bg-[#222222] hover:bg-yellow-600/30 border border-[#333333] hover:border-yellow-500 rounded p-1 transition-all text-left"
                         title="Añadir Moneda coleccionable que suma +10 score y se destruye"
                     >
                         🪙 Moneda (+10)
                     </button>
                     <button 
                         onClick={() => onAddObject({
                             name: 'Enemigo Plataformas',
                             width: 32,
                             height: 32,
                             color: '#ef4444',
                             zIndex: 5,
                             behaviors: [
                                 { name: 'Patrol', properties: { speed: 60, range: 120 } },
                                 { name: 'Physics', properties: { gravity: 600 } }
                             ],
                             scripts: [
                                 {
                                     id: `en_plat_hit_${Date.now()}`,
                                     trigger: 'OnCollisionWith',
                                     params: { targetObjectName: 'Jugador 2D' },
                                     actions: [
                                         { object: 'Jugador 2D', action: 'ModifyStat', params: { stat: 'hp', operation: 'subtract', value: 20 } },
                                         { object: 'Jugador 2D', action: 'Knockback', params: { force: 280, fromObjectName: 'Self' } }
                                     ]
                                 }
                             ]
                         })}
                         className="flex items-center gap-1 justify-start text-[9px] text-gray-300 hover:text-white bg-[#222222] hover:bg-red-600/30 border border-[#333333] hover:border-red-500 rounded p-1 transition-all text-left"
                         title="Añadir Enemigo de plataformas"
                     >
                         👹 Enemigo Plat
                     </button>
                     <button 
                         onClick={() => onAddObject({
                             name: 'Enemigo TopDown',
                             width: 32,
                             height: 32,
                             color: '#dc2626',
                             zIndex: 5,
                             behaviors: [
                                 { name: 'Patrol', properties: { speed: 50, range: 100 } }
                             ],
                             scripts: [
                                 {
                                     id: `en_td_hit_${Date.now()}`,
                                     trigger: 'OnCollisionWith',
                                     params: { targetObjectName: 'Jugador TopDown' },
                                     actions: [
                                         { object: 'Jugador TopDown', action: 'ModifyStat', params: { stat: 'hp', operation: 'subtract', value: 15 } },
                                         { object: 'Jugador TopDown', action: 'Knockback', params: { force: 240, fromObjectName: 'Self' } }
                                     ]
                                 }
                             ]
                         })}
                         className="flex items-center gap-1 justify-start text-[9px] text-gray-300 hover:text-white bg-[#222222] hover:bg-red-700/30 border border-[#333333] hover:border-red-600 rounded p-1 transition-all text-left"
                         title="Añadir Enemigo patrullero RPG"
                     >
                         💀 Enemigo RPG
                     </button>
                     <button 
                         onClick={() => onAddObject({
                             name: 'Boton Salto',
                             width: 60,
                             height: 40,
                             x: 50,
                             y: 200,
                             color: 'rgba(99, 102, 241, 0.4)',
                             zIndex: 100,
                             isUI: true,
                             text: 'SALTO',
                             controlAction: 'jump'
                         })}
                         className="flex items-center gap-1 justify-start text-[9px] text-gray-300 hover:text-white bg-[#222222] hover:bg-indigo-600/30 border border-[#333333] hover:border-indigo-500 rounded p-1 transition-all text-left"
                         title="Añadir Botón táctil en pantalla mapeado a la acción Salto"
                     >
                         ⬆️ Botón Salto
                     </button>
                     <button 
                         onClick={() => onAddObject({
                             name: 'Boton Correr',
                             width: 60,
                             height: 40,
                             x: 120,
                             y: 200,
                             color: 'rgba(234, 179, 8, 0.4)',
                             zIndex: 100,
                             isUI: true,
                             text: 'RUN',
                             controlAction: 'run'
                         })}
                         className="flex items-center gap-1 justify-start text-[9px] text-gray-300 hover:text-white bg-[#222222] hover:bg-yellow-600/30 border border-[#333333] hover:border-yellow-500 rounded p-1 transition-all text-left"
                         title="Añadir Botón táctil en pantalla mapeado a la acción Correr (doble velocidad)"
                     >
                         ⚡ Botón Correr
                      </button>
                      <button 
                          onClick={() => onAddObject({
                              name: 'Tienda Skins',
                              width: 80,
                              height: 30,
                              x: 20,
                              y: 80,
                              color: 'rgba(34, 197, 94, 0.8)',
                              zIndex: 100,
                              isUI: true,
                              text: 'TIENDA',
                              scripts: [
                                  {
                                      id: `shop_btn_${Date.now()}`,
                                      trigger: 'OnClick',
                                      actions: [
                                          { object: 'System', action: 'AddToVariable', params: { variable: 'coins', value: 100 } }
                                      ]
                                  }
                              ]
                          })}
                          className="flex items-center gap-1 justify-start text-[9px] text-gray-300 hover:text-white bg-[#222222] hover:bg-green-600/30 border border-[#333333] hover:border-green-500 rounded p-1 transition-all text-left"
                          title="Añadir Botón para skins y monedas"
                      >
                          🛒 Tienda/Skins
                      </button>
                      <button 
                          onClick={() => onAddObject({
                              name: 'Barra de Salud',
                              width: 155,
                              height: 38,
                              x: 20,
                              y: 20,
                              color: 'rgba(15, 23, 42, 0.85)',
                              zIndex: 100,
                              isUI: true,
                              isHealthBar: true,
                              healthBarTarget: 'Jugador TopDown'
                          })}
                          className="flex items-center gap-1 justify-start text-[9px] text-gray-300 hover:text-white bg-[#222222] hover:bg-emerald-600/30 border border-[#333333] hover:border-emerald-500 rounded p-1 transition-all text-left"
                          title="Añadir Barra de Salud en pantalla vinculada al jugador"
                      >
                          ❤️ Barra Salud
                     </button>
                 </div>
             </div>

             <div className="mt-4">
                <div className="px-3 mb-1 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Nodos</span>
                    <button onClick={() => onAddObject()} className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white"><Plus size={14} /></button>
                </div>
                <div 
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                    onDrop={(e) => {
                        e.preventDefault();
                        const childId = parseInt(e.dataTransfer.getData('application/game-object-id'), 10);
                        if (childId) handleSetParent(childId, null);
                    }}
                    className="min-h-[100px]"
                >
                    <ObjectTree 
                        objects={objects}
                        parentId={null}
                        selectedId={selectedId}
                        onSelect={onSelect}
                        onSetParent={handleSetParent}
                        onUpdateObject={onUpdateObject}
                        level={0}
                        expandedIds={expandedIds}
                        onToggleExpand={toggleExpand}
                    />
                </div>
             </div>
          </div>
        ) : (
          <div className="p-2 space-y-4">
             <div>
                <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest block">Nodos Globales (Plantillas)</span>
                    <button 
                        onClick={() => {
                            const name = prompt("Nombre del nodo plantilla:");
                            if (name && onUpdateProjectData && projectData) {
                                const newNode = {
                                    id: Date.now(),
                                    name: name,
                                    width: 50,
                                    height: 50,
                                    x: 0,
                                    y: 0,
                                    color: '#6366f1',
                                    zIndex: 1,
                                };
                                onUpdateProjectData({ globalObjects: [...(projectData.globalObjects || []), newNode] });
                            }
                        }}
                        className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white"
                        title="Nuevo Nodo Plantilla"
                    >
                        <Plus size={14} />
                    </button>
                </div>
                <div 
                    className="space-y-1 mb-4 min-h-[40px] p-1 border border-dashed border-[#333] rounded"
                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                    onDrop={e => {
                        e.preventDefault();
                        const objIdStr = e.dataTransfer.getData('application/game-object-id');
                        if (objIdStr && projectData && onUpdateProjectData) {
                            const objId = parseInt(objIdStr, 10);
                            const obj = objects.find(o => o.id === objId);
                            if (obj) {
                                const newGlobal = { ...obj, id: Date.now() };
                                onUpdateProjectData({ globalObjects: [...(projectData.globalObjects || []), newGlobal] });
                            }
                        }
                    }}
                >
                    {(projectData?.globalObjects || []).length === 0 && (
                        <div className="text-[9px] text-gray-500 text-center py-2">Arrastra nodos aquí para guardarlos</div>
                    )}
                    {(projectData?.globalObjects || []).map(gObj => (
                        <div 
                            key={gObj.id}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('application/game-object-template', JSON.stringify(gObj));
                            }}
                            className="flex items-center justify-between p-1 hover:bg-white/5 rounded cursor-grab group"
                        >
                            <div className="flex items-center gap-1">
                                <Box size={12} className="text-indigo-400" />
                                <span className="text-[10px] text-gray-300">{gObj.name}</span>
                            </div>
                            <button 
                                onClick={() => {
                                    if(confirm("¿Eliminar plantilla?")) {
                                        onUpdateProjectData?.({ globalObjects: projectData.globalObjects?.filter(o => o.id !== gObj.id) });
                                    }
                                }}
                                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={10} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between items-center mb-2 px-1 border-t border-[#333333] pt-3 mt-2">
                    <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setShowAssetsSection(!showAssetsSection)}>
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block">Recursos</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#333] text-gray-300 font-mono">{assets.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => setShowAssetsSection(!showAssetsSection)}
                            className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-[#2a2a2a] hover:bg-[#333] text-gray-300 transition-colors"
                        >
                            {showAssetsSection ? 'Ocultar' : 'Mostrar'}
                        </button>
                        <button 
                            onClick={() => {
                                const name = prompt("Nombre de la carpeta:");
                                if (name && onUpdateProjectData && projectData) {
                                    const newFolder = { id: 'folder_' + Date.now(), name };
                                    onUpdateProjectData({ assetFolders: [...(projectData.assetFolders || []), newFolder] });
                                }
                            }}
                            className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white"
                            title="Nueva Carpeta"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </div>

                {showAssetsSection && (
                  <>
                    <div className="space-y-2 mb-2">
                        {(projectData?.assetFolders || []).map((folder: any) => (
                            <div 
                                key={folder.id} 
                                className="bg-[#222] border border-[#333] rounded p-1"
                                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                onDrop={e => {
                                    e.preventDefault();
                                    const assetId = e.dataTransfer.getData('application/game-asset-id');
                                    if (assetId && onUpdateProjectData && projectData) {
                                        onUpdateProjectData({
                                            assets: projectData.assets.map(a => a.id === assetId ? { ...a, folderId: folder.id } : a)
                                        });
                                    }
                                }}
                            >
                                <div className="text-[10px] font-bold text-gray-400 p-1 flex justify-between items-center">
                                    <span>📁 {folder.name}</span>
                                    <button onClick={() => {
                                        if (confirm("¿Borrar carpeta y sus recursos?")) {
                                            onUpdateProjectData?.({
                                                assetFolders: projectData.assetFolders.filter((f: any) => f.id !== folder.id),
                                                assets: projectData.assets.filter(a => a.folderId !== folder.id)
                                            });
                                        }
                                    }} className="text-red-500 hover:text-red-400"><Trash2 size={10} /></button>
                                </div>
                                <div className="grid grid-cols-4 gap-1 mt-1">
                                    {assets.filter(a => a.folderId === folder.id).map(asset => (
                                        <div 
                                            key={asset.id} 
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('application/game-asset', JSON.stringify(asset));
                                                e.dataTransfer.setData('application/game-asset-id', asset.id);
                                            }}
                                            className="bg-[#2a2a2a] border border-[#333333] hover:border-indigo-500 rounded p-1 flex flex-col items-center gap-0.5 cursor-grab transition-all"
                                            title={asset.name}
                                        >
                                            {asset.type === 'image' && <img src={asset.url} className="w-6 h-6 object-contain pointer-events-none" />}
                                            {asset.type === 'video' && <Video size={14} className="text-blue-400" />}
                                            {asset.type === 'audio' && <Music size={14} className="text-teal-400" />}
                                            {asset.type === '3d-model' && <Box size={14} className="text-pink-400 animate-pulse" />}
                                            <span className="text-[8px] truncate w-full text-center text-gray-400">{asset.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div 
                        className="grid grid-cols-4 gap-1 min-h-[30px] p-1 rounded bg-[#1a1a1a]/50 border border-dashed border-[#333]"
                        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                        onDrop={e => {
                            e.preventDefault();
                            const assetId = e.dataTransfer.getData('application/game-asset-id');
                            if (assetId && onUpdateProjectData && projectData) {
                                onUpdateProjectData({
                                    assets: projectData.assets.map(a => a.id === assetId ? { ...a, folderId: null } : a)
                                });
                            }
                        }}
                    >
                        {assets.filter(a => !a.folderId).map(asset => (
                            <div 
                                key={asset.id} 
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('application/game-asset', JSON.stringify(asset));
                                    e.dataTransfer.setData('application/game-asset-id', asset.id);
                                }}
                                className="bg-[#2a2a2a] border border-[#333333] hover:border-indigo-500 rounded p-1 flex flex-col items-center gap-0.5 cursor-grab transition-all"
                                title={asset.name}
                            >
                                {asset.type === 'image' && <img src={asset.url} className="w-6 h-6 object-contain pointer-events-none" />}
                                {asset.type === 'video' && <Video size={14} className="text-blue-400" />}
                                {asset.type === 'audio' && <Music size={14} className="text-teal-400" />}
                                {asset.type === '3d-model' && <Box size={14} className="text-pink-400 animate-pulse" />}
                                <span className="text-[8px] truncate w-full text-center text-gray-400">{asset.name}</span>
                            </div>
                        ))}
                        {assets.length === 0 && (
                            <div className="col-span-4 text-[8px] text-gray-500 text-center py-2">No hay recursos</div>
                        )}
                    </div>
                  </>
                )}
                <div className="mt-2 flex gap-1">
                    <button 
                      onClick={() => onOpenSpriteEditor(null)}
                      className="flex-1 py-1.5 border border-[#333333] hover:border-indigo-500 rounded text-[10px] uppercase font-bold text-gray-400 hover:text-indigo-400 text-center transition-all bg-[#2a2a2a]/40"
                    >
                      Dibujar
                    </button>
                    <label className="flex-1 py-1.5 border border-[#333333] hover:border-indigo-500 rounded text-[10px] uppercase font-bold text-gray-400 hover:text-indigo-400 text-center cursor-pointer transition-all bg-[#2a2a2a]/40">
                      Subir
                      <input 
                          type="file" 
                          accept="image/*,audio/*,video/*,.glb"
                          className="hidden" 
                          onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = async (fileEvent) => {
                                  let url = fileEvent.target?.result as string;
                                  let fileType: 'image' | 'audio' | 'video' | '3d-model' = 'image';
                                  if (file.type.startsWith('audio/')) {
                                      fileType = 'audio';
                                  } else if (file.type.startsWith('video/')) {
                                      fileType = 'video';
                                  } else if (file.name.endsWith('.glb')) {
                                      fileType = '3d-model';
                                  }
                                  if (url) {
                                      try {
                                          if (fileType === 'image') {
                                              url = await compressImageBase64(url);
                                          } else if (fileType === 'audio') {
                                              url = await compressAudioBase64(url);
                                          } else if (fileType === 'video') {
                                              url = await compressVideoBase64(url);
                                          }
                                      } catch (err) {
                                          console.error('Upload asset compression failed:', err);
                                      }
                                      onAddAsset({
                                          id: `asset_${Date.now()}`,
                                          name: file.name,
                                          type: fileType,
                                          url: url
                                      });
                                  }
                              };
                              reader.readAsDataURL(file);
                          }}
                      />
                    </label>
                </div>
             </div>

             <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest block mb-2 px-1">Editores</span>
                {[
                    { label: 'Animaciones', icon: <Cpu size={14} />, action: onOpenAnimationEditor },
                    { label: 'Animación a Poses', icon: <Box size={14} className="text-pink-400 animate-pulse" />, action: onOpenPoseAnimationEditor },
                    { label: 'Sprite Editor', icon: <ImageIcon size={14} />, action: () => onOpenSpriteEditor(null) },
                ].map((item, i) => (
                    <button 
                        key={i}
                        onClick={item.action}
                        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded text-[11px] text-gray-400 hover:text-white transition-colors"
                    >
                        {item.icon}
                        {item.label}
                    </button>
                ))}
             </div>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-[#333333] flex items-center justify-between">
         <button onClick={onToggleCollapse} className="p-1 hover:bg-white/5 rounded text-gray-500 hover:text-white"><ChevronRight className="rotate-180" size={14} /></button>
         <span className="text-[9px] font-mono text-gray-600 uppercase">Return 2D v4.0</span>
      </div>
    </div>
  );
};

export default SceneHierarchy;
