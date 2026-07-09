import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Project, ProjectData, GameObject, Scene, GameAsset, Animation, Variable } from './types';

import SplashScreen from './components/SplashScreen';
import ProjectLoadingScreen from './components/ProjectLoadingScreen';
import StartScreen from './components/StartScreen';
import Header from './components/Header';
import SceneHierarchy from './components/SceneHierarchy';
import SceneEditor from './components/SceneEditor';
import PropertiesInspector from './components/PropertiesInspector';
import GameView, { type GameState } from './components/GameView';
import { ExportModal } from './components/ExportModal';
import EventEditor from './components/EventEditor';
import AnimationEditor from './components/AnimationEditor';
import { SpriteEditor } from './components/SpriteEditor';
import PoseAnimationEditor from './components/PoseAnimationEditor';
import AudioLab from './components/AudioLab';
import SoundtrackEditor from './components/SoundtrackEditor';
import Toast from './components/Toast';
import { HierarchyIcon } from './components/icons/HierarchyIcon';
import { EditorIcon } from './components/icons/EditorIcon';
import { InspectorIcon } from './components/icons/InspectorIcon';
import { get, set } from 'idb-keyval';
import { motion, AnimatePresence } from 'motion/react';

import { LanguageProvider, useLanguage } from './LanguageContext';

const PROJECTS_STORAGE_KEY = 'return2d-projects';

const createNewScene = (name: string): Scene => {
    const sceneId = `scene_${Date.now()}`;
    return {
      id: sceneId,
      name,
      backgroundColor: '#1a1a1a', // More Godot-like neutral dark gray
      defaultZoom: 1,
      cameraBounds: { enabled: false, x: 0, y: 0, width: 1024, height: 768 },
      gameObjects: [],
      events: [],
    };
};

const createNewProjectData = (t: (key: string) => string): ProjectData => {
    const starterScene = createNewScene(t('starter.sceneName') || 'Main Scene');
    
    starterScene.gameObjects = [
      { id: 1, name: 'Player', x: 200, y: 300, width: 40, height: 60, color: '#3b82f6', zIndex: 10, behaviors: [{ name: 'PlatformerCharacter', properties: { speed: 200, jumpForce: 400, gravity: 600 } }, { name: 'FollowCamera', properties: {} }], variables: [], direction: 'right', rotation: 0, scaleX: 1, scaleY: 1, stats: { hp: 100, maxHp: 100, attack: 10} },
      { id: 2, name: 'Ground', x: 0, y: 500, width: 1200, height: 60, color: '#2a2a2a', zIndex: 1, behaviors: [{ name: 'Solid', properties: {} }] },
    ];
    return {
        scenes: [starterScene],
        activeSceneId: starterScene.id,
        assets: [],
        animations: [],
        globalObjects: [],
        globalVariables: [{name: 'score', value: 0}],
        orientation: 'landscape',
        gameWidth: 1024,
        gameHeight: 768,
        joystick: {
            enabled: true,
            position: 'left',
            size: 120,
            opacity: 0.5
        }
    };
};

type AppState = 'loading' | 'start' | 'editor' | 'playing';

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

