import React, { useState, useMemo } from 'react';
import { User, Plus, Trash2, Palette, Sparkles, X, ChevronRight, Check } from 'lucide-react';
import { ProjectData, GameObject, GameAsset, Action } from '../types';

interface CharacterSkinsEditorProps {
    isOpen: boolean;
    onClose: () => void;
    projectData: ProjectData;
    onUpdateProjectData: (updates: Partial<ProjectData>) => void;
}

interface Skin {
    name: string;
    imageUrl: string;
    color: string;
}

interface CharacterDefinition {
    id: number;
    name: string;
    skins: Skin[];
}

const CharacterSkinsEditor: React.FC<CharacterSkinsEditorProps> = ({
    isOpen,
    onClose,
    projectData,
    onUpdateProjectData,
}) => {
    const activeScene = useMemo(() => {
        return projectData.scenes?.find(s => s.id === projectData.activeSceneId) || null;
    }, [projectData]);

    // Gather all game objects that could be characters
    const availableObjects = useMemo(() => {
        if (!activeScene) return [];
        return activeScene.gameObjects.filter(o => !o.isUI && !o.isHealthBar);
    }, [activeScene]);

    // We can store character skin definitions inside scene metadata or local project variables to persist them.
    // Let's store them in projectData.variables as a serialized JSON string or a custom key so they persist across save/reload!
    // Key: "return2d_character_skins"
    const characterDefinitions: CharacterDefinition[] = useMemo(() => {
        const variable = projectData.globalVariables?.find(v => v.name === 'return2d_character_skins');
        if (variable && typeof variable.value === 'string') {
            try {
                return JSON.parse(variable.value);
            } catch (e) {
                return [];
            }
        }
        return [];
    }, [projectData]);

    const saveDefinitions = (defs: CharacterDefinition[]) => {
        const jsonStr = JSON.stringify(defs);
        const exists = projectData.globalVariables?.some(v => v.name === 'return2d_character_skins');
        let updatedVars = [];
        if (exists) {
            updatedVars = (projectData.globalVariables || []).map(v => 
                v.name === 'return2d_character_skins' ? { ...v, value: jsonStr } : v
            );
        } else {
            updatedVars = [
                ...(projectData.globalVariables || []),
                { name: 'return2d_character_skins', value: jsonStr, type: 'string' as const }
            ];
        }
        onUpdateProjectData({ globalVariables: updatedVars });
    };

    const [selectedCharId, setSelectedCharId] = useState<number | null>(null);
    const [newSkinName, setNewSkinName] = useState('');
    const [newSkinImage, setNewSkinImage] = useState('');
    const [newSkinColor, setNewSkinColor] = useState('#3b82f6');
    const [statusMessage, setStatusMessage] = useState('');

    const imageAssets = useMemo(() => {
        return projectData.assets?.filter(a => a.type === 'image') || [];
    }, [projectData.assets]);

    const activeChar = useMemo(() => {
        return characterDefinitions.find(c => c.id === selectedCharId) || null;
    }, [characterDefinitions, selectedCharId]);

    if (!isOpen) return null;

    const handleAddCharacter = (obj: GameObject) => {
        if (characterDefinitions.some(c => c.id === obj.id)) return;
        const newChar: CharacterDefinition = {
            id: obj.id,
            name: obj.name,
            skins: [
                {
                    name: 'Skin Original',
                    imageUrl: obj.imageUrl || '',
                    color: obj.color || '#3b82f6'
                }
            ]
        };
        const updated = [...characterDefinitions, newChar];
        saveDefinitions(updated);
        setSelectedCharId(obj.id);
        setStatusMessage(`Personaje "${obj.name}" añadido.`);
    };

    const handleRemoveCharacter = (id: number) => {
        const updated = characterDefinitions.filter(c => c.id !== id);
        saveDefinitions(updated);
        if (selectedCharId === id) setSelectedCharId(null);
        setStatusMessage('Personaje removido.');
    };

    const handleAddSkin = () => {
        if (!activeChar || !newSkinName.trim()) return;
        const newSkin: Skin = {
            name: newSkinName.trim(),
            imageUrl: newSkinImage,
            color: newSkinColor
        };
        const updated = characterDefinitions.map(c => {
            if (c.id === activeChar.id) {
                return { ...c, skins: [...c.skins, newSkin] };
            }
            return c;
        });
        saveDefinitions(updated);
        setNewSkinName('');
        setNewSkinImage('');
        setNewSkinColor('#3b82f6');
        setStatusMessage(`Skin "${newSkin.name}" añadida.`);
    };

    const handleRemoveSkin = (index: number) => {
        if (!activeChar) return;
        const updatedSkins = activeChar.skins.filter((_, idx) => idx !== index);
        const updated = characterDefinitions.map(c => {
            if (c.id === activeChar.id) {
                return { ...c, skins: updatedSkins };
            }
            return c;
        });
        saveDefinitions(updated);
        setStatusMessage('Skin eliminada.');
    };

    const handleGenerateUI = () => {
        if (!activeScene || !activeChar || activeChar.skins.length === 0) return;

        const targetObj = activeScene.gameObjects.find(o => o.id === activeChar.id);
        if (!targetObj) {
            setStatusMessage('El personaje no existe en la escena activa.');
            return;
        }

        // Generate custom skin switcher overlay
        const panelId = Date.now();
        const panelWidth = 200;
        const panelHeight = 70 + activeChar.skins.length * 45;
        const panelX = 40;
        const panelY = 80;

        const generatedObjects: GameObject[] = [];

        // 1. Panel Background
        const panelBg: GameObject = {
            id: panelId,
            name: `Panel_Skins_${activeChar.name}`,
            x: panelX,
            y: panelY,
            width: panelWidth,
            height: panelHeight,
            color: '#1a1a1a',
            zIndex: 90,
            isUI: true,
            text: '',
            variables: [],
            scripts: []
        };
        generatedObjects.push(panelBg);

        // 2. Title Label
        const titleLabel: GameObject = {
            id: panelId + 1,
            name: `Titulo_Skins_${activeChar.name}`,
            x: panelX + 15,
            y: panelY + 15,
            width: panelWidth - 30,
            height: 25,
            color: 'transparent',
            zIndex: 91,
            isUI: true,
            text: 'SELECCIONAR SKIN',
            textColor: '#a78bfa',
            fontSize: 11,
            variables: [],
            scripts: []
        };
        generatedObjects.push(titleLabel);

        // 3. Spawning skin selector buttons
        activeChar.skins.forEach((skin, index) => {
            const btnId = panelId + 10 + index;
            const btnY = panelY + 50 + index * 45;

            // Action: SetSkin targeting activeChar.name
            const skinAction: Action = {
                object: activeChar.name,
                action: 'SetSkin',
                params: {
                    imageUrl: skin.imageUrl,
                    color: skin.color
                }
            };

            const btn: GameObject = {
                id: btnId,
                name: `Btn_Skin_${skin.name.replace(/\s+/g, '')}`,
                x: panelX + 15,
                y: btnY,
                width: panelWidth - 30,
                height: 35,
                color: skin.color || '#3b82f6',
                zIndex: 95,
                isUI: true,
                text: skin.name.toUpperCase(),
                textColor: '#ffffff',
                fontSize: 10,
                variables: [],
                scripts: [
                    {
                        id: `script_skin_click_${btnId}`,
                        trigger: 'OnClick',
                        actions: [
                            skinAction,
                            {
                                object: 'System',
                                action: 'PlaySound',
                                params: {}
                            }
                        ]
                    }
                ]
            };
            generatedObjects.push(btn);
        });

        // Add generated objects to scene
        const updatedGameObjects = [...activeScene.gameObjects, ...generatedObjects];
        const updatedScenes = projectData.scenes.map(s => {
            if (s.id === activeScene.id) {
                return { ...s, gameObjects: updatedGameObjects };
            }
            return s;
        });

        onUpdateProjectData({ scenes: updatedScenes });
        setStatusMessage('¡Selector de Skins generado en pantalla!');
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#111111] border border-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#18181b] border-b border-gray-800">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-violet-500 animate-pulse" size={18} />
                        <span className="text-xs uppercase font-bold tracking-widest text-white">Creador de Personajes y Skins</span>
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-500 hover:text-white rounded hover:bg-white/5 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Main Content splits left/right */}
                <div className="flex-grow flex overflow-hidden">
                    {/* Left panel: Character designations */}
                    <div className="w-1/3 border-r border-gray-800 flex flex-col bg-[#141416]">
                        <div className="p-3 border-b border-gray-800/50">
                            <h3 className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Designar Personajes</h3>
                        </div>
                        <div className="flex-grow overflow-y-auto p-2 space-y-2">
                            {characterDefinitions.length === 0 ? (
                                <div className="text-center py-6 px-4">
                                    <User className="mx-auto text-gray-700 mb-2" size={28} />
                                    <p className="text-[10px] text-gray-500 leading-relaxed">No hay personajes designados. Elige un objeto abajo para empezar.</p>
                                </div>
                            ) : (
                                characterDefinitions.map(char => (
                                    <div 
                                        key={char.id} 
                                        onClick={() => setSelectedCharId(char.id)}
                                        className={`p-2.5 rounded border transition-all cursor-pointer flex items-center justify-between ${selectedCharId === char.id ? 'bg-violet-950/20 border-violet-500/40 text-violet-200' : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-violet-500" />
                                            <span className="text-[11px] font-bold font-mono uppercase">{char.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full">{char.skins.length} Skins</span>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleRemoveCharacter(char.id); }}
                                                className="p-1 hover:bg-red-950/30 text-gray-600 hover:text-red-400 rounded"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Assign from available gameObjects */}
                        <div className="p-3 border-t border-gray-800 bg-[#161618]">
                            <span className="text-[9px] uppercase font-bold tracking-widest text-gray-500 block mb-2">Objetos de la Escena</span>
                            {availableObjects.length === 0 ? (
                                <p className="text-[10px] text-gray-600">No hay objetos válidos en esta escena.</p>
                            ) : (
                                <select 
                                    onChange={(e) => {
                                        const obj = availableObjects.find(o => String(o.id) === e.target.value);
                                        if (obj) handleAddCharacter(obj);
                                        e.target.value = '';
                                    }}
                                    className="w-full bg-[#1e1e20] border border-gray-800 hover:border-gray-700 rounded px-2 py-1.5 text-[11px] text-white focus:outline-none"
                                >
                                    <option value="">+ Designar Objeto como Personaje...</option>
                                    {availableObjects.map(obj => (
                                        <option key={obj.id} value={obj.id} disabled={characterDefinitions.some(c => c.id === obj.id)}>
                                            {obj.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Right content: Skin manager */}
                    <div className="flex-grow flex flex-col bg-[#111113]">
                        {activeChar ? (
                            <div className="flex-grow flex flex-col overflow-hidden">
                                {/* Character Info Header */}
                                <div className="p-3.5 bg-[#17171a] border-b border-gray-800 flex items-center justify-between shadow-sm">
                                    <div>
                                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">{activeChar.name}</h4>
                                        <p className="text-[10px] text-gray-500">Añade variantes de skin (imagen, color) y crea interfaces dinámicas.</p>
                                    </div>
                                    <button 
                                        onClick={handleGenerateUI}
                                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] uppercase rounded shadow-lg transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                                    >
                                        <Sparkles size={12} /> Generar UI de Skins
                                    </button>
                                </div>

                                {/* Editor split */}
                                <div className="flex-grow flex overflow-hidden">
                                    {/* Skins Table */}
                                    <div className="w-3/5 p-4 overflow-y-auto space-y-3 border-r border-gray-800/40">
                                        <h5 className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Skins Definidas</h5>
                                        <div className="space-y-2">
                                            {activeChar.skins.map((skin, i) => (
                                                <div key={i} className="flex items-center justify-between p-2.5 bg-gray-900/40 border border-gray-800 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div 
                                                            className="w-8 h-8 rounded-md flex items-center justify-center border border-white/5 relative"
                                                            style={{ 
                                                                backgroundColor: skin.color || 'transparent',
                                                                backgroundImage: skin.imageUrl ? `url(${skin.imageUrl})` : 'none',
                                                                backgroundSize: 'cover',
                                                                backgroundPosition: 'center'
                                                            }}
                                                        >
                                                            {!skin.imageUrl && <Palette size={14} className="text-white/40" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-bold text-gray-200">{skin.name}</p>
                                                            <p className="text-[9px] text-gray-500 font-mono">
                                                                {skin.color} {skin.imageUrl ? '• Imagen' : '• Solo Color'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        disabled={i === 0} // keep default skin
                                                        onClick={() => handleRemoveSkin(i)}
                                                        className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-950/20 rounded disabled:opacity-30"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Add Skin Form */}
                                    <div className="w-2/5 p-4 bg-[#141416]/50 flex flex-col justify-between">
                                        <div className="space-y-3">
                                            <h5 className="text-[10px] uppercase font-bold tracking-widest text-gray-400 flex items-center gap-1">
                                                <Plus size={12} className="text-violet-400" /> Añadir Nueva Skin
                                            </h5>
                                            
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-bold text-gray-500">Nombre de la Skin</label>
                                                <input 
                                                    type="text" 
                                                    value={newSkinName}
                                                    onChange={e => setNewSkinName(e.target.value)}
                                                    placeholder="ej. Armadura Dorada"
                                                    className="w-full bg-[#1c1c1e] border border-gray-800 focus:border-violet-500 rounded px-2.5 py-1.5 text-[11px] text-white focus:outline-none"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-bold text-gray-500">Imagen (Sprite / Textura)</label>
                                                <select 
                                                    value={newSkinImage}
                                                    onChange={e => setNewSkinImage(e.target.value)}
                                                    className="w-full bg-[#1c1c1e] border border-gray-800 focus:border-violet-500 rounded px-2 py-1.5 text-[11px] text-white focus:outline-none"
                                                >
                                                    <option value="">-- Sin Imagen (Solo Color) --</option>
                                                    {imageAssets.map(asset => (
                                                        <option key={asset.id} value={asset.url}>{asset.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-bold text-gray-500 block">Color de Acento</label>
                                                <div className="flex gap-2 items-center">
                                                    <input 
                                                        type="color" 
                                                        value={newSkinColor}
                                                        onChange={e => setNewSkinColor(e.target.value)}
                                                        className="w-8 h-8 rounded border border-gray-800 bg-transparent cursor-pointer"
                                                    />
                                                    <span className="text-[10px] font-mono text-gray-400 uppercase">{newSkinColor}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={handleAddSkin}
                                            disabled={!newSkinName.trim()}
                                            className="w-full py-2 bg-gray-800 hover:bg-violet-600 disabled:bg-gray-900/50 text-white font-bold text-[10px] uppercase rounded border border-gray-700 hover:border-violet-500 disabled:opacity-40 transition-all cursor-pointer"
                                        >
                                            + Registrar Skin
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-grow flex items-center justify-center p-8 text-center">
                                <div className="max-w-xs space-y-2">
                                    <User className="mx-auto text-gray-800" size={38} />
                                    <h4 className="text-xs font-bold text-gray-400">Selecciona un Personaje</h4>
                                    <p className="text-[10px] text-gray-600 leading-relaxed">Asigna un personaje en el panel izquierdo para gestionar sus skins e interactuar con el selector.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer status message bar */}
                <div className="px-4 py-2.5 bg-[#18181b] border-t border-gray-800 flex items-center justify-between text-[10px] text-gray-500">
                    <span>{statusMessage || 'Listo. Define tus personajes y genera sus UIs.'}</span>
                    <span className="font-mono text-gray-600">v1.2</span>
                </div>
            </div>
        </div>
    );
};

export default CharacterSkinsEditor;
