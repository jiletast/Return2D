
import React, { useState, useMemo } from 'react';
import type { GameEvent, Condition, Action, Scene, Animation, Variable, GameAsset, GameObject } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { EditIcon } from './icons/EditIcon';
import { useLanguage } from '../LanguageContext';
import { ScratchBlocksEditor } from './ScratchBlocksEditor';

interface EventEditorProps {
  onClose: () => void;
  onAddEvent: (event: GameEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onUpdateEvent: (event: GameEvent) => void;
  scene: Scene | undefined;
  animations: Animation[];
  assets: GameAsset[];
  globalObjects?: GameObject[];
  globalVariables: Variable[];
  allScenes: Scene[];
}

// FIX: Explicitly type categorizedTriggerOptions to avoid type widening of string literals and ensure optional properties are recognized.
const categorizedTriggerOptions: {
    category: string;
    options: {
        value: Condition['trigger'];
        label: string;
        needsParams?: string[];
        needsTarget?: boolean;
    }[];
}[] = [
    { category: 'event.category.core', options: [
        { value: 'OnStart', label: 'event.trigger.onStart' },
        { value: 'Always', label: 'event.trigger.always' },
    ]},
    { category: 'event.category.input', options: [
        { value: 'OnKeyPress', label: 'event.trigger.onKeyPress', needsParams: ['key'] },
        { value: 'OnAnyKeyPress', label: 'event.trigger.onAnyKeyPress' },
        { value: 'OnObjectClicked', label: 'event.trigger.onObjectClicked' },
        { value: 'OnInteract', label: 'Al interactuar con objeto [E / Botón]' },
        { value: 'OnJoystickMove', label: 'event.trigger.onJoystickMove' },
        { value: 'OnJoystickUp', label: 'event.trigger.onJoystickUp' },
        { value: 'OnJoystickDown', label: 'event.trigger.onJoystickDown' },
        { value: 'OnJoystickLeft', label: 'event.trigger.onJoystickLeft' },
        { value: 'OnJoystickRight', label: 'event.trigger.onJoystickRight' },
        { value: 'OnButtonDown', label: 'event.trigger.onButtonDown', needsParams: ['buttonName'] },
        { value: 'OnButtonUp', label: 'event.trigger.onButtonUp', needsParams: ['buttonName'] },
        { value: 'OnTriggerDown', label: 'event.trigger.onTriggerDown', needsParams: ['triggerName'] },
        { value: 'OnTriggerUp', label: 'event.trigger.onTriggerUp', needsParams: ['triggerName'] },
        { value: 'OnConsoleCommand', label: 'event.trigger.onConsoleCommand', needsParams: ['command'] },
    ]},
    { category: 'event.category.collision', options: [
        { value: 'OnCollisionWith', label: 'event.trigger.onCollisionWith', needsTarget: true },
        { value: 'OnVerticalCollision', label: 'event.trigger.onVerticalCollision', needsTarget: true },
        { value: 'OnHorizontalCollision', label: 'event.trigger.onHorizontalCollision', needsTarget: true },
    ]},
    { category: 'event.category.objectState', options: [
        { value: 'IsIdle', label: 'event.trigger.isIdle' },
        { value: 'IsRunning', label: 'event.trigger.isRunning' },
        { value: 'IsJumping', label: 'event.trigger.isJumping' },
        { value: 'IsOnGround', label: 'event.trigger.isOnGround' },
        { value: 'IsMoving', label: 'event.trigger.isMoving' },
        { value: 'OnAttack', label: 'event.trigger.onAttack' },
        { value: 'OnHealthDepleted', label: 'event.trigger.onHealthDepleted' },
        { value: 'IsClimbing', label: 'Al subir escalera' },
        { value: 'IsLookingLeft', label: 'Al mirar a la izquierda' },
        { value: 'IsLookingRight', label: 'Al mirar a la derecha' },
    ]},
    { category: 'event.category.system', options: [
        { value: 'IsMobile', label: '¿Es dispositivo móvil?' },
        { value: 'IsPC', label: '¿Es PC?' },
        { value: 'IsSceneUnlocked', label: '¿Escena / nivel desbloqueado?', needsParams: ['sceneName'] },
    ]},
    { category: 'event.category.variables', options: [
        { value: 'CompareVariable', label: 'event.trigger.compareVariable', needsParams: ['variable', 'operator', 'value']},
        { value: 'CompareBooleanVariable', label: 'Comparar Variable Booleana', needsParams: ['variable', 'valueBoolean']},
        { value: 'CompareObjectVariable', label: 'event.trigger.compareObjectVariable', needsParams: ['variable', 'operator', 'value']},
        { value: 'CompareObjectBooleanVariable', label: 'Comparar Variable Booleana de Objeto', needsParams: ['variable', 'valueBoolean']},
        { value: 'CompareStat', label: 'event.trigger.compareStat', needsParams: ['stat', 'operator', 'value']},
    ]},
    { category: 'event.category.time', options: [
        { value: 'OnTimerElapsed', label: 'event.trigger.onTimerElapsed', needsParams: ['timerName'] },
        { value: 'EveryXSeconds', label: 'event.trigger.everyXSeconds', needsParams: ['interval'] },
    ]},
    { category: 'event.category.ui', options: [
        { value: 'OnDialogueEnd', label: 'event.trigger.onDialogueEnd' },
    ]},
    { category: 'event.category.audio', options: [{ value: 'IsMusicPlaying', label: 'event.trigger.isMusicPlaying' }] },
    { category: 'event.category.network', options: [
        { value: 'OnMatchFound', label: 'event.trigger.onMatchFound' },
        { value: 'OnPlayerJoined', label: 'event.trigger.onPlayerJoined' },
        { value: 'OnPlayerLeft', label: 'event.trigger.onPlayerLeft' },
        { value: 'OnReceiveNetworkMessage', label: 'event.trigger.onReceiveNetworkMessage', needsParams: ['message'] },
    ] },
];
const triggerOptions = categorizedTriggerOptions.flatMap(c => c.options);

// FIX: Explicitly type categorizedActionOptions to avoid type widening of string literals.
const categorizedActionOptions: {
    category: string;
    options: {
        value: Action['action'];
        label: string;
        needsParams?: string[];
    }[];
}[] = [
    { category: 'event.category.object', options: [
        { value: 'Destroy', label: 'event.action.destroy' },
        { value: 'CreateObject', label: 'event.action.createObject', needsParams: ['templateObjectName'] },
        { value: 'EnableBehavior', label: 'Habilitar Comportamiento', needsParams: ['behaviorName'] },
        { value: 'DisableBehavior', label: 'Deshabilitar Comportamiento', needsParams: ['behaviorName'] },
        { value: 'SetObjectPosition', label: 'event.action.setPosition', needsParams: ['x', 'y']},
        { value: 'TeleportToObject', label: 'Teletransportar a Objeto', needsParams: ['targetObjectName']},
        { value: 'MoveObject', label: 'event.action.moveDirection', needsParams: ['direction', 'speed'] },
        { value: 'SetVelocityX', label: 'event.action.setVelocityX', needsParams: ['vx'] },
        { value: 'SetVelocityY', label: 'event.action.setVelocityY', needsParams: ['vy'] },
        { value: 'MoveTo', label: 'event.action.moveTo', needsParams: ['x', 'y', 'duration'] },
        { value: 'OscillateObject', label: 'event.action.oscillate', needsParams: ['axis', 'distance', 'speed'] },
        { value: 'OscillateScale', label: 'event.action.oscillateScale', needsParams: ['distance', 'speed'] },
        { value: 'RotateContinuously', label: 'event.action.rotateContinuously', needsParams: ['speed'] },
        { value: 'RotateObject', label: 'event.action.rotate', needsParams: ['rotation'] },
        { value: 'RotateTo', label: 'event.action.rotateTo', needsParams: ['rotation', 'duration'] },
        { value: 'ScaleObject', label: 'event.action.scale', needsParams: ['scaleX', 'scaleY'] },
        { value: 'ScaleTo', label: 'event.action.scaleTo', needsParams: ['scaleX', 'scaleY', 'duration'] },
        { value: 'SetScale', label: 'event.action.setScale', needsParams: ['scaleX', 'scaleY'] },
        { value: 'SetVisible', label: 'event.action.setVisible', needsParams: ['visible'] },
        { value: 'SetOpacity', label: 'event.action.setOpacity', needsParams: ['opacity'] },
        { value: 'SetZIndex', label: 'event.action.setZIndex', needsParams: ['zIndex'] },
        { value: 'SetFlipX', label: 'event.action.setFlipX', needsParams: ['flip'] },
        { value: 'SetFlipY', label: 'event.action.setFlipY', needsParams: ['flip'] },
        { value: 'SlideTo', label: 'event.action.slideTo', needsParams: ['x', 'y', 'duration'] },
        { value: 'SetDraggable', label: 'event.action.setDraggable', needsParams: ['enabled', 'lockX', 'lockY', 'minX', 'maxX', 'minY', 'maxY'] },
        { value: 'EnableCollision', label: 'event.action.enableCollision' },
        { value: 'DisableCollision', label: 'event.action.disableCollision' },
        { value: 'GenerateObjectAt', label: 'event.action.generateAt', needsParams: ['templateObjectName', 'targetObjectName'] },
        { value: 'ForceJump', label: 'event.action.forceJump', needsParams: ['jumpForce'] },
        { value: 'TriggerAttack', label: 'event.action.triggerAttack' },
        { value: 'Shoot', label: 'event.action.shoot', needsParams: ['damage', 'speed'] },
        { value: 'CreatePlayers', label: 'event.action.createPlayers', needsParams: ['count'] },
        { value: 'DisconnectPlayers', label: 'event.action.disconnectPlayers' },
        { value: 'SetParent', label: 'event.action.setParent', needsParams: ['parentName'] },
        { value: 'Knockback', label: 'event.action.knockback', needsParams: ['force', 'fromObjectName'] },
    ]},
    { category: 'event.category.visuals', options: [
        { value: 'PlayAnimation', label: 'event.action.playAnimation', needsParams: ['animationId'] },
        { value: 'SetSkin', label: 'Establecer Skin (Imagen/Color)', needsParams: ['imageUrl', 'color'] },
        { value: 'SetPlayerSkin', label: 'Cambiar Skin de Player', needsParams: ['imageUrl', 'color'] },
        { value: 'PlayVideo', label: 'event.action.playVideo', needsParams: ['videoAssetId'] },
        { value: 'PauseVideo', label: 'event.action.pauseVideo', needsParams: ['videoAssetId'] },
        { value: 'StopVideo', label: 'event.action.stopVideo' },
    ]},
    { category: 'event.category.variables', options: [
        { value: 'AddToVariable', label: 'event.action.addToVariable', needsParams: ['variable', 'value'] },
        { value: 'SetVariable', label: 'event.action.setVariable', needsParams: ['variable', 'value'] },
        { value: 'SetBooleanVariable', label: 'Establecer Variable Booleana', needsParams: ['variable', 'valueBoolean'] },
        { value: 'ToggleBooleanVariable', label: 'Alternar Variable Booleana', needsParams: ['variable'] },
        { value: 'AddToObjectVariable', label: 'event.action.addToObjectVariable', needsParams: ['variable', 'value'] },
        { value: 'SetObjectVariable', label: 'event.action.setObjectVariable', needsParams: ['variable', 'value'] },
        { value: 'SetObjectBooleanVariable', label: 'Establecer Var. Booleana de Objeto', needsParams: ['variable', 'valueBoolean'] },
        { value: 'ToggleObjectBooleanVariable', label: 'Alternar Var. Booleana de Objeto', needsParams: ['variable'] },
        { value: 'ModifyStat', label: 'event.action.modifyStat', needsParams: ['stat', 'operation', 'value'] },
        { value: 'GainHealth', label: 'event.action.gainHealth', needsParams: ['value'] },
        { value: 'LoseHealth', label: 'event.action.loseHealth', needsParams: ['value'] },
        { value: 'SaveGame', label: 'event.action.saveGame', needsParams: ['slot'] },
        { value: 'LoadGame', label: 'event.action.loadGame', needsParams: ['slot'] },
    ]},
    { category: 'event.category.sceneAndCamera', options: [
        { value: 'GoToScene', label: 'event.action.goToScene', needsParams: ['sceneName'] },
        { value: 'SetBackgroundColor', label: 'event.action.setBackgroundColor', needsParams: ['color']},
        { value: 'SetCameraZoom', label: 'event.action.setCameraZoom', needsParams: ['zoomLevel']},
        { value: 'SetSceneUnlocked', label: 'Establecer Escena Desbloqueada', needsParams: ['sceneName', 'valueBoolean'] },
    ]},
    { category: 'event.category.ui', options: [
        { value: 'SetUIText', label: 'event.action.setUIText', needsParams: ['text'] },
        { value: 'SetJoystickEnabled', label: 'Activar/Desactivar Joystick', needsParams: ['enabled'] },
        { value: 'ShowDialogue', label: 'event.action.showDialogue', needsParams: ['dialogueText'] },
        { value: 'ShowConsole', label: 'event.action.showConsole' },
    ]},
    { category: 'event.category.audio', options: [
        { value: 'PlaySound', label: 'event.action.playSound', needsParams: ['soundId', 'loop']},
        { value: 'SetBackgroundMusic', label: 'event.action.setBackgroundMusic', needsParams: ['soundId', 'loop']},
        { value: 'PauseBackgroundMusic', label: 'event.action.pauseBackgroundMusic' },
        { value: 'ResumeBackgroundMusic', label: 'event.action.resumeBackgroundMusic' },
        { value: 'StopBackgroundMusic', label: 'event.action.stopBackgroundMusic' },
        { value: 'SetBackgroundMusicVolume', label: 'event.action.setBackgroundMusicVolume', needsParams: ['volume']},
    ]},
    { category: 'event.category.time', options: [
        { value: 'StartTimer', label: 'event.action.startTimer', needsParams: ['timerName', 'duration'] },
        { value: 'StopTimer', label: 'event.action.stopTimer', needsParams: ['timerName'] },
        { value: 'Wait', label: 'Esperar X segundos', needsParams: ['duration'] },
    ]},
    { category: 'event.category.rpg', options: [
        { value: 'SetQuestState', label: 'event.action.setQuestState', needsParams: ['questId', 'questState'] },
    ]},
    { category: 'event.category.network', options: [
        { value: 'CreateMatch', label: 'event.action.createMatch', needsParams: ['maxPlayers'] },
        { value: 'JoinMatch', label: 'event.action.joinMatch', needsParams: ['matchId'] },
        { value: 'SendNetworkMessage', label: 'event.action.sendNetworkMessage', needsParams: ['message'] },
        { value: 'SetPlayerName', label: 'event.action.setPlayerName', needsParams: ['name'] },
    ]},
];
const actionOptions = categorizedActionOptions.flatMap(c => c.options);

const SelectorModal: React.FC<{
  title: string;
  categorizedItems: { category: string, options: { value: string, label: string }[] }[];
  onSelect: (value: string) => void;
  onClose: () => void;
}> = ({ title, categorizedItems, onSelect, onClose }) => {
    const { t } = useLanguage();
    const [activeCategory, setActiveCategory] = useState(categorizedItems[0].category);
    
    return (
        <div className="absolute inset-0 bg-gray-900/80 z-20 flex items-center justify-center" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-96 flex flex-col border border-gray-700" onClick={e => e.stopPropagation()}>
                <h4 className="text-md font-bold p-3 text-center border-b border-gray-700 shrink-0">{title}</h4>
                <div className="flex-grow flex min-h-0">
                    <aside className="w-1/3 border-r border-gray-700 p-2 overflow-y-auto">
                        {categorizedItems.map(group => (
                            <button key={group.category} onClick={() => setActiveCategory(group.category)} 
                                className={`w-full text-left text-sm p-2 rounded-md transition-colors ${activeCategory === group.category ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`}>
                                {t(group.category)}
                            </button>
                        ))}
                    </aside>
                    <main className="w-2/3 p-2 overflow-y-auto">
                        <ul>
                        {(categorizedItems.find(g => g.category === activeCategory)?.options || []).map(option => (
                            <li key={option.value} onClick={() => onSelect(option.value)} 
                                className="p-2 rounded-md hover:bg-indigo-600 cursor-pointer text-gray-200">
                                <h5 className="font-semibold text-sm">{t(option.label)}</h5>
                            </li>
                        ))}
                        </ul>
                    </main>
                </div>
            </div>
        </div>
    );
};

const EventEditor: React.FC<EventEditorProps> = ({ onClose, onAddEvent, onDeleteEvent, onUpdateEvent, scene, animations, assets, globalObjects, globalVariables, allScenes }) => {
  const { t } = useLanguage();
  const [programmingMode, setProgrammingMode] = useState<'events' | 'blocks'>('blocks');
  const [activeTab, setActiveTab] = useState<'2D' | '3D'>('2D');
  const [eventDimension, setEventDimension] = useState<'2D' | '3D'>('2D');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [conditions, setConditions] = useState<Partial<Condition>[]>([{}]);
  const [actions, setActions] = useState<Partial<Action>[]>([{}]);
  const [selectorOpen, setSelectorOpen] = useState<{type: 'condition' | 'action', index: number} | null>(null);
  
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
  const standardEvents = useMemo(() => {
    return (scene?.events || []).filter(e => !e.programmingMode || e.programmingMode === 'events');
  }, [scene?.events]);

  const handleEditEvent = (event: GameEvent) => {
    setEditingEventId(event.id);
    setEventDimension(event.dimension || '2D');
    // Deep copy to avoid mutating the original state directly
    setConditions(JSON.parse(JSON.stringify(event.conditions)));
    setActions(JSON.parse(JSON.stringify(event.actions)));
    setIsFormOpen(true);
  };
  
  const handleAddNewEventClick = () => {
    setEditingEventId(null);
    setEventDimension(activeTab);
    setConditions([{}]);
    setActions([{}]);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setEditingEventId(null);
    setIsFormOpen(false);
    setConditions([{}]);
    setActions([{}]);
  };

  const handleSaveEvent = () => {
    const finalEventData = {
        conditions: conditions.filter(c => c.object && c.trigger) as Condition[],
        actions: actions.filter(a => a.object && a.action) as Action[],
        dimension: eventDimension,
        programmingMode: 'events' as const
    };

    if (finalEventData.conditions.length === 0 || finalEventData.actions.length === 0) {
        alert(t('event.invalidEvent'));
        return;
    }

    if (editingEventId) {
        onUpdateEvent({ ...finalEventData, id: editingEventId });
    } else {
        onAddEvent({ ...finalEventData, id: `evt_${Date.now()}` });
    }
    handleCancel();
  };
  
  const updateCondition = (index: number, update: Partial<Condition>) => {
      const newConditions = [...conditions];
      const oldTrigger = newConditions[index].trigger;
      newConditions[index] = { ...newConditions[index], ...update };
      if (update.trigger && update.trigger !== oldTrigger) newConditions[index].params = {};
      setConditions(newConditions);
  };
  
  const updateAction = (index: number, update: Partial<Action>) => {
      const newActions = [...actions];
      const oldAction = newActions[index].action;
      newActions[index] = { ...newActions[index], ...update };
      if (update.action && update.action !== oldAction) newActions[index].params = {};
      setActions(newActions);
  };
  
  const renderParamInput = (
    type: 'condition' | 'action', 
    item: Partial<Condition> | Partial<Action>, 
    index: number
  ) => {
    const options = type === 'condition' ? triggerOptions : actionOptions;
    const key = type === 'condition' ? (item as Partial<Condition>).trigger : (item as Partial<Action>).action;
    const selectedOption = options.find(opt => opt.value === key);
    
    const updater = type === 'condition' ? updateCondition : updateAction;
    const updateParams = (newParams: Record<string, any>) => updater(index, { params: {...item.params, ...newParams} });

    if (key === 'CreateObject') {
        const positionType = item.params?.positionType || 'absolute';
        return <div key="create-obj-params" className="w-full bg-gray-700/50 p-2 rounded-md mt-1 space-y-2">
            <select className="input-field w-full" value={item.params?.templateObjectName ?? ''} onChange={e => updateParams({templateObjectName: e.target.value})}>
                <option value="">{t('event.selectTemplate')}</option>
                {templateObjectNames.map((name, index) => <option key={`${name}-${index}`} value={name}>{name}</option>)}
            </select>
            <div className="flex gap-4 text-sm">
                <label><input type="radio" value="absolute" checked={positionType === 'absolute'} onChange={() => updateParams({positionType: 'absolute'})} /> {t('event.absolutePosition')}</label>
                <label><input type="radio" value="relativeToObject" checked={positionType === 'relativeToObject'} onChange={() => updateParams({positionType: 'relativeToObject'})} /> {t('event.relativeToObject')}</label>
            </div>
            {positionType === 'absolute' ? (
                <div className="flex gap-2">
                    <input type="number" placeholder="X" className="input-field w-1/2" value={item.params?.x ?? ''} onChange={e => updateParams({x: e.target.value})} />
                    <input type="number" placeholder="Y" className="input-field w-1/2" value={item.params?.y ?? ''} onChange={e => updateParams({y: e.target.value})} />
                </div>
            ) : (
                <div className="space-y-2">
                    <select className="input-field w-full" value={item.params?.relativeToObjectName ?? ''} onChange={e => updateParams({relativeToObjectName: e.target.value})}>
                        <option value="">{t('event.selectRelativeObject')}</option>
                        {templateObjectNames.map((name, index) => <option key={`${name}-${index}`} value={name}>{name}</option>)}
                    </select>
                    <div className="flex gap-2">
                        <input type="number" placeholder="Offset X" className="input-field w-1/2" value={item.params?.offsetX ?? ''} onChange={e => updateParams({offsetX: e.target.value})} />
                        <input type="number" placeholder="Offset Y" className="input-field w-1/2" value={item.params?.offsetY ?? ''} onChange={e => updateParams({offsetY: e.target.value})} />
                    </div>
                </div>
            )}
        </div>;
    }
    
    if (!selectedOption?.needsParams) return null;
    
    return selectedOption.needsParams.map(param => {
        switch (param) {
            case 'animationId':
                return ( <select key={param} className="input-field" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})}>
                    <option value="">{t('event.selectAnimation')}</option>
                    {animations.map(anim => <option key={anim.id} value={anim.id}>{anim.name}</option>)}
                </select>);
            case 'soundId':
                return ( <select key={param} className="input-field" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})}>
                    <option value="">{t('event.selectSound')}</option>
                    {audioAssets.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                </select>);
            case 'loop': {
                const defaultValue = key === 'PlaySound' ? 'false' : 'true';
                const currentValue = item.params?.[param] !== undefined ? String(item.params?.[param]) : defaultValue;
                return (
                    <select key={param} className="input-field" value={currentValue} onChange={e => updateParams({[param]: e.target.value === 'true'})}>
                        <option value="true">{t('event.loop.yes') || 'Bucle: Sí'}</option>
                        <option value="false">{t('event.loop.no') || 'Bucle: No'}</option>
                    </select>
                );
            }
            case 'videoAssetId':
                return ( <select key={param} className="input-field" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})}>
                    <option value="">{t('event.selectVideo') || 'Seleccionar Video'}</option>
                    {videoAssets.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                </select>);
            case 'variable':
                if (key === 'CompareVariable' || key === 'AddToVariable' || key === 'SetVariable' || key === 'SetBooleanVariable' || key === 'ToggleBooleanVariable' || key === 'CompareBooleanVariable') {
                    return (
                        <div key={param} className="flex gap-1">
                            <input 
                                list={`vars-${key}`}
                                type="text" 
                                placeholder={t('event.globalVariable') || 'Variable Global'} 
                                className="input-field min-w-[120px]" 
                                value={item.params?.[param] ?? ''} 
                                onChange={e => updateParams({[param]: e.target.value})} 
                            />
                            <datalist id={`vars-${key}`}>
                                {globalVariableNames.map((name, index) => <option key={`${name}-${index}`} value={name} />)}
                            </datalist>
                        </div>
                    );
                }
                return <input key={param} type="text" placeholder={t('event.variableName')} className="input-field" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})} />;
            case 'operator':
                 return ( <select key={param} className="input-field" value={item.params?.[param] ?? '=='} onChange={e => updateParams({[param]: e.target.value})}>
                    <option value="==">== ({t('properties.operator.equal') || 'igual a'})</option>
                    <option value="!=">!= ({t('properties.operator.notEqual') || 'no es igual'})</option>
                    <option value=">">&gt; ({t('properties.operator.greaterThan') || 'mayor que'})</option>
                    <option value="<">&lt; ({t('properties.operator.lessThan') || 'menor que'})</option>
                    <option value=">=">&gt;= ({t('properties.operator.greaterEqual') || 'mayor/igual'})</option>
                    <option value="<=">&lt;= ({t('properties.operator.lessEqual') || 'menor/igual'})</option>
                </select>);
            case 'duration':
                return <input key={param} type="number" step="any" placeholder="Duración (segundos)" className="input-field" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value === '' ? '' : Number(e.target.value)})} />;
            case 'value':
                // For variables, value often is a number
                if (key === 'CompareVariable' || key === 'AddToVariable' || key === 'SetVariable') {
                    return <input key={param} type="text" placeholder={t('properties.value') || 'Valor'} className="input-field min-w-[60px]" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})} />;
                }
                return <input key={param} type="text" placeholder={param} className="input-field" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})} />;
            case 'valueBoolean':
                return (
                    <select key={param} className="input-field" value={String(item.params?.[param] ?? true)} onChange={e => updateParams({[param]: e.target.value === 'true'})}>
                        <option value="true">Verdadero (True)</option>
                        <option value="false">Falso (False)</option>
                    </select>
                );
            case 'sceneName':
                return ( <select key={param} className="input-field" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})}>
                    <option value="">{t('event.selectScene')}</option>
                    {sceneNames.map((name, index) => <option key={`${name}-${index}`} value={name}>{name}</option>)}
                </select>);
            case 'key':
                return (
                    <div key={param} className="flex flex-col gap-1">
                        <input 
                            type="text" 
                            placeholder={t('event.keyPressPlaceholder')} 
                            className="input-field w-48 text-center font-mono cursor-pointer hover:bg-gray-700 transition-colors" 
                            value={item.params?.[param] ?? ''} 
                            onKeyDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                let keyName = e.key.toLowerCase();
                                if (keyName === ' ') keyName = 'space';
                                updateParams({[param]: keyName});
                            }}
                            readOnly
                        />
                        <span className="text-[10px] text-gray-400 text-center">{t('event.autoCapture')}</span>
                    </div>
                );
            case 'parentName':
                return ( <select key={param} className="input-field" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})}>
                    <option value="">{t('event.none')}</option>
                    {templateObjectNames.map(name => <option key={name} value={name}>{name}</option>)}
                </select>);
            case 'visible':
            case 'flip':
            case 'enabled':
            case 'lockX':
            case 'lockY':
                return ( <select key={param} className="input-field" value={item.params?.[param] ?? 'true'} onChange={e => updateParams({[param]: e.target.value === 'true'})}>
                    <option value="true">{t('common.yes') || 'Sí'}</option>
                    <option value="false">{t('common.no') || 'No'}</option>
                </select>);
            case 'direction':
                return ( <select key={param} className="input-field" value={item.params?.[param] ?? 'right'} onChange={e => updateParams({[param]: e.target.value})}>
                    <option value="right">{t('event.direction.right')}</option>
                    <option value="left">{t('event.direction.left')}</option>
                    <option value="up">{t('event.direction.up')}</option>
                    <option value="down">{t('event.direction.down')}</option>
                </select>);
            case 'axis':
                return ( <select key={param} className="input-field" value={item.params?.[param] ?? 'x'} onChange={e => updateParams({[param]: e.target.value})}>
                    <option value="x">{t('event.axis.x')}</option>
                    <option value="y">{t('event.axis.y')}</option>
                </select>);
            case 'color':
                return <input key={param} type="color" className="input-field h-8" value={item.params?.[param] ?? '#000000'} onChange={e => updateParams({[param]: e.target.value})} />;
            case 'opacity':
                return <input key={param} type="number" placeholder="0-1" step="0.1" min="0" max="1" className="input-field w-20" value={item.params?.[param] ?? '1'} onChange={e => updateParams({[param]: e.target.value})} />;
            case 'x':
            case 'y':
            case 'vx':
            case 'vy':
            case 'maxPlayers':
            case 'slot':
            case 'zIndex':
            case 'zoomLevel':
            case 'speed':
            case 'distance':
            case 'jumpForce':
            case 'duration':
            case 'interval':
            case 'rotation':
            case 'scaleX':
            case 'scaleY':
            case 'minX':
            case 'maxX':
            case 'minY':
            case 'maxY':
                return <input key={param} type="number" placeholder={param} className="input-field w-20" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})} />;
            case 'buttonName':
                return (
                    <div key={param} className="flex flex-col gap-1 w-full">
                        <select className="input-field w-full" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})}>
                            <option value="">{t('event.selectButton') || 'Seleccionar Botón'}</option>
                            <optgroup label="Nintendo / Universal">
                                <option value="A">Boton A (Confirmar)</option>
                                <option value="B">Boton B (Cancelar)</option>
                                <option value="X">Boton X (Menú)</option>
                                <option value="Y">Boton Y (Acción)</option>
                            </optgroup>
                            <optgroup label="D-Pad / Cruzeta">
                                <option value="DpadUp">Arriba (D-Pad)</option>
                                <option value="DpadDown">Abajo (D-Pad)</option>
                                <option value="DpadLeft">Izquierda (D-Pad)</option>
                                <option value="DpadRight">Derecha (D-Pad)</option>
                            </optgroup>
                            <optgroup label="Hombros">
                                <option value="L">L (Nintendo)</option>
                                <option value="R">R (Nintendo)</option>
                                <option value="ZL">ZL (Nintendo)</option>
                                <option value="ZR">ZR (Nintendo)</option>
                                <option value="L1">L1 (PS/Xbox)</option>
                                <option value="R1">R1 (PS/Xbox)</option>
                                <option value="L2">L2 (PS/Xbox)</option>
                                <option value="R2">R2 (PS/Xbox)</option>
                            </optgroup>
                            <optgroup label="Sistema">
                                <option value="Plus">Plus (+)</option>
                                <option value="Minus">Minus (-)</option>
                                <option value="Home">Home (Casa)</option>
                                <option value="Capture">Captura</option>
                                <option value="Start">Start</option>
                                <option value="Select">Select</option>
                            </optgroup>
                            <option value="custom">-- Otro (escribir ID) --</option>
                        </select>
                        {item.params?.[param] === 'custom' && (
                             <input type="text" placeholder="button_X" className="input-field mt-1" onChange={e => updateParams({[param]: e.target.value})} />
                        )}
                    </div>
                );
            case 'triggerName':
                return (
                    <select key={param} className="input-field" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})}>
                         <option value="L2">ZL / L2</option>
                         <option value="R2">ZR / R2</option>
                    </select>
                );
            case 'templateObjectName':
            case 'targetObjectName':
                return ( <select key={param} className="input-field" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})}>
                    <option value="">{t('event.selectObject')}</option>
                    {templateObjectNames.map((name, index) => <option key={`${name}-${index}`} value={name}>{name}</option>)}
                </select>);
            case 'fromObjectName':
                return ( <select key={param} className="input-field text-indigo-400 font-semibold" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})}>
                    <option value="">-- Origen del Empuje --</option>
                    <option value="Self">Self (Este Objeto)</option>
                    {templateObjectNames.map((name, index) => <option key={`${name}-${index}`} value={name}>{name}</option>)}
                </select>);
            case 'volume':
                return <input key={param} type="number" placeholder="Volumen (0-100)" className="input-field" min="0" max="100" value={item.params?.[param] ?? '100'} onChange={e => updateParams({[param]: e.target.value})} />;
            case 'dialogueText':
                return <textarea key={param} placeholder={t('event.dialoguePlaceholder')} className="input-field w-full" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})} />;
            case 'stat':
                return (<select key={param} className="input-field" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})}>
                    <option value="">{t('event.stat')}</option>
                    <option value="hp">HP</option>
                    <option value="maxHp">HP Máx</option>
                    <option value="attack">Ataque</option>
                </select>);
            case 'operation':
                return (<select key={param} className="input-field" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})}>
                    <option value="add">{t('event.operation.add')}</option>
                    <option value="subtract">{t('event.operation.subtract')}</option>
                    <option value="set">{t('event.operation.set')}</option>
                </select>);
            case 'behaviorName':
                return (
                    <select key={param} className="input-field" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})}>
                        <option value="">-- Seleccionar Comportamiento --</option>
                        <option value="Solid">Solid</option>
                        <option value="PlatformerCharacter">PlatformerCharacter</option>
                        <option value="Physics">Physics</option>
                        <option value="TopDownRPGMovement">TopDownRPGMovement</option>
                        <option value="Patrol">Patrol</option>
                        <option value="Oscillate">Oscillate</option>
                        <option value="Rotate">Rotate</option>
                        <option value="Pulse">Pulse</option>
                        <option value="ScoreCounter">ScoreCounter</option>
                        <option value="TweenPath">TweenPath</option>
                        <option value="Boss">Boss</option>
                        <option value="Health">Health</option>
                        <option value="FollowCamera">FollowCamera</option>
                        <option value="Ladder">Ladder</option>
                        <option value="LadderClimber">LadderClimber</option>
                        <option value="Tilemap">Tilemap</option>
                        <option value="Interactable">Interactable</option>
                    </select>
                );
            case 'imageUrl': {
                const imageAssets = assets.filter(a => a.type === 'image');
                return (
                    <select key={param} className="input-field min-w-[140px]" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})}>
                        <option value="">-- Seleccionar Imagen --</option>
                        {imageAssets.map(asset => <option key={asset.id} value={asset.url}>{asset.name}</option>)}
                    </select>
                );
            }
            default:
                return <input key={param} type="text" placeholder={param} className="input-field" value={item.params?.[param] ?? ''} onChange={e => updateParams({[param]: e.target.value})} />;
        }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-gray-800" onClick={e => e.stopPropagation()}>
        {selectorOpen && <SelectorModal
            title={selectorOpen.type === 'condition' ? 'Seleccionar Disparador' : 'Seleccionar Acción'}
            categorizedItems={selectorOpen.type === 'condition' ? categorizedTriggerOptions : categorizedActionOptions}
            onClose={() => setSelectorOpen(null)}
            onSelect={(value) => {
                if (selectorOpen.type === 'condition') {
                    updateCondition(selectorOpen.index, { trigger: value as Condition['trigger'] });
                } else {
                    updateAction(selectorOpen.index, { action: value as Action['action'] });
                }
                setSelectorOpen(null);
            }}
        />}
        <style>{`
            .input-field { background-color: #1f2937; border: 1px solid #374151; border-radius: 0.375rem; padding: 0.25rem 0.5rem; font-size: 0.875rem; }
        `}</style>
        <header className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-4 sm:gap-6">
            <h2 className="text-lg sm:text-xl font-bold">{t('event.editorTitle')}</h2>
            <div className="bg-black/40 border border-white/10 rounded-lg p-0.5 flex">
              <button
                onClick={() => {
                  setIsFormOpen(false);
                  setProgrammingMode('events');
                }}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  programmingMode === 'events'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Lista de Eventos
              </button>
              <button
                onClick={() => {
                  setIsFormOpen(false);
                  setProgrammingMode('blocks');
                }}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                  programmingMode === 'blocks'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping"></span>
                Bloques Visuales (Scratch)
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </header>
        
        {programmingMode === 'blocks' ? (
          <div className="flex-grow min-h-0 overflow-hidden">
            <ScratchBlocksEditor
              scene={scene}
              animations={animations}
              assets={assets}
              globalObjects={globalObjects}
              globalVariables={globalVariables}
              allScenes={allScenes}
              onAddEvent={onAddEvent}
              onDeleteEvent={onDeleteEvent}
              onUpdateEvent={onUpdateEvent}
            />
          </div>
        ) : (
          <>
            <main className="flex-grow p-4 overflow-y-auto space-y-4">
                {/* Simplified for 2D only */}
                {!isFormOpen && standardEvents.map((event, index) => (
                <div key={event.id || index} className="bg-black/50 p-3 rounded-lg border border-gray-800 relative group">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                      onClick={() => handleEditEvent(event)} 
                      title={t('event.editEvent')} 
                      className="p-1.5 bg-gray-700/80 rounded-full text-gray-300 hover:bg-indigo-600"
                     >
                        <EditIcon />
                    </button>
                    <button 
                      onClick={() => onDeleteEvent(event.id)} 
                      title={t('event.deleteEvent')} 
                      className="p-1.5 bg-red-900/50 rounded-full text-red-300 hover:bg-red-700"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-1/2 space-y-2">
                      <h4 className="text-xs uppercase font-bold text-red-400 tracking-wider">{t('event.conditions')}</h4>
                      {event.conditions.map((cond, cIndex) => <div key={cIndex} className="text-sm bg-red-900/50 p-2 rounded-md">{`${cond.object} ${t(triggerOptions.find(o => o.value === cond.trigger)?.label || '')} ${cond.target || ''}`}</div>)}
                    </div>
                    <div className="w-1/2 space-y-2">
                      <h4 className="text-xs uppercase font-bold text-blue-400 tracking-wider">{t('event.actions')}</h4>
                      {event.actions.map((act, aIndex) => <div key={aIndex} className="text-sm bg-blue-900/50 p-2 rounded-md">{`${act.object} ${t(actionOptions.find(o => o.value === act.action)?.label || '')}`}</div>)}
                    </div>
                  </div>
                </div>
                ))}

                {!isFormOpen && standardEvents.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-xs italic bg-gray-850/40 border border-dashed border-gray-800 rounded-lg">
                    No hay eventos creados para esta escena. ¡Haz clic en "+ Añadir Evento" para crear uno!
                  </div>
                )}

                {isFormOpen && (
                    <div className="bg-black/50 p-4 rounded-lg border border-indigo-500">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
                            <h3 className="font-bold text-lg text-indigo-300">{editingEventId ? t('event.editEvent') : t('event.createEvent')}</h3>
                        </div>
                        <div className="flex gap-4">
                             <div className="w-1/2 space-y-3">
                                <h4 className="font-semibold text-red-400">{t('event.conditionsWhen')}</h4>
                                {conditions.map((cond, i) => (
                                    <div key={i} className="flex gap-1 items-start flex-wrap p-2 bg-gray-800/50 rounded-md">
                                        <select className="input-field" value={cond.object ?? ''} onChange={e => updateCondition(i, { object: e.target.value })}>
                                            <option value="">{t('event.selectObject')}</option>
                                            {['System', ...templateObjectNames].map((name, index) => <option key={`${name}-${index}`} value={name}>{name === 'System' ? t('properties.system') : name}</option>)}
                                        </select>
                                        <button onClick={() => setSelectorOpen({type: 'condition', index: i})} className="input-field text-left flex-grow min-w-[120px] hover:bg-gray-600">
                                            {t(triggerOptions.find(opt => opt.value === cond.trigger)?.label || 'event.selectTrigger')}
                                        </button>
                                        <button onClick={() => setConditions(conditions.filter((_, idx) => idx !== i))} className="p-2 bg-red-900/50 rounded-md text-red-300 hover:bg-red-700">
                                            <TrashIcon />
                                        </button>
                                        {triggerOptions.find(o => o.value === cond.trigger)?.needsTarget && 
                                          <select className="input-field" value={cond.target ?? ''} onChange={e => updateCondition(i, { target: e.target.value })}>
                                            <option value="">{t('event.selectTarget')}</option>
                                            {templateObjectNames.map((name, index) => <option key={`${name}-${index}`} value={name}>{name}</option>)}
                                          </select>}
                                        {renderParamInput('condition', cond, i)}
                                    </div>
                                ))}
                                <button onClick={() => setConditions([...conditions, {}])} className="w-full py-2 bg-gray-800 rounded-md hover:bg-gray-700 text-sm font-medium text-gray-300">+ Añadir condición</button>
                             </div>
                             <div className="w-1/2 space-y-3">
                                <h4 className="font-semibold text-blue-400">{t('event.actionsDo')}</h4>
                                {actions.map((act, i) => (
                                    <div key={i} className="flex gap-1 items-start flex-wrap p-2 bg-gray-800/50 rounded-md">
                                        <select className="input-field" value={act.object ?? ''} onChange={e => updateAction(i, { object: e.target.value })}>
                                            <option value="">{t('event.selectObject')}</option>
                                            {['System', ...templateObjectNames].map((name, index) => <option key={`${name}-${index}`} value={name}>{name === 'System' ? t('properties.system') : name}</option>)}
                                        </select>
                                        <button onClick={() => setSelectorOpen({type: 'action', index: i})} className="input-field text-left flex-grow min-w-[120px] hover:bg-gray-600">
                                            {t(actionOptions.find(opt => opt.value === act.action)?.label || 'event.selectAction')}
                                        </button>
                                        <button onClick={() => setActions(actions.filter((_, idx) => idx !== i))} className="p-2 bg-red-900/50 rounded-md text-red-300 hover:bg-red-700">
                                            <TrashIcon />
                                        </button>
                                        {renderParamInput('action', act, i)}
                                    </div>
                                ))}
                                <button onClick={() => setActions([...actions, {}])} className="w-full py-2 bg-gray-800 rounded-md hover:bg-gray-700 text-sm font-medium text-gray-300">+ Añadir acción</button>
                             </div>
                        </div>
                    </div>
                )}
            </main>
            
            <footer className="p-4 border-t border-gray-800 shrink-0">
               {isFormOpen ? (
                   <div className="flex justify-end gap-2">
                       <button onClick={handleCancel} className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-800">{t('common.cancel')}</button>
                       <button onClick={handleSaveEvent} className="px-4 py-2 bg-indigo-600 rounded-md hover:bg-indigo-700">{t('event.saveEvent')}</button>
                   </div>
               ) : (
                    <button onClick={handleAddNewEventClick} className="px-4 py-2 bg-indigo-600 rounded-md hover:bg-indigo-700">
                        {t('event.addNewEvent')}
                    </button>
               )}
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

export default EventEditor;