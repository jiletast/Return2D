// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, useGLTF } from '@react-three/drei';
import { Box, Play, Plus, Trash2, X, Move, RotateCw, Maximize2, Camera, ChevronRight, Save, Eye } from 'lucide-react';
import { GameAsset, GameObject } from '../types';

interface PoseFrame {
  id: string;
  modelUrl?: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  duration: number;
}

interface PoseAnimation {
  id: string;
  name: string;
  frames: PoseFrame[];
}

interface PoseAnimationEditorProps {
  assets: GameAsset[];
  onClose: () => void;
  onSave: (animations: any[]) => void;
  initialPoseAnimations?: PoseAnimation[];
}

// Robust custom 3D model component for the editor to avoid errors
const EditorModel: React.FC<{ url: string; position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }> = ({ url, position, rotation, scale }) => {
  try {
    const { scene } = useGLTF(url);
    if (!scene) throw new Error("No scene found");
    const clonedScene = scene.clone();
    return (
      <primitive 
        object={clonedScene} 
        position={position} 
        rotation={rotation} 
        scale={scale} 
      />
    );
  } catch (err) {
    // Elegant fallback cube if loading fails
    return (
      <mesh position={position} rotation={rotation} scale={scale}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ec4899" wireframe />
      </mesh>
    );
  }
};