const AppContent: React.FC = () => {
  const { t } = useLanguage();
  const [appState, setAppState] = useState<AppState>('loading');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });

  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportModalInitialShowCode, setExportModalInitialShowCode] = useState(false);
  const [showEventEditor, setShowEventEditor] = useState(false);
  const [showAnimationEditor, setShowAnimationEditor] = useState(false);
  const [showSpriteEditor, setShowSpriteEditor] = useState(false);
  const [editingSpriteAssetId, setEditingSpriteAssetId] = useState<string | null>(null);
  const [showAudioLab, setShowAudioLab] = useState(false);
  const [showPoseAnimationEditor, setShowPoseAnimationEditor] = useState(false);
  const [showSoundtrackEditor, setShowSoundtrackEditor] = useState(false);
  
  const [hierarchyWidth, setHierarchyWidth] = useState(260);
  const [inspectorWidth, setInspectorWidth] = useState(300);
  const [isHierarchyCollapsed, setIsHierarchyCollapsed] = useState(false);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const [activeMobilePanel, setActiveMobilePanel] = useState<'hierarchy' | 'editor' | 'inspector'>('editor');
  const [previewMode, setPreviewMode] = useState<'2d' | '3d'>('2d');
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [isResizingHierarchy, setIsResizingHierarchy] = useState(false);
  const [isResizingInspector, setIsResizingInspector] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast({ message, show: true });
    setTimeout(() => setToast({ message: '', show: false }), 3000);
  }, []);

  useEffect(() => {
    const loadData = async () => {
        try {
            const storedProjects = await get(PROJECTS_STORAGE_KEY);
            if (storedProjects) {
                setProjects(storedProjects);
            }
        } catch (error) {
            console.error("Error loading projects:", error);
            showToast("Error al cargar los proyectos");
        }
        // Simulated slow splash for polish
        setTimeout(() => setAppState('start'), 1500);
    };
    loadData();
  }, [showToast]);

  const handleSaveProjects = useCallback(async (updatedProjects: Project[]) => {
      try {
          await set(PROJECTS_STORAGE_KEY, updatedProjects);
          setProjects(updatedProjects);
      } catch (error) {
          console.error("Error saving projects:", error);
          showToast("Error al guardar: Espacio insuficiente");
      }
  }, [showToast]);
  
  const handleSaveCurrentProject = useCallback((showNotification = false) => {
    if (!activeProjectId || !projectData) return;

    const updatedProjects = projects.map(p => 
        p.id === activeProjectId 
        ? { ...p, data: projectData, lastModified: Date.now() } 
        : p
    );
    handleSaveProjects(updatedProjects);
    if (showNotification) {
        showToast("Proyecto guardado");
    }
  }, [activeProjectId, projectData, projects, handleSaveProjects, showToast]);
  
  const handleCreateProject = () => {
    const name = `Nuevo Proyecto ${projects.length + 1}`;
    const newProject: Project = {
        id: `proj_${Date.now()}`,
        name,
        lastModified: Date.now(),
        data: createNewProjectData(t),
    };
    const updatedProjects = [...projects, newProject];
    handleSaveProjects(updatedProjects);
    handleLoadProject(newProject.id);
  };
  
  const handleLoadProject = (projectId: string) => {
    const projectToLoad = projects.find(p => p.id === projectId);
    if (projectToLoad) {
        setAppState('loading');
        setTimeout(() => {
            setActiveProjectId(projectId);
            setProjectData(projectToLoad.data);
            setAppState('editor');
            setSelectedObjectId(null);
        }, 800);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    const updatedProjects = projects.filter(p => p.id !== projectId);
    handleSaveProjects(updatedProjects);
  };
  
  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        if (!result) throw new Error("File is empty");
        
        const importedData = JSON.parse(result);
        const data = importedData.data || importedData;
        
        if (data && data.scenes && Array.isArray(data.scenes)) {
          const newProject: Project = {
            id: `proj_${Date.now()}`,
            name: importedData.name || `Import_${Date.now()}`,
            lastModified: Date.now(),
            data: data,
          };
          
          handleSaveProjects([...projects, newProject]);
          showToast("Proyecto importado!");
        }
      } catch (error) {
        console.error("Error importing:", error);
        showToast("Archivo inválido");
      }
    };
    reader.readAsText(file);
  };

  const handleReturnToStart = () => {
    handleSaveCurrentProject();
    setActiveProjectId(null);
    setProjectData(null);
    setAppState('start');
  };
  
  const updateProjectData = useCallback((updates: Partial<ProjectData>) => {
      setProjectData(prev => prev ? { ...prev, ...updates } : null);
  }, []);
  
  const activeScene = projectData?.scenes.find(s => s.id === projectData.activeSceneId);

  const handleUpdateObject = useCallback((id: number, updates: Partial<GameObject>) => {
    updateProjectData({
        scenes: projectData?.scenes.map(scene => 
            scene.id === projectData.activeSceneId 
            ? { ...scene, gameObjects: scene.gameObjects.map(obj => obj.id === id ? { ...obj, ...updates } : obj) }
            : scene
        )
    });
  }, [projectData?.activeSceneId, projectData?.scenes, updateProjectData]);
  
  const handleAddObject = useCallback((initialProps?: Partial<GameObject>) => {
      if (!activeScene) return;
      const newObject: GameObject = {
          id: Date.now(),
          name: `Objeto_${activeScene.gameObjects.length + 1}`,
          x: 200, y: 200, width: 50, height: 50,
          color: '#eab308', zIndex: 1,
          ...initialProps
      };

      const updatedObjects = [...activeScene.gameObjects, newObject];
      const updatedScene = { ...activeScene, gameObjects: updatedObjects };
       updateProjectData({
            scenes: projectData?.scenes.map(s => s.id === projectData.activeSceneId ? updatedScene : s),
       });
       setSelectedObjectId(newObject.id);
  }, [activeScene, projectData?.activeSceneId, projectData?.scenes, updateProjectData]);

  const handleDeleteObject = useCallback((id: number) => {
      if (!activeScene) return;
      const updatedObjects = activeScene.gameObjects.filter(obj => obj.id !== id);
      const updatedScene = { ...activeScene, gameObjects: updatedObjects };
       updateProjectData({
            scenes: projectData?.scenes.map(s => s.id === projectData.activeSceneId ? updatedScene : s)
       });
       setSelectedObjectId(null);
  }, [activeScene, projectData?.activeSceneId, projectData?.scenes, updateProjectData]);

  const handleCloneObject = (id: number) => {
    if (!activeScene) return;
    const objectToClone = activeScene.gameObjects.find(o => o.id === id);
    if (!objectToClone) return;
    const newObject = {
        ...objectToClone,
        id: Date.now(),
        name: objectToClone.name,
        x: objectToClone.x + 20,
        y: objectToClone.y + 20,
    };
    handleAddObject(newObject);
  };
  
  const handleAddAsset = useCallback((asset: GameAsset) => {
      updateProjectData({ assets: [...(projectData?.assets ?? []), asset] });
  }, [projectData?.assets, updateProjectData]);

  const handleUpdateAsset = useCallback((asset: GameAsset) => {
      updateProjectData({ assets: (projectData?.assets ?? []).map(a => a.id === asset.id ? asset : a) });
  }, [projectData?.assets, updateProjectData]);

  const handleOpenSpriteEditor = (assetId: string | null) => {
      setEditingSpriteAssetId(assetId);
      setShowSpriteEditor(true);
  };

  if (appState === 'loading') return <SplashScreen />;
  if (appState === 'start') {
      return (
            <StartScreen 
                projects={projects} 
                onLoadProject={handleLoadProject} 
                onCreateProject={handleCreateProject} 
                onDeleteProject={handleDeleteProject} 
                onImportProject={handleImportProject}
                onUpdateProjectIcon={(projectId, icon) => {
                    const updatedProjects = projects.map(p => p.id === projectId ? { ...p, icon } : p);
                    setProjects(updatedProjects);
                    handleSaveProjects(updatedProjects);
                }}
            />
      );
  }
  
  const selectedObject = activeScene?.gameObjects.find(obj => obj.id === selectedObjectId) || null;
  const editingSpriteAsset = projectData?.assets.find(a => a.id === editingSpriteAssetId) || null;

  if (appState === 'playing') {
    return activeScene ? (
        <GameView 
            scene={activeScene}
            allScenes={projectData?.scenes ?? []}
            animations={projectData?.animations ?? []}
            assets={projectData?.assets ?? []}
            globalObjects={projectData?.globalObjects ?? []}
            globalVariables={projectData?.globalVariables ?? []}
            gameWidth={projectData?.gameWidth ?? 1024}
            gameHeight={projectData?.gameHeight ?? 768}
            responsive={projectData?.responsive}
            joystick={projectData?.joystick}
            projectData={projectData}
            onExit={() => setAppState('editor')}
            onGoToScene={(name) => {
              const scene = projectData?.scenes.find(s => s.name === name);
              if (scene) updateProjectData({ activeSceneId: scene.id });
            }}
        />
    ) : null;
  }

  return (
    <div className="flex flex-col h-screen bg-[#111111] text-[#e0e0e0] font-sans selection:bg-indigo-500/30">
        <Header 
            onSave={() => handleSaveCurrentProject(true)}
            isPlaying={false}
            onTogglePlay={() => setAppState('playing')}
            onExport={() => {
                setExportModalInitialShowCode(false);
                setShowExportModal(true);
            }}
            onViewCode={() => {
                setExportModalInitialShowCode(true);
                setShowExportModal(true);
            }}
            onReturnToStart={handleReturnToStart}
            onImportProject={handleImportProject}
            projectName={projects.find(p => p.id === activeProjectId)?.name ?? 'Untitled Project'}
            onUpdateProjectName={(newName) => {
                const updatedProjects = projects.map(p => p.id === activeProjectId ? { ...p, name: newName } : p);
                setProjects(updatedProjects);
            }}
            projectIcon={projects.find(p => p.id === activeProjectId)?.icon ?? '🎮'}
            onUpdateProjectIcon={(newIcon) => {
                const updatedProjects = projects.map(p => p.id === activeProjectId ? { ...p, icon: newIcon } : p);
                setProjects(updatedProjects);
                handleSaveProjects(updatedProjects);
            }}
            activeScene={activeScene}
            projectData={projectData}
            onUpdateProjectData={updateProjectData}
            onAddObject={handleAddObject}
        />
        
        <main className="flex-grow flex h-full overflow-hidden relative">
            {/* Godot Style Lateral Panels */}
            <AnimatePresence mode="popLayout">
                {(!isMobile || activeMobilePanel === 'hierarchy') && (
                    <motion.div 
                        layout
                        initial={isMobile ? { x: -300 } : { width: hierarchyWidth }}
                        animate={isMobile ? { x: 0 } : { width: isHierarchyCollapsed ? 32 : hierarchyWidth }}
                        exit={{ x: -400 }}
                        className={`bg-[#202020] border-r border-[#333333] shrink-0 z-40 ${isMobile ? 'fixed inset-y-16 left-0 w-80' : 'relative'}`}
                    >
                        <SceneHierarchy 
                            scenes={projectData?.scenes ?? []}
                            activeSceneId={projectData?.activeSceneId ?? null}
                            onSelectScene={(id) => updateProjectData({ activeSceneId: id })}
                            onAddScene={() => {
                                const newScene = createNewScene(`Scene ${projectData!.scenes.length + 1}`);
                                updateProjectData({ scenes: [...projectData!.scenes, newScene], activeSceneId: newScene.id });
                            }}
                            onCloneScene={(sceneId) => {
                                const sceneToClone = projectData?.scenes.find(s => s.id === sceneId);
                                if (!sceneToClone) return;
                                const baseTime = Date.now();
                                const clonedScene = {
                                    ...sceneToClone,
                                    id: `scene_${baseTime}_cloned`,
                                    name: `${sceneToClone.name} - Copia`,
                                    gameObjects: sceneToClone.gameObjects.map((obj, i) => ({
                                        ...obj,
                                        id: baseTime + i + 1
                                    })),
                                    events: sceneToClone.events.map((ev, i) => ({
                                        ...ev,
                                        id: `ev_${baseTime}_${i + 1}`
                                    }))
                                };
                                updateProjectData({
                                    scenes: [...projectData!.scenes, clonedScene],
                                    activeSceneId: clonedScene.id
                                });
                            }}
                            onDeleteScene={(sceneId) => {
                                if ((projectData?.scenes ?? []).length <= 1) {
                                    alert("No puedes borrar la única escena que tienes.");
                                    return;
                                }
                                const remaining = projectData!.scenes.filter(s => s.id !== sceneId);
                                const nextActive = projectData!.activeSceneId === sceneId ? remaining[0].id : projectData!.activeSceneId;
                                updateProjectData({
                                    scenes: remaining,
                                    activeSceneId: nextActive
                                });
                            }}
                            objects={activeScene?.gameObjects ?? []}
                            globalObjects={projectData?.globalObjects ?? []}
                            onAddObject={handleAddObject}
                            selectedId={selectedObjectId}
                            onSelect={setSelectedObjectId}
                            onUpdateObject={handleUpdateObject}
                            assets={projectData?.assets ?? []}
                            onAddAsset={handleAddAsset}
                            onUpdateAsset={handleUpdateAsset}
                            onOpenAnimationEditor={() => setShowAnimationEditor(true)}
                            onOpenPoseAnimationEditor={() => setShowPoseAnimationEditor(true)}
                            onOpenSpriteEditor={handleOpenSpriteEditor}
                            onOpenAudioLab={() => setShowAudioLab(true)}
                            onOpenSoundtrackEditor={() => setShowSoundtrackEditor(true)}
                            width={isHierarchyCollapsed ? 32 : hierarchyWidth}
                            onToggleCollapse={() => setIsHierarchyCollapsed(!isHierarchyCollapsed)}
                            projectData={projectData}
                            onUpdateProjectData={updateProjectData}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-grow flex flex-col relative bg-[#181818] overflow-hidden">
                <SceneEditor
                    scene={activeScene}
                    objects={activeScene?.gameObjects ?? []}
                    selectedId={selectedObjectId}
                    onSelect={setSelectedObjectId}
                    onUpdateObject={handleUpdateObject}
                    onAddObject={handleAddObject}
                    onOpenEventEditor={() => setShowEventEditor(true)}
                    assets={projectData?.assets ?? []}
                    gameWidth={projectData?.gameWidth ?? 1024}
                    gameHeight={projectData?.gameHeight ?? 768}
                    globalObjects={projectData?.globalObjects ?? []}
                />
                
                {/* Mobile Panel Toggle */}
                {isMobile && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex bg-[#252525] border border-white/10 rounded-full p-1 shadow-2xl z-50">
                        <button onClick={() => setActiveMobilePanel('hierarchy')} className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${activeMobilePanel === 'hierarchy' ? 'bg-indigo-600' : 'hover:bg-white/5'}`}>SCENE</button>
                        <button onClick={() => setActiveMobilePanel('editor')} className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${activeMobilePanel === 'editor' ? 'bg-indigo-600' : 'hover:bg-white/5'}`}>VIEW</button>
                        <button onClick={() => setActiveMobilePanel('inspector')} className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${activeMobilePanel === 'inspector' ? 'bg-indigo-600' : 'hover:bg-white/5'}`}>PROPS</button>
                    </div>
                )}
            </div>

            <AnimatePresence mode="popLayout">
                {(!isMobile || activeMobilePanel === 'inspector') && (
                    <motion.div 
                        layout
                        initial={isMobile ? { x: 300 } : { width: inspectorWidth }}
                        animate={isMobile ? { x: 0 } : { width: isInspectorCollapsed ? 32 : inspectorWidth }}
                        exit={{ x: 400 }}
                        className={`bg-[#202020] border-l border-[#333333] shrink-0 z-40 ${isMobile ? 'fixed inset-y-16 right-0 w-80' : 'relative'}`}
                    >
                        <PropertiesInspector 
                            selectedObject={selectedObject}
                            projectData={projectData!}
                            onUpdateProjectData={updateProjectData}
                            onUpdateObject={handleUpdateObject}
                            onDeleteObject={handleDeleteObject}
                            onCloneObject={handleCloneObject}
                            onSaveAsGlobalObject={() => {}}
                            onAddAsset={handleAddAsset}
                            width={isInspectorCollapsed ? 32 : inspectorWidth}
                            onToggleCollapse={() => setIsInspectorCollapsed(!isInspectorCollapsed)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
        
        {/* Modals & Overlays */}
        {showExportModal && <ExportModal 
            onClose={() => setShowExportModal(false)} 
            projectData={projectData} 
            initialShowCode={exportModalInitialShowCode}
        />}
        {showEventEditor && <EventEditor 
            onClose={() => setShowEventEditor(false)}
            scene={activeScene}
            allScenes={projectData?.scenes ?? []}
            animations={projectData?.animations ?? []}
            assets={projectData?.assets ?? []}
            globalObjects={projectData?.globalObjects ?? []}
            globalVariables={projectData?.globalVariables ?? []}
            onAddEvent={(e) => {
              if (activeScene) updateProjectData({ scenes: projectData!.scenes.map(s => s.id === activeScene.id ? {...s, events: [...s.events, e]} : s) });
            }}
            onDeleteEvent={(id) => {
               if (activeScene) updateProjectData({ scenes: projectData!.scenes.map(s => s.id === activeScene.id ? {...s, events: s.events.filter(ev => ev.id !== id)} : s) });
            }}
            onUpdateEvent={(e) => {
               if (activeScene) updateProjectData({ scenes: projectData!.scenes.map(s => s.id === activeScene.id ? {...s, events: s.events.map(ev => ev.id === e.id ? e : ev)} : s) });
            }}
        />}
        {showAnimationEditor && <AnimationEditor
            onClose={() => setShowAnimationEditor(false)}
            animations={projectData?.animations ?? []}
            assets={projectData?.assets ?? []}
            onSave={(animations) => updateProjectData({ animations })}
            onCreateObject={handleAddObject}
        />}
        {showPoseAnimationEditor && <PoseAnimationEditor
            onClose={() => setShowPoseAnimationEditor(false)}
            assets={projectData?.assets ?? []}
            initialPoseAnimations={(projectData as any)?.poseAnimations ?? []}
            onSave={(poseAnimations) => {
                updateProjectData({ poseAnimations } as any);
                setShowPoseAnimationEditor(false);
                showToast("Animaciones de Poses guardadas con éxito");
            }}
        />}
        {showSpriteEditor && <SpriteEditor 
            assetToEdit={editingSpriteAsset}
            onSave={(asset) => {
                const existing = projectData?.assets.find(a => a.id === asset.id);
                if (existing) handleUpdateAsset(asset);
                else handleAddAsset(asset);
                setShowSpriteEditor(false);
            }}
            onClose={() => setShowSpriteEditor(false)}
        />}
        {showAudioLab && <AudioLab onClose={() => setShowAudioLab(false)} onAddAsset={handleAddAsset} />}
        {showSoundtrackEditor && <SoundtrackEditor onClose={() => setShowSoundtrackEditor(false)} onAddAsset={handleAddAsset} />}
        
        <Toast message={toast.message} show={toast.show} />
    </div>
  );
};

export default App;
