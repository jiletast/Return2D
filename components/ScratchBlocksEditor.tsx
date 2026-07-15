import React, { useState, useMemo } from 'react';
import type { GameEvent, Condition, Action, Scene, Animation, Variable, GameAsset, GameObject } from '../types';
import { useLanguage } from '../LanguageContext';
import { 
  Play, 
  Trash2, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Code, 
  Music, 
  Settings, 
  Activity, 
  Sparkles, 
  Film, 
  FolderOpen, 
  Layers, 
  Maximize, 
  User, 
  HelpCircle,
  Clock
} from 'lucide-react';

interface ScratchBlocksEditorProps {
  scene: Scene | undefined;
  animations: Animation[];
  assets: GameAsset[];
  globalObjects?: GameObject[];
  globalVariables: Variable[];
  allScenes: Scene[];
  onAddEvent: (event: GameEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onUpdateEvent: (event: GameEvent) => void;
}

export const ScratchBlocksEditor: React.FC<ScratchBlocksEditorProps> = ({
  scene,
  animations,
  assets,
  globalObjects,
  globalVariables,
  allScenes,
  onAddEvent,
  onDeleteEvent,
  onUpdateEvent,
}) => {
  const { t } = useLanguage();
  const [selectedBlockType, setSelectedBlockType] = useState<'trigger' | 'action'>('trigger');
  const [activeCategory, setActiveCategory] = useState<string>('core');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [activeScriptCategory, setActiveScriptCategory] = useState<string>('All');
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('script_categories_' + scene?.id);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    // Derive initial categories from existing block events
    const initial = new Set<string>(['General']);
    if (scene?.events) {
      scene.events.forEach(e => {
        if (e.category && e.category.trim() !== '') {
          initial.add(e.category.trim());
        }
      });
    }
    return Array.from(initial);
  });

  const saveCategories = (cats: string[]) => {
    setCustomCategories(cats);
    try {
      localStorage.setItem('script_categories_' + (scene?.id || 'default'), JSON.stringify(cats));
    } catch (e) {}
  };

  // Lists of assets/objects for dropdowns
  const objectNames = useMemo(() => scene?.gameObjects.map(obj => obj.name) ?? [], [scene]);
  const globalObjectNames = useMemo(() => globalObjects?.map(obj => obj.name) ?? [], [globalObjects]);
  const templateObjectNames = useMemo(() => {
    const names = new Set([...objectNames, ...globalObjectNames]);
    return Array.from(names);
  }, [objectNames, globalObjectNames]);

  const audioAssets = useMemo(() => assets.filter(a => a.type === 'audio'), [assets]);
  const videoAssets = useMemo(() => assets.filter(a => a.type === 'video'), [assets]);
  const globalVariableNames = useMemo(() => globalVariables.map(v => v.name), [globalVariables]);
  const sceneNames = useMemo(() => allScenes.map(s => s.name), [allScenes]);
  const blockEvents = useMemo(() => {
    return (scene?.events || []).filter(e => e.programmingMode === 'blocks');
  }, [scene?.events]);

  const filteredBlockEvents = useMemo(() => {
    return blockEvents.filter(e => {
      if (activeScriptCategory === 'All') return true;
      if (activeScriptCategory === 'Uncategorized') return !e.category || e.category === 'General';
      return e.category === activeScriptCategory;
    });
  }, [blockEvents, activeScriptCategory]);

  // Block Category Config
  const blockCategories = [
    { id: 'core', name: 'Eventos Base', color: 'bg-yellow-500 hover:bg-yellow-600 border-yellow-600 text-black' },
    { id: 'input', name: 'Entrada / Control', color: 'bg-orange-500 hover:bg-orange-600 border-orange-600 text-white' },
    { id: 'collision', name: 'Colisiones', color: 'bg-red-500 hover:bg-red-600 border-red-600 text-white' },
    { id: 'objectState', name: 'Física / Estado', color: 'bg-blue-500 hover:bg-blue-600 border-blue-600 text-white' },
    { id: 'variables', name: 'Variables', color: 'bg-indigo-500 hover:bg-indigo-600 border-indigo-600 text-white' },
    { id: 'audioVideo', name: 'Audio y Video', color: 'bg-purple-500 hover:bg-purple-600 border-purple-600 text-white' },
    { id: 'sceneUI', name: 'Escena y UI', color: 'bg-teal-500 hover:bg-teal-600 border-teal-600 text-white' },
    { id: 'system', name: 'Dispositivo', color: 'bg-slate-500 hover:bg-slate-600 border-slate-600 text-white' },
    { id: 'time', name: 'Tiempo', color: 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-black' },
    { id: 'rpg', name: 'Misiones/RPG', color: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-white' },
    { id: 'network', name: 'Multijugador', color: 'bg-cyan-500 hover:bg-cyan-600 border-cyan-600 text-black' },
  ];

  // Map block triggers
  const triggerPalette = [
    { trigger: 'OnStart', label: 'Al iniciar escena', category: 'core', defaultObject: 'System' },
    { trigger: 'Always', label: 'Siempre (Bucle infinito)', category: 'core', defaultObject: 'System' },
    
    { trigger: 'OnKeyPress', label: 'Al presionar tecla [key]', category: 'input', defaultObject: 'System', params: { key: 'space' } },
    { trigger: 'OnAnyKeyPress', label: 'Al presionar cualquier tecla', category: 'input', defaultObject: 'System' },
    { trigger: 'OnObjectClicked', label: 'Al hacer clic en este objeto', category: 'input', defaultObject: '' },
    { trigger: 'OnInteract', label: 'Al interactuar con objeto (E / Botón)', category: 'input', defaultObject: '' },
    { trigger: 'OnJoystickMove', label: 'Al mover joystick virtual', category: 'input', defaultObject: 'System' },
    { trigger: 'OnJoystickUp', label: 'Al soltar joystick virtual', category: 'input', defaultObject: 'System' },
    { trigger: 'OnJoystickDown', label: 'Al pulsar joystick abajo', category: 'input', defaultObject: 'System' },
    { trigger: 'OnJoystickLeft', label: 'Al pulsar joystick izquierda', category: 'input', defaultObject: 'System' },
    { trigger: 'OnJoystickRight', label: 'Al pulsar joystick derecha', category: 'input', defaultObject: 'System' },
    { trigger: 'OnButtonDown', label: 'Al presionar botón virtual [buttonName]', category: 'input', defaultObject: 'System', params: { buttonName: 'A' } },
    { trigger: 'OnButtonUp', label: 'Al soltar botón virtual [buttonName]', category: 'input', defaultObject: 'System', params: { buttonName: 'A' } },
    { trigger: 'OnTriggerDown', label: 'Al presionar gatillo [triggerName]', category: 'input', defaultObject: 'System', params: { triggerName: 'R2' } },
    { trigger: 'OnTriggerUp', label: 'Al soltar gatillo [triggerName]', category: 'input', defaultObject: 'System', params: { triggerName: 'R2' } },
    { trigger: 'OnConsoleCommand', label: 'Al ingresar comando de consola [command]', category: 'input', defaultObject: 'System', params: { command: 'cheat' } },
    
    { trigger: 'OnCollisionWith', label: 'Al colisionar con [target]', category: 'collision', defaultObject: '', needsTarget: true },
    { trigger: 'OnVerticalCollision', label: 'Al colisionar verticalmente con [target]', category: 'collision', defaultObject: '', needsTarget: true },
    { trigger: 'OnHorizontalCollision', label: 'Al colisionar horizontalmente con [target]', category: 'collision', defaultObject: '', needsTarget: true },
    
    { trigger: 'IsIdle', label: 'Si el objeto está quieto', category: 'objectState', defaultObject: '' },
    { trigger: 'IsRunning', label: 'Si el objeto está corriendo', category: 'objectState', defaultObject: '' },
    { trigger: 'IsJumping', label: 'Si el objeto está saltando', category: 'objectState', defaultObject: '' },
    { trigger: 'IsOnGround', label: 'Si el objeto está en el suelo', category: 'objectState', defaultObject: '' },
    { trigger: 'IsMoving', label: 'Si el objeto está moviéndose', category: 'objectState', defaultObject: '' },
    { trigger: 'OnAttack', label: 'Al atacar', category: 'objectState', defaultObject: '' },
    { trigger: 'OnHealthDepleted', label: 'Al agotarse la vida (HP <= 0)', category: 'objectState', defaultObject: '' },
    { trigger: 'IsClimbing', label: 'Si el objeto está escalando', category: 'objectState', defaultObject: '' },
    { trigger: 'IsLookingLeft', label: 'Si el objeto mira a la izquierda', category: 'objectState', defaultObject: '' },
    { trigger: 'IsLookingRight', label: 'Si el objeto mira a la derecha', category: 'objectState', defaultObject: '' },
    
    { trigger: 'IsMobile', label: 'Si es dispositivo móvil', category: 'system', defaultObject: 'System' },
    { trigger: 'IsPC', label: 'Si es ordenador / PC', category: 'system', defaultObject: 'System' },
    
    { trigger: 'CompareVariable', label: 'Si variable [variable] [operator] [value]', category: 'variables', defaultObject: 'System', params: { variable: '', operator: '==', value: '0' } },
    { trigger: 'CompareBooleanVariable', label: 'Si variable booleana [variable] es [valueBoolean]', category: 'variables', defaultObject: 'System', params: { variable: '', valueBoolean: true } },
    { trigger: 'CompareObjectVariable', label: 'Si variable de objeto [variable] [operator] [value]', category: 'variables', defaultObject: '', params: { variable: '', operator: '==', value: '0' } },
    { trigger: 'CompareObjectBooleanVariable', label: 'Si variable booleana de objeto [variable] es [valueBoolean]', category: 'variables', defaultObject: '', params: { variable: '', valueBoolean: true } },
    { trigger: 'CompareStat', label: 'Si stat [stat] [operator] [value]', category: 'variables', defaultObject: '', params: { stat: 'hp', operator: '==', value: '10' } },
    
    { trigger: 'OnTimerElapsed', label: 'Al terminar temporizador [timerName]', category: 'time', defaultObject: 'System', params: { timerName: 'timer1' } },
    { trigger: 'EveryXSeconds', label: 'Cada [interval] segundos', category: 'time', defaultObject: 'System', params: { interval: '1' } },
    
    { trigger: 'OnDialogueEnd', label: 'Al finalizar diálogo', category: 'sceneUI', defaultObject: 'System' },
    
    { trigger: 'IsMusicPlaying', label: 'Si hay música reproduciéndose', category: 'audioVideo', defaultObject: 'System' },
    
    { trigger: 'OnMatchFound', label: 'Al encontrar partida de red', category: 'network', defaultObject: 'System' },
    { trigger: 'OnPlayerJoined', label: 'Al unirse jugador a la red', category: 'network', defaultObject: 'System' },
    { trigger: 'OnPlayerLeft', label: 'Al salir jugador de la red', category: 'network', defaultObject: 'System' },
    { trigger: 'OnReceiveNetworkMessage', label: 'Al recibir mensaje de red [message]', category: 'network', defaultObject: 'System', params: { message: 'hello' } },
  ];

  // Map block actions
  const actionPalette = [
    { action: 'Destroy', label: 'Destruir objeto', category: 'objectState', defaultObject: '' },
    { action: 'CreateObject', label: 'Crear objeto [templateObjectName]', category: 'objectState', defaultObject: 'System', params: { templateObjectName: '' } },
    { action: 'SetObjectPosition', label: 'Mover a x: [x] y: [y]', category: 'objectState', defaultObject: '', params: { x: '0', y: '0' } },
    { action: 'TeleportToObject', label: 'Teletransportar a [targetObjectName]', category: 'objectState', defaultObject: '', params: { targetObjectName: '' } },
    { action: 'MoveObject', label: 'Mover en dirección [direction] con velocidad [speed]', category: 'objectState', defaultObject: '', params: { direction: 'right', speed: '100' } },
    { action: 'SetVelocityX', label: 'Fijar velocidad horizontal a [vx]', category: 'objectState', defaultObject: '', params: { vx: '0' } },
    { action: 'SetVelocityY', label: 'Fijar velocidad vertical a [vy]', category: 'objectState', defaultObject: '', params: { vy: '0' } },
    { action: 'MoveTo', label: 'Mover suave a x: [x] y: [y] en [duration]s', category: 'objectState', defaultObject: '', params: { x: '0', y: '0', duration: '1' } },
    { action: 'OscillateObject', label: 'Oscilar en eje [axis] distancia [distance] velocidad [speed]', category: 'objectState', defaultObject: '', params: { axis: 'x', distance: '50', speed: '2' } },
    { action: 'OscillateScale', label: 'Oscilar escala distancia [distance] velocidad [speed]', category: 'objectState', defaultObject: '', params: { distance: '0.2', speed: '2' } },
    { action: 'RotateContinuously', label: 'Rotar continuamente a velocidad [speed]', category: 'objectState', defaultObject: '', params: { speed: '50' } },
    { action: 'RotateObject', label: 'Rotar objeto a [rotation] grados', category: 'objectState', defaultObject: '', params: { rotation: '0' } },
    { action: 'RotateTo', label: 'Rotar suave a [rotation] en [duration]s', category: 'objectState', defaultObject: '', params: { rotation: '0', duration: '1' } },
    { action: 'ScaleObject', label: 'Establecer escala x: [scaleX] y: [scaleY]', category: 'objectState', defaultObject: '', params: { scaleX: '1', scaleY: '1' } },
    { action: 'ScaleTo', label: 'Escalar suave a x: [scaleX] y: [scaleY] en [duration]s', category: 'objectState', defaultObject: '', params: { scaleX: '1', scaleY: '1', duration: '1' } },
    { action: 'SetScale', label: 'Fijar escala x: [scaleX] y: [scaleY]', category: 'objectState', defaultObject: '', params: { scaleX: '1', scaleY: '1' } },
    { action: 'SetVisible', label: 'Establecer visibilidad [visible]', category: 'objectState', defaultObject: '', params: { visible: true } },
    { action: 'SetOpacity', label: 'Fijar opacidad a [opacity] (0-100)', category: 'objectState', defaultObject: '', params: { opacity: '100' } },
    { action: 'SetZIndex', label: 'Fijar capa z-index a [zIndex]', category: 'objectState', defaultObject: '', params: { zIndex: '1' } },
    { action: 'SetFlipX', label: 'Invertir horizontalmente [flip]', category: 'objectState', defaultObject: '', params: { flip: true } },
    { action: 'SetFlipY', label: 'Invertir verticalmente [flip]', category: 'objectState', defaultObject: '', params: { flip: true } },
    { action: 'SlideTo', label: 'Deslizar a x: [x] y: [y] en [duration]s', category: 'objectState', defaultObject: '', params: { x: '0', y: '0', duration: '1' } },
    { action: 'SetDraggable', label: 'Configurar arrastrable: [enabled] (Límites x: [minX] a [maxX], y: [minY] a [maxY])', category: 'objectState', defaultObject: '', params: { enabled: true, lockX: false, lockY: false, minX: '', maxX: '', minY: '', maxY: '' } },
    { action: 'EnableCollision', label: 'Activar colisión', category: 'objectState', defaultObject: '' },
    { action: 'DisableCollision', label: 'Desactivar colisión', category: 'objectState', defaultObject: '' },
    { action: 'GenerateObjectAt', label: 'Generar objeto [templateObjectName] en posición de [targetObjectName]', category: 'objectState', defaultObject: 'System', params: { templateObjectName: '', targetObjectName: '' } },
    { action: 'ForceJump', label: 'Hacer saltar con fuerza [jumpForce]', category: 'objectState', defaultObject: '', params: { jumpForce: '400' } },
    { action: 'TriggerAttack', label: 'Disparar animación de ataque', category: 'objectState', defaultObject: '' },
    { action: 'Shoot', label: 'Disparar proyectil con daño [damage] velocidad [speed]', category: 'objectState', defaultObject: '', params: { damage: '10', speed: '300' } },
    { action: 'SetParent', label: 'Hacer hijo de [parentName]', category: 'objectState', defaultObject: '', params: { parentName: '' } },
    { action: 'Knockback', label: 'Empujar con fuerza [force] desde [fromObjectName]', category: 'objectState', defaultObject: '', params: { force: '200', fromObjectName: 'Self' } },
    
    { action: 'PlayAnimation', label: 'Iniciar animación [animationId]', category: 'audioVideo', defaultObject: '', params: { animationId: '' } },
    { action: 'PlayVideo', label: 'Reproducir video [videoAssetId]', category: 'audioVideo', defaultObject: 'System', params: { videoAssetId: '' } },
    { action: 'PauseVideo', label: 'Pausar video [videoAssetId]', category: 'audioVideo', defaultObject: 'System', params: { videoAssetId: '' } },
    { action: 'StopVideo', label: 'Detener reproducción de video', category: 'audioVideo', defaultObject: 'System' },
    { action: 'PlaySound', label: 'Reproducir sonido [soundId] con bucle [loop]', category: 'audioVideo', defaultObject: 'System', params: { soundId: '', loop: false } },
    { action: 'SetBackgroundMusic', label: 'Fijar música de fondo [soundId] con bucle [loop]', category: 'audioVideo', defaultObject: 'System', params: { soundId: '', loop: true } },
    { action: 'PauseBackgroundMusic', label: 'Pausar música de fondo', category: 'audioVideo', defaultObject: 'System' },
    { action: 'ResumeBackgroundMusic', label: 'Reanudar música de fondo', category: 'audioVideo', defaultObject: 'System' },
    { action: 'StopBackgroundMusic', label: 'Detener música de fondo', category: 'audioVideo', defaultObject: 'System' },
    { action: 'SetBackgroundMusicVolume', label: 'Fijar volumen de música a [volume]%', category: 'audioVideo', defaultObject: 'System', params: { volume: '100' } },
    
    { action: 'AddToVariable', label: 'Sumar [value] a variable global [variable]', category: 'variables', defaultObject: 'System', params: { variable: '', value: '1' } },
    { action: 'SetVariable', label: 'Establecer variable global [variable] a [value]', category: 'variables', defaultObject: 'System', params: { variable: '', value: '' } },
    { action: 'SetBooleanVariable', label: 'Fijar variable booleana [variable] a [valueBoolean]', category: 'variables', defaultObject: 'System', params: { variable: '', valueBoolean: true } },
    { action: 'ToggleBooleanVariable', label: 'Alternar variable booleana [variable]', category: 'variables', defaultObject: 'System', params: { variable: '' } },
    { action: 'AddToObjectVariable', label: 'Sumar [value] a var. de objeto [variable]', category: 'variables', defaultObject: '', params: { variable: '', value: '1' } },
    { action: 'SetObjectVariable', label: 'Fijar var. de objeto [variable] a [value]', category: 'variables', defaultObject: '', params: { variable: '', value: '' } },
    { action: 'SetObjectBooleanVariable', label: 'Fijar var. booleana de objeto [variable] a [valueBoolean]', category: 'variables', defaultObject: '', params: { variable: '', valueBoolean: true } },
    { action: 'ToggleObjectBooleanVariable', label: 'Alternar var. booleana de objeto [variable]', category: 'variables', defaultObject: '', params: { variable: '' } },
    { action: 'ModifyStat', label: 'Modificar stat [stat] con operación [operation] valor [value]', category: 'variables', defaultObject: '', params: { stat: 'hp', operation: 'subtract', value: '10' } },
    { action: 'GainHealth', label: 'Ganar [value] de HP', category: 'variables', defaultObject: '', params: { value: '20' } },
    { action: 'LoseHealth', label: 'Perder [value] de HP', category: 'variables', defaultObject: '', params: { value: '20' } },
    { action: 'SaveGame', label: 'Guardar partida en ranura [slot]', category: 'variables', defaultObject: 'System', params: { slot: '1' } },
    { action: 'LoadGame', label: 'Cargar partida de ranura [slot]', category: 'variables', defaultObject: 'System', params: { slot: '1' } },
    
    { action: 'GoToScene', label: 'Ir a escena [sceneName]', category: 'sceneUI', defaultObject: 'System', params: { sceneName: '' } },
    { action: 'SetSceneUnlocked', label: 'Establecer escena [sceneName] desbloqueada a [valueBoolean]', category: 'sceneUI', defaultObject: 'System', params: { sceneName: '', valueBoolean: true } },
    { trigger: 'IsSceneUnlocked', label: '¿Está desbloqueada la escena [sceneName]?', category: 'sceneUI', defaultObject: 'System', params: { sceneName: '' } },
    { action: 'SetBackgroundColor', label: 'Fijar fondo de escena a [color]', category: 'sceneUI', defaultObject: 'System', params: { color: '#000000' } },
    { action: 'SetCameraZoom', label: 'Fijar zoom de cámara a [zoomLevel]', category: 'sceneUI', defaultObject: 'System', params: { zoomLevel: '1' } },
    { action: 'SetUIText', label: 'Establecer texto UI a: [text]', category: 'sceneUI', defaultObject: '', params: { text: '' } },
    { action: 'SetJoystickEnabled', label: 'Establecer Joystick activado: [enabled]', category: 'sceneUI', defaultObject: 'System', params: { enabled: true } },
    { action: 'ShowDialogue', label: 'Mostrar diálogo: [dialogueText]', category: 'sceneUI', defaultObject: 'System', params: { dialogueText: '¡Hola!' } },
    { action: 'ShowConsole', label: 'Mostrar consola de depuración', category: 'sceneUI', defaultObject: 'System' },
    
    { action: 'StartTimer', label: 'Iniciar temporizador [timerName] con duración [duration]s', category: 'time', defaultObject: 'System', params: { timerName: 'timer1', duration: '5' } },
    { action: 'StopTimer', label: 'Detener temporizador [timerName]', category: 'time', defaultObject: 'System', params: { timerName: 'timer1' } },
    { action: 'Wait', label: 'Esperar [duration] segundos y después continuar', category: 'time', defaultObject: 'System', params: { duration: '2' } },
    
    { action: 'SetQuestState', label: 'Fijar estado de misión [questId] a [questState]', category: 'rpg', defaultObject: 'System', params: { questId: '', questState: 'active' } },
    
    { action: 'CreateMatch', label: 'Crear partida de red con máx. [maxPlayers] jugadores', category: 'network', defaultObject: 'System', params: { maxPlayers: '4' } },
    { action: 'JoinMatch', label: 'Unirse a partida de red con ID [matchId]', category: 'network', defaultObject: 'System', params: { matchId: '' } },
    { action: 'SendNetworkMessage', label: 'Enviar mensaje de red [message]', category: 'network', defaultObject: 'System', params: { message: '' } },
    { action: 'SetPlayerName', label: 'Establecer nombre de jugador de red a [name]', category: 'network', defaultObject: 'System', params: { name: '' } },
    { action: 'CreatePlayers', label: 'Crear [count] jugadores de red', category: 'network', defaultObject: 'System', params: { count: '1' } },
    { action: 'DisconnectPlayers', label: 'Desconectar de la red', category: 'network', defaultObject: 'System' },
  ];

  // Helper to add a new event script container
  const handleAddNewScript = (triggerType: Condition['trigger'], defaultObj: string, initialParams: any = {}) => {
    const newEvent: GameEvent = {
      id: `evt_${Date.now()}`,
      conditions: [{
        object: defaultObj || templateObjectNames[0] || 'Player',
        trigger: triggerType,
        params: initialParams
      }],
      actions: [],
      dimension: '2D',
      programmingMode: 'blocks',
      category: activeScriptCategory !== 'All' && activeScriptCategory !== 'Uncategorized' ? activeScriptCategory : 'General'
    };
    onAddEvent(newEvent);
    setSelectedEventId(newEvent.id);
  };

  // Helper to add an action block inside a script
  const handleAddActionToScript = (eventId: string, actionType: Action['action'], defaultObj: string, initialParams: any = {}) => {
    const evt = scene?.events.find(e => e.id === eventId);
    if (!evt) return;

    const newAction: Action = {
      object: defaultObj || templateObjectNames[0] || 'Player',
      action: actionType,
      params: initialParams
    };

    const updatedEvent = {
      ...evt,
      actions: [...evt.actions, newAction]
    };
    onUpdateEvent(updatedEvent);
  };

  // Update a specific condition within a script
  const handleUpdateCondition = (eventId: string, condIndex: number, fields: Partial<Condition>) => {
    const evt = scene?.events.find(e => e.id === eventId);
    if (!evt) return;

    const newConditions = [...evt.conditions];
    newConditions[condIndex] = { ...newConditions[condIndex], ...fields };

    onUpdateEvent({ ...evt, conditions: newConditions });
  };

  // Update a specific action within a script
  const handleUpdateAction = (eventId: string, actIndex: number, fields: Partial<Action>) => {
    const evt = scene?.events.find(e => e.id === eventId);
    if (!evt) return;

    const newActions = [...evt.actions];
    newActions[actIndex] = { ...newActions[actIndex], ...fields };

    onUpdateEvent({ ...evt, actions: newActions });
  };

  // Delete an action from a script
  const handleDeleteAction = (eventId: string, actIndex: number) => {
    const evt = scene?.events.find(e => e.id === eventId);
    if (!evt) return;

    const newActions = evt.actions.filter((_, idx) => idx !== actIndex);
    onUpdateEvent({ ...evt, actions: newActions });
  };

  // Reorder actions
  const handleMoveAction = (eventId: string, actIndex: number, direction: 'up' | 'down') => {
    const evt = scene?.events.find(e => e.id === eventId);
    if (!evt) return;

    const newActions = [...evt.actions];
    const targetIdx = direction === 'up' ? actIndex - 1 : actIndex + 1;
    if (targetIdx < 0 || targetIdx >= newActions.length) return;

    const temp = newActions[actIndex];
    newActions[actIndex] = newActions[targetIdx];
    newActions[targetIdx] = temp;

    onUpdateEvent({ ...evt, actions: newActions });
  };

  // Render Scratch block dynamic parameters
  const renderInlineInputs = (
    type: 'condition' | 'action', 
    eventId: string, 
    blockIdx: number, 
    labelTemplate: string, 
    params: any,
    triggerOrActionValue: string
  ) => {
    // Parse the template, e.g. "Mover a x: [x] y: [y]" or "Al colisionar con [target]"
    const parts = labelTemplate.split(/(\[[a-zA-Z0-9_]+\])/g);

    return (
      <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
        {parts.map((part, i) => {
          if (part.startsWith('[') && part.endsWith(']')) {
            const paramName = part.slice(1, -1);
            
            // Render specific dropdown or input depending on parameter name
            switch (paramName) {
              case 'target':
              case 'targetObjectName':
              case 'templateObjectName':
              case 'parentName':
              case 'fromObjectName': {
                const val = params?.[paramName] ?? '';
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none focus:border-white/50"
                    value={val}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="">{paramName === 'parentName' ? 'Ninguno (Padre)' : '- Objeto -'}</option>
                    {templateObjectNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                );
              }
              case 'direction': {
                const val = params?.[paramName] ?? 'right';
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="right">Derecha</option>
                    <option value="left">Izquierda</option>
                    <option value="up">Arriba</option>
                    <option value="down">Abajo</option>
                  </select>
                );
              }
              case 'axis': {
                const val = params?.[paramName] ?? 'x';
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="x">Eje X</option>
                    <option value="y">Eje Y</option>
                  </select>
                );
              }
              case 'questState': {
                const val = params?.[paramName] ?? 'active';
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="active">Activa</option>
                    <option value="completed">Completada</option>
                    <option value="failed">Fallida</option>
                  </select>
                );
              }
              case 'buttonName': {
                const val = params?.[paramName] ?? 'A';
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="A">Botón A</option>
                    <option value="B">Botón B</option>
                    <option value="X">Botón X</option>
                    <option value="Y">Botón Y</option>
                    <option value="DpadUp">Cruz Arriba</option>
                    <option value="DpadDown">Cruz Abajo</option>
                    <option value="DpadLeft">Cruz Izquierda</option>
                    <option value="DpadRight">Cruz Derecha</option>
                    <option value="Start">Start</option>
                    <option value="Select">Select</option>
                  </select>
                );
              }
              case 'triggerName': {
                const val = params?.[paramName] ?? 'R2';
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="L1">L1</option>
                    <option value="R1">R1</option>
                    <option value="L2">L2</option>
                    <option value="R2">R2</option>
                    <option value="ZL">ZL</option>
                    <option value="ZR">ZR</option>
                  </select>
                );
              }
              case 'key': {
                const val = params?.[paramName] ?? 'space';
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="space">Espacio</option>
                    <option value="enter">Enter</option>
                    <option value="arrowup">Flecha Arriba</option>
                    <option value="arrowdown">Flecha Abajo</option>
                    <option value="arrowleft">Flecha Izquierda</option>
                    <option value="arrowright">Flecha Derecha</option>
                    <option value="w">Tecla W</option>
                    <option value="a">Tecla A</option>
                    <option value="s">Tecla S</option>
                    <option value="d">Tecla D</option>
                    <option value="e">Tecla E</option>
                    <option value="f">Tecla F</option>
                    <option value="q">Tecla Q</option>
                    <option value="z">Tecla Z</option>
                    <option value="x">Tecla X</option>
                    <option value="c">Tecla C</option>
                    <option value="shift">Shift</option>
                    <option value="control">Control</option>
                    <option value="escape">Escape</option>
                  </select>
                );
              }
              case 'animationId': {
                const val = params?.[paramName] ?? '';
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="">- Animación -</option>
                    {animations.map(anim => (
                      <option key={anim.id} value={anim.id}>{anim.name}</option>
                    ))}
                  </select>
                );
              }
              case 'soundId': {
                const val = params?.[paramName] ?? '';
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="">- Audio -</option>
                    {audioAssets.map(asset => (
                      <option key={asset.id} value={asset.id}>{asset.name}</option>
                    ))}
                  </select>
                );
              }
              case 'loop': {
                const isBgm = triggerOrActionValue === 'SetBackgroundMusic';
                const defaultVal = isBgm ? true : false;
                const val = params?.[paramName] !== undefined ? (params?.[paramName] === true || params?.[paramName] === 'true') : defaultVal;
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val ? 'true' : 'false'}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value === 'true' } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="true">Bucle: Sí</option>
                    <option value="false">Bucle: No</option>
                  </select>
                );
              }
              case 'videoAssetId': {
                const val = params?.[paramName] ?? '';
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="">- Video -</option>
                    {videoAssets.map(asset => (
                      <option key={asset.id} value={asset.id}>{asset.name}</option>
                    ))}
                  </select>
                );
              }
              case 'sceneName': {
                const val = params?.[paramName] ?? '';
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="">- Escena -</option>
                    {sceneNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                );
              }
              case 'variable': {
                const val = params?.[paramName] ?? '';
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="">- Variable -</option>
                    {globalVariableNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                );
              }
              case 'operator': {
                const val = params?.[paramName] ?? '==';
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none font-bold"
                    value={val}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="==">=</option>
                    <option value="!=">≠</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<=">&lt;=</option>
                  </select>
                );
              }
              case 'valueBoolean': {
                const val = params?.[paramName] ?? true;
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val ? 'true' : 'false'}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value === 'true' } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="true">Verdadero</option>
                    <option value="false">Falso</option>
                  </select>
                );
              }
              case 'enabled': {
                const val = params?.[paramName] !== false && params?.[paramName] !== 'false';
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val ? 'true' : 'false'}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value === 'true' } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="true">Sí (Activar)</option>
                    <option value="false">No (Desactivar)</option>
                  </select>
                );
              }
              case 'visible': {
                const val = params?.[paramName] !== false;
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val ? 'true' : 'false'}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value === 'true' } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="true">Visible</option>
                    <option value="false">Oculto</option>
                  </select>
                );
              }
              case 'flip': {
                const val = !!params?.[paramName];
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val ? 'true' : 'false'}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value === 'true' } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="true">Invertido</option>
                    <option value="false">Normal</option>
                  </select>
                );
              }
              case 'stat': {
                const val = params?.[paramName] ?? 'hp';
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="hp">Vida (HP)</option>
                    <option value="maxHp">Máx. Vida</option>
                    <option value="attack">Fuerza Ataque</option>
                  </select>
                );
              }
              case 'operation': {
                const val = params?.[paramName] ?? 'subtract';
                return (
                  <select
                    key={i}
                    className="bg-black/40 border border-white/20 text-white rounded px-1 py-0.5 text-xs focus:outline-none"
                    value={val}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  >
                    <option value="subtract">Restar</option>
                    <option value="add">Sumar</option>
                    <option value="set">Fijar</option>
                  </select>
                );
              }
              case 'color': {
                const val = params?.[paramName] ?? '#000000';
                return (
                  <input
                    key={i}
                    type="color"
                    className="bg-transparent border-none w-6 h-6 p-0 cursor-pointer rounded"
                    value={val}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  />
                );
              }
              // Standard inputs for numbers or texts
              default: {
                const val = params?.[paramName] ?? '';
                const isNumeric = ['x', 'y', 'vx', 'vy', 'speed', 'duration', 'interval', 'jumpForce', 'value', 'count', 'zoomLevel', 'volume', 'opacity', 'zIndex', 'scaleX', 'scaleY', 'rotation'].includes(paramName);
                return (
                  <input
                    key={i}
                    type={isNumeric ? "number" : "text"}
                    placeholder={paramName}
                    className="bg-black/40 border border-white/20 text-white rounded px-1.5 py-0.5 text-xs w-16 focus:outline-none focus:border-white/50 text-center font-bold"
                    value={val}
                    onChange={(e) => {
                      const update = { params: { ...params, [paramName]: e.target.value } };
                      if (type === 'condition') handleUpdateCondition(eventId, blockIdx, update);
                      else handleUpdateAction(eventId, blockIdx, update);
                    }}
                  />
                );
              }
            }
          }
          return <span key={i} className="text-white/90 font-semibold">{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0 bg-[#0f111a] text-white">
      {/* 1. BLOCKS PALETTE (Sidebar) */}
      <div className="w-full md:w-80 flex flex-col border-r border-white/10 shrink-0 bg-[#121520]">
        {/* Toggle between Block Types */}
        <div className="flex border-b border-white/10 p-2 gap-1.5 shrink-0">
          <button
            onClick={() => setSelectedBlockType('trigger')}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              selectedBlockType === 'trigger'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-white/70'
            }`}
          >
            <Play size={12} className="text-yellow-400" />
            Disparadores (Triggers)
          </button>
          <button
            onClick={() => setSelectedBlockType('action')}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              selectedBlockType === 'action'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-white/70'
            }`}
          >
            <Code size={12} className="text-blue-400" />
            Acciones (Do)
          </button>
        </div>

        {/* Categories Grid */}
        <div className="p-2 grid grid-cols-3 gap-1 shrink-0 border-b border-white/10 bg-black/20">
          {blockCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`py-1 rounded text-[10px] font-bold text-center border transition-all ${
                activeCategory === cat.id
                  ? `${cat.color} scale-105 shadow-md`
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Dynamic Block Palette List */}
        <div className="flex-grow overflow-y-auto p-3 space-y-3 min-h-0 bg-black/10">
          <div className="text-[10px] text-white/50 uppercase tracking-wider font-bold mb-1">
            {selectedBlockType === 'trigger' 
              ? 'Haz clic en un Disparador para crear un nuevo Evento:' 
              : 'Selecciona un Evento a la derecha y haz clic para añadirle esta Acción:'}
          </div>

          {selectedBlockType === 'trigger' ? (
            // Triggers
            triggerPalette
              .filter(t => t.category === activeCategory)
              .map((tp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAddNewScript(tp.trigger as any, tp.defaultObject, tp.params)}
                  className="w-full text-left p-3 rounded-r-xl rounded-l-md border-l-4 border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 font-semibold text-xs flex items-center justify-between gap-2 shadow-sm border border-white/5 transition-all group active:scale-95"
                >
                  <span className="truncate">{tp.label}</span>
                  <Plus size={14} className="text-yellow-400 opacity-60 group-hover:opacity-100 shrink-0" />
                </button>
              ))
          ) : (
            // Actions
            actionPalette
              .filter(a => a.category === activeCategory)
              .map((ap, idx) => {
                const isDisabled = blockEvents.length === 0;
                return (
                  <button
                    key={idx}
                    disabled={isDisabled}
                    onClick={() => {
                      const targetEventId = selectedEventId || (blockEvents[0]?.id);
                      if (targetEventId) {
                        handleAddActionToScript(targetEventId, ap.action as any, ap.defaultObject, ap.params);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-md border-l-4 border-blue-500 font-semibold text-xs flex items-center justify-between gap-2 shadow-sm border border-white/5 transition-all group active:scale-95 ${
                      isDisabled 
                        ? 'opacity-40 cursor-not-allowed bg-white/5 border-gray-500 text-gray-400' 
                        : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    <span className="truncate">{ap.label}</span>
                    <Plus size={14} className="text-blue-400 opacity-60 group-hover:opacity-100 shrink-0" />
                  </button>
                );
              })
          )}

          {selectedBlockType === 'action' && blockEvents.length === 0 && (
            <div className="p-3 text-[11px] text-white/40 italic text-center bg-white/5 rounded-lg border border-white/5 border-dashed">
              Primero debes crear al menos un Bloque de Evento (Disparador) para poder añadirle acciones.
            </div>
          )}
        </div>
      </div>

      {/* 2. WORKSPACE CANVAS (Center area) */}
      <div className="flex-grow flex flex-col min-w-0 bg-[#0c0d14]">
        {/* Workspace Toolbar / Header */}
        <div className="p-3 border-b border-white/10 shrink-0 flex items-center justify-between bg-[#111420]">
          <div className="flex items-center gap-2">
            <Sparkles className="text-indigo-400" size={16} />
            <h3 className="font-bold text-sm">Espacio de Bloques Visuales</h3>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-1.5 py-0.5 rounded-full">
              {blockEvents.length} scripts
            </span>
          </div>
          <span className="text-[11px] text-white/50 italic hidden sm:inline">
            Configura y encaja bloques para programar tu videojuego sin escribir código
          </span>
        </div>

        {/* Horizontal Categories Tabs */}
        <div className="px-4 py-2 border-b border-white/5 bg-[#141829] flex items-center justify-between gap-4 shrink-0 overflow-x-auto scrollbar-thin">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-white/40 text-[11px] font-semibold flex items-center gap-1 mr-1">
              <Layers size={12} className="text-indigo-400" />
              Categorías de Scripts:
            </span>
            <button
              onClick={() => setActiveScriptCategory('All')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                activeScriptCategory === 'All'
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm scale-105'
                  : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Todos ({blockEvents.length})
            </button>
            <button
              onClick={() => setActiveScriptCategory('Uncategorized')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                activeScriptCategory === 'Uncategorized'
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm scale-105'
                  : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              General ({blockEvents.filter(e => !e.category || e.category === 'General').length})
            </button>
            {customCategories.filter(c => c !== 'General').map(cat => {
              const count = blockEvents.filter(e => e.category === cat).length;
              return (
                <div key={cat} className="flex items-center gap-1 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all pl-1 pr-2">
                  <button
                    onClick={() => setActiveScriptCategory(cat)}
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-all ${
                      activeScriptCategory === cat
                        ? 'bg-indigo-600 border-none text-white shadow-sm scale-105'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                  {/* Delete category button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`¿Estás seguro de que quieres eliminar la categoría "${cat}"? Los scripts en ella volverán a General.`)) {
                        const updated = customCategories.filter(c => c !== cat);
                        saveCategories(updated);
                        blockEvents.forEach(evt => {
                          if (evt.category === cat) {
                            onUpdateEvent({ ...evt, category: 'General' });
                          }
                        });
                        if (activeScriptCategory === cat) {
                          setActiveScriptCategory('All');
                        }
                      }
                    }}
                    title="Eliminar categoría"
                    className="text-white/30 hover:text-red-400 text-[10px] ml-0.5 focus:outline-none"
                  >
                    &times;
                  </button>
                </div>
              );
            })}
          </div>
          
          {/* Add Category Shortcut Button */}
          <button
            onClick={() => {
              const name = prompt('Introduce el nombre de la nueva categoría para organizar tus scripts:');
              if (name && name.trim() !== '') {
                const trimmed = name.trim();
                if (!customCategories.includes(trimmed)) {
                  const updated = [...customCategories, trimmed];
                  saveCategories(updated);
                  setActiveScriptCategory(trimmed);
                }
              }
            }}
            className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-md text-xs font-semibold flex items-center gap-1 shrink-0 border border-indigo-500/20 active:scale-95 transition-all"
          >
            <Plus size={12} />
            Crear Categoría
          </button>
        </div>

        {/* Blocks Workspace Scroll View */}
        <div className="flex-grow overflow-y-auto p-4 space-y-6 min-h-0 bg-radial-gradient">
          {filteredBlockEvents.map((event, sIdx) => {
            const isSelected = selectedEventId === event.id;
            const mainCond = event.conditions[0] || { object: 'System', trigger: 'OnStart', params: {} };
            const triggerLabel = triggerPalette.find(tp => tp.trigger === mainCond.trigger)?.label || mainCond.trigger;

            return (
              <div 
                key={event.id || sIdx}
                onClick={() => setSelectedEventId(event.id)}
                className={`relative rounded-xl border transition-all ${
                  isSelected 
                    ? 'border-indigo-500 bg-[#131626] shadow-2xl ring-1 ring-indigo-500/30' 
                    : 'border-white/10 bg-[#11131c]/60 hover:bg-[#11131c]/90'
                }`}
              >
                {/* Visual Connector / Puzzle Top Accent */}
                <div className="absolute -top-3 left-6 w-12 h-3 bg-yellow-500 rounded-t-lg border-t border-x border-yellow-400"></div>

                {/* SCRIPT HEADER BLOCK (Trigger block / Condition) */}
                <div className="p-4 bg-yellow-500/10 rounded-t-xl border-b border-white/5 flex flex-col gap-2 relative">
                  {/* Script Controls */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {/* Category Selector */}
                    <div className="flex items-center gap-1 bg-[#111420]/80 border border-white/10 px-2 py-0.5 rounded text-white text-[11px] focus-within:border-indigo-500/50 transition-all">
                      <span className="text-white/40 text-[9px] uppercase font-bold">Cat:</span>
                      <select
                        className="bg-transparent border-none text-white text-[11px] font-semibold focus:outline-none cursor-pointer pr-1 py-0 select-none"
                        value={event.category || 'General'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__new__') {
                            const newCat = prompt('Introduce el nombre de la nueva categoría:');
                            if (newCat && newCat.trim() !== '') {
                              const trimmed = newCat.trim();
                              if (!customCategories.includes(trimmed)) {
                                const updated = [...customCategories, trimmed];
                                saveCategories(updated);
                              }
                              onUpdateEvent({ ...event, category: trimmed });
                            }
                          } else {
                            onUpdateEvent({ ...event, category: val });
                          }
                        }}
                      >
                        <option value="General" className="bg-[#111420] text-white">General</option>
                        {customCategories.filter(c => c !== 'General').map(cat => (
                          <option key={cat} value={cat} className="bg-[#111420] text-white">{cat}</option>
                        ))}
                        <option value="__new__" className="bg-[#111420] text-indigo-300 font-bold">+ Nueva categoría...</option>
                      </select>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEvent(event.id);
                        if (isSelected) setSelectedEventId(null);
                      }}
                      title="Eliminar este Script de Bloques"
                      className="p-1.5 bg-red-950/40 rounded text-red-400 hover:bg-red-700 hover:text-white transition-all border border-red-500/10 active:scale-95"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Trigger Header */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-yellow-500 text-black font-bold text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                      <Play size={10} fill="currentColor" />
                      Disparador
                    </div>
                    {/* Inline Select for Target Object */}
                    <span className="text-white/40 text-xs font-semibold">Cuando</span>
                    <select
                      className="bg-black/50 border border-yellow-500/40 text-yellow-300 rounded px-1.5 py-0.5 text-xs focus:outline-none font-bold"
                      value={mainCond.object ?? ''}
                      onChange={(e) => handleUpdateCondition(event.id, 0, { object: e.target.value })}
                    >
                      <option value="System">Sistema (General)</option>
                      {templateObjectNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>

                    {/* Trigger Inline Inputs & Parameter Configuration */}
                    {renderInlineInputs(
                      'condition', 
                      event.id, 
                      0, 
                      triggerLabel, 
                      mainCond.params, 
                      mainCond.trigger
                    )}
                  </div>
                </div>

                {/* SCRIPT ACTIONS AREA (Nested block container) */}
                <div className="p-4 bg-black/40 min-h-[60px] rounded-b-xl border-t border-white/5 space-y-2 flex flex-col justify-start">
                  {event.actions.map((act, aIdx) => {
                    const actLabel = actionPalette.find(ap => ap.action === act.action)?.label || act.action;
                    return (
                      <div 
                        key={aIdx}
                        className="bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 relative pl-8 group transition-all"
                      >
                        {/* Puzzle snap connector visual element */}
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-60">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        </div>

                        {/* Action details & dynamic parameters */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1 bg-blue-500 text-white font-bold text-[9px] px-1 py-0.5 rounded uppercase shrink-0">
                            Hacer
                          </div>
                          {/* Target Object for the action */}
                          <select
                            className="bg-black/50 border border-blue-500/40 text-blue-300 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                            value={act.object ?? ''}
                            onChange={(e) => handleUpdateAction(event.id, aIdx, { object: e.target.value })}
                          >
                            <option value="System">Sistema</option>
                            <option value="Self">Sí Mismo (Self)</option>
                            {templateObjectNames.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>

                          {/* Dynamic Action visual inputs */}
                          {renderInlineInputs(
                            'action', 
                            event.id, 
                            aIdx, 
                            actLabel, 
                            act.params, 
                            act.action
                          )}
                        </div>

                        {/* Action block order and deletion controls */}
                        <div className="flex items-center gap-1 shrink-0 ml-auto">
                          <button
                            onClick={() => handleMoveAction(event.id, aIdx, 'up')}
                            disabled={aIdx === 0}
                            title="Subir Bloque"
                            className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-all disabled:opacity-20 disabled:pointer-events-none"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            onClick={() => handleMoveAction(event.id, aIdx, 'down')}
                            disabled={aIdx === event.actions.length - 1}
                            title="Bajar Bloque"
                            className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-all disabled:opacity-20 disabled:pointer-events-none"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteAction(event.id, aIdx)}
                            title="Eliminar Acción"
                            className="p-1.5 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-all ml-1.5"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty Slot / Snapping feedback */}
                  {event.actions.length === 0 && (
                    <div className="py-4 text-center text-white/30 text-xs border border-dashed border-white/10 rounded-lg bg-black/10">
                      Sin acciones. ¡Añade acciones seleccionando un bloque a la izquierda!
                    </div>
                  )}

                  {/* Convenient action insertion button at bottom of stack */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleAddActionToScript(event.id, 'Destroy', 'Player')}
                      className="px-2.5 py-1 text-[11px] bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/40 border border-blue-500/20 font-bold transition-all flex items-center gap-1 active:scale-95"
                    >
                      <Plus size={11} />
                      + Añadir Acción Base
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty state for workspace */}
          {blockEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-black/20 rounded-xl border border-dashed border-white/10">
              <Sparkles size={40} className="text-yellow-400/60 animate-bounce mb-3" />
              <h4 className="font-bold text-sm text-white/80 mb-1">Tu Espacio de Bloques está vacío</h4>
              <p className="text-xs text-white/40 max-w-sm mb-4">
                Comienza haciendo clic en cualquier bloque de <b>Disparador (Eventos Base)</b> de la paleta izquierda para crear tu primer bloque de programación.
              </p>
              <button
                onClick={() => handleAddNewScript('OnStart', 'System')}
                className="px-4 py-2 bg-yellow-500 text-black font-bold text-xs rounded hover:bg-yellow-400 transition-all flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <Plus size={14} />
                Crear bloque de inicio (Al iniciar escena)
              </button>
            </div>
          )}

          {/* Empty state for filtered workspace */}
          {blockEvents.length > 0 && filteredBlockEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-black/20 rounded-xl border border-dashed border-white/10">
              <Layers size={40} className="text-indigo-400/60 mb-3" />
              <h4 className="font-bold text-sm text-white/80 mb-1">No hay scripts en "{activeScriptCategory}"</h4>
              <p className="text-xs text-white/40 max-w-sm mb-4">
                No hay ningún script asignado a esta categoría todavía. Puedes mover scripts existentes aquí usando el menú desplegable "Cat" en la cabecera de cada script o crear un disparador nuevo en esta categoría.
              </p>
              <button
                onClick={() => handleAddNewScript('OnStart', 'System')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded transition-all flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <Plus size={14} />
                Crear script en esta categoría
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