const PoseAnimationEditor: React.FC<PoseAnimationEditorProps> = ({ assets, onClose, onSave, initialPoseAnimations = [] }) => {
  const [animations, setAnimations] = useState<PoseAnimation[]>(initialPoseAnimations.length > 0 ? initialPoseAnimations : [
    {
      id: 'pose_anim_1',
      name: 'Nueva Animación de Poses',
      frames: [
        {
          id: 'frame_1',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          duration: 200
        }
      ]
    }
  ]);

  const [selectedAnimId, setSelectedAnimId] = useState<string>(animations[0]?.id || '');
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [cameraView, setCameraView] = useState<'front' | 'down' | 'custom'>('front');

  const activeAnim = animations.find(a => a.id === selectedAnimId);
  const activeFrame = activeAnim?.frames[currentFrameIndex];

  // Helper to update current frame
  const updateCurrentFrame = (updates: Partial<PoseFrame>) => {
    if (!activeAnim || !activeFrame) return;
    setAnimations(prev => prev.map(anim => {
      if (anim.id !== selectedAnimId) return anim;
      return {
        ...anim,
        frames: anim.frames.map((f, idx) => {
          if (idx !== currentFrameIndex) return f;
          return { ...f, ...updates };
        })
      };
    }));
  };

  // Add new Pose Animation
  const handleAddAnimation = () => {
    const newId = `pose_anim_${Date.now()}`;
    const newAnim: PoseAnimation = {
      id: newId,
      name: `Pose Animación ${animations.length + 1}`,
      frames: [
        {
          id: `frame_${Date.now()}`,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          duration: 200
        }
      ]
    };
    setAnimations([...animations, newAnim]);
    setSelectedAnimId(newId);
    setCurrentFrameIndex(0);
  };

  // Add Frame to selected animation
  const handleAddFrame = () => {
    if (!activeAnim) return;
    const lastFrame = activeAnim.frames[activeAnim.frames.length - 1] || {
      id: '',
      modelUrl: '',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      duration: 200
    } as PoseFrame;
    const newFrame: PoseFrame = {
      id: `frame_${Date.now()}`,
      modelUrl: lastFrame.modelUrl,
      position: { ...lastFrame.position },
      rotation: { ...lastFrame.rotation },
      scale: { ...lastFrame.scale },
      duration: 200
    };
    setAnimations(prev => prev.map(anim => {
      if (anim.id !== selectedAnimId) return anim;
      return {
        ...anim,
        frames: [...anim.frames, newFrame]
      };
    }));
    setCurrentFrameIndex(activeAnim.frames.length);
  };

  // Remove current Frame
  const handleRemoveFrame = (idx: number) => {
    if (!activeAnim || activeAnim.frames.length <= 1) return;
    setAnimations(prev => prev.map(anim => {
      if (anim.id !== selectedAnimId) return anim;
      return {
        ...anim,
        frames: anim.frames.filter((_, i) => i !== idx)
      };
    }));
    setCurrentFrameIndex(Math.max(0, idx - 1));
  };

  // Save changes
  const handleSave = () => {
    onSave(animations);
  };

  const modelAssets = assets.filter(a => a.type === '3d-model');

  return (
    <div className="fixed inset-0 bg-[#0c0c0c] z-50 flex flex-col font-sans text-gray-200">
      {/* Top Header */}
      <div className="h-14 px-4 bg-[#141414] border-b border-[#2b2b2b] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Box className="text-pink-500 animate-spin" size={20} />
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-white">Editor de Animación a Poses (3D)</h1>
            <p className="text-[10px] text-gray-500">Añade modelos 3D y crea poses clave sin riggearlos de forma compleja</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSave} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-bold text-white uppercase transition-colors"
          >
            <Save size={13} /> Guardar Cambios
          </button>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Workspace Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Animations List */}
        <div className="w-64 bg-[#121212] border-r border-[#222222] flex flex-col">
          <div className="p-3 border-b border-[#222222] flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Pose Animations</span>
            <button 
              onClick={handleAddAnimation}
              className="p-1 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-400 rounded transition-all"
              title="Nueva Animación"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto p-2 space-y-1">
            {animations.map(anim => (
              <button
                key={anim.id}
                onClick={() => { setSelectedAnimId(anim.id); setCurrentFrameIndex(0); }}
                className={`w-full text-left p-2 rounded text-xs transition-all flex items-center justify-between ${selectedAnimId === anim.id ? 'bg-indigo-600/20 border border-indigo-500/40 text-white font-semibold' : 'hover:bg-white/5 border border-transparent text-gray-400'}`}
              >
                <span>{anim.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1c1c1c] text-gray-500">{anim.frames.length} poses</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center: 3D Viewport */}
        <div className="flex-1 relative flex flex-col bg-[#161616]">
          {/* Viewport Toolbar */}
          <div className="absolute top-3 left-3 z-10 flex gap-1 bg-[#1a1a1a]/95 border border-[#2b2b2b] p-1 rounded-lg shadow-lg backdrop-blur-md">
            <button 
              onClick={() => setCameraView('front')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${cameraView === 'front' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Camera size={12} /> Vista Frente
            </button>
            <button 
              onClick={() => setCameraView('down')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${cameraView === 'down' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Camera size={12} /> Vista Abajo
            </button>
            <button 
              onClick={() => setCameraView('custom')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${cameraView === 'custom' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Eye size={12} /> Vista Libre
            </button>
          </div>

          <div className="flex-1 min-h-0 relative">
            <Canvas
              key={`${cameraView}-${currentFrameIndex}`}
              camera={{
                position: cameraView === 'front' ? [0, 1, 4] : cameraView === 'down' ? [0, 5, 0] : [3, 3, 3],
                fov: 50
              }}
            >
              <ambientLight intensity={0.7} />
              <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
              <directionalLight position={[-10, -10, -5]} intensity={0.5} />
              <pointLight position={[0, 4, 0]} intensity={1} color="#ec4899" />
              
              <gridHelper args={[20, 20, "#ec4899", "#2b2b2b"]} position={[0, -1, 0]} />

              {/* Renders the GLTF model or fallback mesh */}
              {activeFrame && activeFrame.modelUrl ? (
                <EditorModel 
                  url={activeFrame.modelUrl} 
                  position={[activeFrame.position.x, activeFrame.position.y, activeFrame.position.z]}
                  rotation={[
                    (activeFrame.rotation.x * Math.PI) / 180,
                    (activeFrame.rotation.y * Math.PI) / 180,
                    (activeFrame.rotation.z * Math.PI) / 180
                  ]}
                  scale={[activeFrame.scale.x, activeFrame.scale.y, activeFrame.scale.z]}
                />
              ) : (
                <mesh 
                  position={activeFrame ? [activeFrame.position.x, activeFrame.position.y, activeFrame.position.z] : [0, 0, 0]}
                  rotation={activeFrame ? [
                    (activeFrame.rotation.x * Math.PI) / 180,
                    (activeFrame.rotation.y * Math.PI) / 180,
                    (activeFrame.rotation.z * Math.PI) / 180
                  ] : [0,0,0]}
                  scale={activeFrame ? [activeFrame.scale.x, activeFrame.scale.y, activeFrame.scale.z] : [1,1,1]}
                >
                  <boxGeometry args={[1, 1, 1]} />
                  <meshStandardMaterial color="#3b82f6" />
                </mesh>
              )}

              {cameraView === 'custom' && <OrbitControls />}
            </Canvas>
          </div>

          {/* Timeline / Keyframes Bottom bar */}
          <div className="h-28 bg-[#141414] border-t border-[#222222] flex flex-col">
            <div className="h-8 px-3 border-b border-[#222222] flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-gray-500">
              <span>Timeline de Poses Clave</span>
              <button 
                onClick={handleAddFrame}
                className="flex items-center gap-1 text-indigo-400 hover:text-white transition-colors"
              >
                <Plus size={12} /> Añadir Pose
              </button>
            </div>
            <div className="flex-1 flex gap-2 items-center px-4 overflow-x-auto">
              {activeAnim?.frames.map((frame, idx) => (
                <div 
                  key={frame.id}
                  onClick={() => setCurrentFrameIndex(idx)}
                  className={`min-w-[120px] h-14 rounded border p-1.5 flex flex-col justify-between cursor-pointer transition-all ${idx === currentFrameIndex ? 'bg-[#ec4899]/10 border-[#ec4899] text-white shadow-[0_0_10px_rgba(236,72,153,0.15)]' : 'bg-[#181818] border-[#2b2b2b] text-gray-500 hover:border-gray-600'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold">Pose #{idx + 1}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemoveFrame(idx); }}
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-0.5 rounded transition-colors"
                      title="Eliminar pose"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[8px] font-mono">
                    <span>{frame.duration}ms</span>
                    <span className="text-[#ec4899]">Pos: {frame.position.x.toFixed(1)},{frame.position.y.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Transform and Pose settings */}
        <div className="w-80 bg-[#121212] border-l border-[#222222] flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-[#222222]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1">Nombre Animación</span>
            <input 
              type="text"
              value={activeAnim?.name || ''}
              onChange={e => {
                const val = e.target.value;
                setAnimations(prev => prev.map(a => a.id === selectedAnimId ? { ...a, name: val } : a));
              }}
              className="w-full bg-[#1c1c1c] border border-[#2b2b2b] rounded px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
            />
          </div>

          {activeFrame ? (
            <div className="p-4 space-y-5">
              {/* Asset Select */}
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-2">Modelo 3D del Pose</span>
                <select 
                  value={activeFrame.modelUrl || ''} 
                  onChange={e => updateCurrentFrame({ modelUrl: e.target.value })}
                  className="w-full bg-[#1c1c1c] border border-[#2b2b2b] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Selecciona un modelo (.GLB)</option>
                  {modelAssets.map(a => (
                    <option key={a.id} value={a.url}>{a.name}</option>
                  ))}
                </select>
                {modelAssets.length === 0 && (
                  <p className="text-[9px] text-pink-400 mt-1 italic">Sube archivos .glb en el panel de Recursos para seleccionarlos aquí.</p>
                )}
              </div>

              {/* Transform values */}
              <div className="space-y-4 pt-2 border-t border-[#222222]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300">
                  <Move size={14} className="text-pink-400" />
                  <span>Posición 3D</span>
                </div>
                {['x', 'y', 'z'].map(axis => (
                  <div key={axis} className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-mono text-gray-400 font-bold uppercase w-4">{axis}</span>
                    <input 
                      type="range" min="-10" max="10" step="0.1"
                      value={activeFrame.position[axis as 'x' | 'y' | 'z']}
                      onChange={e => updateCurrentFrame({
                        position: { ...activeFrame.position, [axis]: parseFloat(e.target.value) }
                      })}
                      className="flex-1 accent-pink-500 h-1 bg-[#1c1c1c] rounded-full appearance-none"
                    />
                    <span className="text-[10px] font-mono font-bold text-gray-300 w-10 text-right">
                      {activeFrame.position[axis as 'x' | 'y' | 'z'].toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Rotation Values */}
              <div className="space-y-4 pt-4 border-t border-[#222222]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300">
                  <RotateCw size={14} className="text-pink-400" />
                  <span>Rotación 3D (Grados)</span>
                </div>
                {['x', 'y', 'z'].map(axis => (
                  <div key={axis} className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-mono text-gray-400 font-bold uppercase w-4">{axis}</span>
                    <input 
                      type="range" min="-180" max="180" step="1"
                      value={activeFrame.rotation[axis as 'x' | 'y' | 'z']}
                      onChange={e => updateCurrentFrame({
                        rotation: { ...activeFrame.rotation, [axis]: parseFloat(e.target.value) }
                      })}
                      className="flex-1 accent-pink-500 h-1 bg-[#1c1c1c] rounded-full appearance-none"
                    />
                    <span className="text-[10px] font-mono font-bold text-gray-300 w-10 text-right">
                      {activeFrame.rotation[axis as 'x' | 'y' | 'z']}°
                    </span>
                  </div>
                ))}
              </div>

              {/* Scale Values */}
              <div className="space-y-4 pt-4 border-t border-[#222222]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300">
                  <Maximize2 size={14} className="text-pink-400" />
                  <span>Escala 3D</span>
                </div>
                {['x', 'y', 'z'].map(axis => (
                  <div key={axis} className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-mono text-gray-400 font-bold uppercase w-4">{axis}</span>
                    <input 
                      type="range" min="0.1" max="5" step="0.1"
                      value={activeFrame.scale[axis as 'x' | 'y' | 'z']}
                      onChange={e => updateCurrentFrame({
                        scale: { ...activeFrame.scale, [axis]: parseFloat(e.target.value) }
                      })}
                      className="flex-1 accent-pink-500 h-1 bg-[#1c1c1c] rounded-full appearance-none"
                    />
                    <span className="text-[10px] font-mono font-bold text-gray-300 w-10 text-right">
                      {activeFrame.scale[axis as 'x' | 'y' | 'z'].toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Duration Values */}
              <div className="pt-4 border-t border-[#222222] space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1">Duración del Pose (ms)</span>
                <input 
                  type="number"
                  value={activeFrame.duration}
                  onChange={e => updateCurrentFrame({ duration: Math.max(10, parseInt(e.target.value) || 200) })}
                  className="w-full bg-[#1c1c1c] border border-[#2b2b2b] rounded px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center p-6 text-center text-gray-500">
              <Box size={24} className="text-gray-600 mb-2 animate-bounce" />
              <p className="text-xs">No hay pose seleccionado o la animación está vacía.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoseAnimationEditor;
