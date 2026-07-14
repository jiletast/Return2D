
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Scene, GameObject, Animation, GameAsset, Behavior, Variable, Action, Condition, CollisionProperties, ProjectData } from '../types';

export interface GameState {
  gameObjects: GameObject[];
  gameVariables: Record<string, any>;
}

interface GameViewProps {
  scene: Scene;
  allScenes: Scene[];
  animations: Animation[];
  assets: GameAsset[];
  globalObjects?: GameObject[];
  globalVariables: Variable[];
  gameWidth: number;
  gameHeight: number;
  responsive?: boolean;
  joystick?: ProjectData['joystick'];
  initialState?: GameState;
  onExit: (finalState: GameState) => void;
  onGoToScene: (sceneName: string) => void;
  projectData?: ProjectData;
}

interface ActiveAnimation {
    animation: Animation;
    startTime: number;
}

const getObjectAbsolutePosition = (objectId: number, objectsById: Map<number, GameObject>): { x: number; y: number } => {
    let currentId: number | null | undefined = objectId;
    let totalX = 0;
    let totalY = 0;
    let safety = 100; // Prevent infinite loops
    while(currentId && safety-- > 0) {
        const obj = objectsById.get(currentId);
        if (!obj) break;
        totalX += obj.x;
        totalY += obj.y;
        currentId = obj.parentId;
    }
    return { x: totalX, y: totalY };
};

const getCollisionBox = (objWithAbsPos: GameObject & {x: number, y: number}): {x: number, y: number, width: number, height: number} => {
    const scaleX = Math.abs((objWithAbsPos.scaleX ?? 1) * (objWithAbsPos.animScaleX ?? 1));
    const scaleY = Math.abs((objWithAbsPos.scaleY ?? 1) * (objWithAbsPos.animScaleY ?? 1));
    
    const offsetX = objWithAbsPos.animOffsetX ?? 0;
    const offsetY = objWithAbsPos.animOffsetY ?? 0;
    const rotation = ((objWithAbsPos.rotation || 0) + (objWithAbsPos.animRotation || 0)) * Math.PI / 180;

    // Base dimensions and center
    let w = objWithAbsPos.width * scaleX;
    let h = objWithAbsPos.height * scaleY;
    let cx = objWithAbsPos.x + offsetX + objWithAbsPos.width / 2;
    let cy = objWithAbsPos.y + offsetY + objWithAbsPos.height / 2;

    if (objWithAbsPos.useCustomCollision && objWithAbsPos.collision) {
        w = objWithAbsPos.collision.width * scaleX;
        h = objWithAbsPos.collision.height * scaleY;
        cx = objWithAbsPos.x + offsetX + objWithAbsPos.width / 2 + (objWithAbsPos.collision.offsetX + objWithAbsPos.collision.width / 2 - objWithAbsPos.width / 2) * scaleX;
        cy = objWithAbsPos.y + offsetY + objWithAbsPos.height / 2 + (objWithAbsPos.collision.offsetY + objWithAbsPos.collision.height / 2 - objWithAbsPos.height / 2) * scaleY;
    }

    if (rotation === 0) {
        return {
            x: cx - w / 2,
            y: cy - h / 2,
            width: w,
            height: h
        };
    }

    // Calculate AABB of rotated rectangle
    const cos = Math.abs(Math.cos(rotation));
    const sin = Math.abs(Math.sin(rotation));
    const newW = w * cos + h * sin;
    const newH = w * sin + h * cos;

    return {
        x: cx - newW / 2,
        y: cy - newH / 2,
        width: newW,
        height: newH
    };
};

const getRotatedSurfaceY = (playerX: number, playerWidth: number, solid: GameObject): number | null => {
    const rotation = (solid.rotation || 0) * Math.PI / 180;
    if (rotation === 0) {
        return solid.y;
    }
    const cx = solid.x + solid.width / 2;
    const cy = solid.y + solid.height / 2;
    const px = playerX + playerWidth / 2;
    const dx = px - cx;
    
    const halfW = (solid.width * Math.abs(Math.cos(rotation)) + solid.height * Math.abs(Math.sin(rotation))) / 2;
    if (Math.abs(dx) > halfW) {
        return null;
    }
    
    const surfaceY = cy + dx * Math.tan(rotation) - (solid.height / 2) / Math.abs(Math.cos(rotation));
    return surfaceY;
};


const GameView: React.FC<GameViewProps> = ({ scene, allScenes, animations, assets, globalObjects, globalVariables, gameWidth: initialGameWidth, gameHeight: initialGameHeight, responsive, joystick, initialState, onExit, onGoToScene, projectData }) => {
  const previewMode: string = '2d';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [dimensions, setDimensions] = useState({ width: initialGameWidth, height: initialGameHeight });
  const gameObjectsRef = useRef<GameObject[]>([]);
  const keysPressed = useRef<Record<string, boolean>>({});
  const actionsPressed = useRef<Record<string, any>>({});
  const gameVariables = useRef<Record<string, string | number | boolean>>({});
  const activeAnimations = useRef<Map<number, ActiveAnimation>>(new Map());
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const videoCache = useRef<Map<string, HTMLVideoElement>>(new Map());
  const camera = useRef({ x: 0, y: 0, zoom: 1 });
  const [uiObjects, setUiObjects] = useState<GameObject[]>([]);
  const backgroundMusicPlayer = useRef<HTMLAudioElement | null>(null);
  const currentBackgroundMusicId = useRef<string | null>(null);
  const [runtimeBackgroundColor, setRuntimeBackgroundColor] = useState(scene.backgroundColor);
  const [dialogue, setDialogue] = useState<{ text: string; speaker?: string; onCompleteActions?: Action[] } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleValue, setConsoleValue] = useState('');
  const [joystickData, setJoystickData] = useState<{x: number, y: number} | null>(null);
  const [joystickRuntimeEnabled, setJoystickRuntimeEnabled] = useState(joystick?.enabled ?? false);
  useEffect(() => {
    setJoystickRuntimeEnabled(joystick?.enabled ?? false);
  }, [joystick?.enabled]);
  const draggingRef = useRef<{ id: number; offsetX: number; offsetY: number } | null>(null);
  const floatingFeedbacks = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    text: string;
    color: string;
    opacity: number;
    lifetime: number;
  }[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [activeInteractable, setActiveInteractable] = useState<{ id: number; name: string; prompt: string } | null>(null);
  const activeInteractableRef = useRef<{ id: number; name: string; prompt: string } | null>(null);

  const playShootSynthSound = () => {
      try {
          initAudio();
          const ctx = audioContextRef.current;
          if (!ctx) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(400, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.12);
          
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
          
          osc.start();
          osc.stop(ctx.currentTime + 0.12);
      } catch (e) {}
  };

  const playSwordSynthSound = () => {
      try {
          initAudio();
          const ctx = audioContextRef.current;
          if (!ctx) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(120, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.08);
          
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
          
          osc.start();
          osc.stop(ctx.currentTime + 0.08);
      } catch (e) {}
  };

  useEffect(() => {
    if (!responsive) {
        setDimensions({ width: initialGameWidth, height: initialGameHeight });
        return;
    }

    const mainElement = mainRef.current;
    if (!mainElement) return;

    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            setDimensions({ width, height });
        }
    });

    observer.observe(mainElement);
    return () => observer.disconnect();
  }, [responsive, initialGameWidth, initialGameHeight]);

  const { width: gameWidth, height: gameHeight } = dimensions;
  
  const frameCollisions = useRef<{obj1Name: string, obj2Name: string, type: string, obj1Id: number, obj2Id: number}[]>([]);
  const frameClicks = useRef<{name: string, id: number}[]>([]);
  const frameInteractions = useRef<{name: string, id: number}[]>([]);
  const frameJoystickEvents = useRef<string[]>([]);
  const frameTimerEvents = useRef<string[]>([]);
  const frameAttacks = useRef<{name: string, id: number}[]>([]);
  const frameKeyPresses = useRef<string[]>([]);
  const frameDialogueEnd = useRef<boolean>(false);
  const frameButtonDown = useRef<string[]>([]);
  const frameButtonUp = useRef<string[]>([]);
  const frameTriggerDown = useRef<string[]>([]);
  const frameTriggerUp = useRef<string[]>([]);
  const frameConsoleCommands = useRef<string[]>([]);
  const framePlayerJoined = useRef<boolean>(false);
  const framePlayerLeft = useRef<boolean>(false);
  const frameMatchFound = useRef<boolean>(false);
  const frameReceiveNetworkMessage = useRef<boolean>(false);
  const sceneChangeRequested = useRef(false);
  const timersRef = useRef<Map<string, { startTime: number; duration: number }>>(new Map());
  const intervalsRef = useRef<Map<string, { interval: number; lastTriggerTime: number }>>(new Map());
  const activeSequencesRef = useRef<Set<string>>(new Set());

  const joystickState = useRef({ active: false, angle: 0, distance: 0 });
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickHandleRef = useRef<HTMLDivElement>(null);
  const joystickTouchId = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const joystickUpPreviousFrame = useRef(false);

    const spawnFloatingFeedback = (obj: GameObject | undefined, val: number | string, label?: string) => {
        const numVal = Number(val);
        if (isNaN(numVal) || numVal === 0) return;
        
        let displayX = (initialGameWidth || 1024) / 2;
        let displayY = (initialGameHeight || 768) / 2;
        if (obj && typeof obj.x === 'number') {
            displayX = obj.x + (obj.width || 0) / 2;
            displayY = obj.y - 10;
        }
        
        const isNegative = numVal < 0;
        const text = isNegative ? `${numVal} ${label ? label.toUpperCase() : ''}` : `+${numVal} ${label ? label.toUpperCase() : ''}`;
        const color = isNegative ? 'rgb(239, 68, 68)' : 'rgb(34, 197, 94)';
        
        floatingFeedbacks.current.push({
            x: displayX,
            y: displayY,
            vx: (Math.random() - 0.5) * 20,
            vy: -60,
            text,
            color,
            opacity: 1.0,
            lifetime: 1.2
        });
    };

    const executeActionSingle = (action: Action, self?: GameObject, targetOverride?: GameObject, isContinuous: boolean = false, deltaTime: number = 0, forceRestart: boolean = false) => {
      let targetObj : GameObject | undefined;
      if (targetOverride) {
          targetObj = gameObjectsRef.current.find(o => o.id === targetOverride.id);
      } else if ((action.object === 'Self' || (self && action.object === self.name)) && self) {
          targetObj = gameObjectsRef.current.find(o => o.id === self.id);
      } else {
          targetObj = gameObjectsRef.current.find(o => o.name === action.object);
      }

      if (!targetObj && action.object !== 'System' && action.action !== 'SetPlayerSkin') return;

      let params = action.params;
      if (typeof params === 'string') {
          try {
              params = JSON.parse(params);
          } catch (e) {}
      }

      switch (action.action) {
          case 'SetVisible':
              if (targetObj) targetObj.visible = params?.visible !== false;
              break;
          case 'SetOpacity':
              if (targetObj) targetObj.opacity = Number(params?.opacity ?? 1);
              break;
          case 'SetZIndex':
              if (targetObj) targetObj.zIndex = Number(params?.zIndex ?? 0);
              break;
          case 'SetFlipX':
              if (targetObj) targetObj.direction = params?.flip ? 'left' : 'right';
              break;
          case 'SetFlipY':
              if (targetObj) targetObj.flipY = !!params?.flip;
              break;
          case 'Destroy':
              if (targetObj) {
                  const idsToDestroy = new Set<number>([targetObj.id]);
                  let added = true;
                  while (added) {
                      added = false;
                      gameObjectsRef.current.forEach(o => {
                          if (o.parentId && idsToDestroy.has(o.parentId) && !idsToDestroy.has(o.id)) {
                              idsToDestroy.add(o.id);
                              added = true;
                          }
                      });
                  }
                  gameObjectsRef.current = gameObjectsRef.current.filter(o => !idsToDestroy.has(o.id));
              }
              break;
          case 'SetVariable':
              if (params?.variable) {
                  const val = params.value;
                  gameVariables.current[params.variable] = (val !== '' && !isNaN(Number(val))) ? Number(val) : val;
              }
              break;
          case 'SetBooleanVariable':
              if (params?.variable) {
                  gameVariables.current[params.variable] = !!params.valueBoolean;
              }
              break;
          case 'ToggleBooleanVariable':
              if (params?.variable) {
                  gameVariables.current[params.variable] = !gameVariables.current[params.variable];
              }
              break;
          case 'SetObjectPosition':
              if (targetObj && params) {
                  targetObj.x = Number(params.x) || targetObj.x;
                  targetObj.y = Number(params.y) || targetObj.y;
              }
              break;
          case 'TeleportToObject':
              if (targetObj && params?.targetObjectName) {
                  const targetToTeleport = gameObjectsRef.current.find(o => o.name === params.targetObjectName);
                  if (targetToTeleport) {
                      targetObj.x = targetToTeleport.x;
                      targetObj.y = targetToTeleport.y;
                  }
              }
              break;
          case 'AddToVariable':
              if (params?.variable) {
                  // Ensure we handle missing variables by defaulting to 0
                  const currentRaw = gameVariables.current[params.variable];
                  const currentVal = Number((currentRaw === undefined || currentRaw === null || currentRaw === '') ? 0 : currentRaw);
                  const toAdd = Number(params.value ?? 0);
                  const result = currentVal + toAdd;
                  gameVariables.current[params.variable] = isNaN(result) ? (params.value ?? 0) : result;
                  
                  // Spawn visual floating feedback!
                  spawnFloatingFeedback(targetObj || self, toAdd, params.variable);
              }
              break;
          case 'SetObjectVariable':
              if (targetObj && params?.variable) {
                  if (!targetObj.variables) targetObj.variables = [];
                  const v = targetObj.variables.find(v => v.name === params.variable);
                  const val = params.value;
                  const finalVal = (val !== '' && !isNaN(Number(val))) ? Number(val) : val;
                  if (v) v.value = finalVal;
                  else targetObj.variables.push({ name: params.variable, value: finalVal });
              }
              break;
          case 'SetObjectBooleanVariable':
              if (targetObj && params?.variable) {
                  if (!targetObj.variables) targetObj.variables = [];
                  const v = targetObj.variables.find(v => v.name === params.variable);
                  if (v) v.value = !!params.valueBoolean;
                  else targetObj.variables.push({ name: params.variable, value: !!params.valueBoolean });
              }
              break;
          case 'ToggleObjectBooleanVariable':
              if (targetObj && params?.variable) {
                  if (!targetObj.variables) targetObj.variables = [];
                  const v = targetObj.variables.find(v => v.name === params.variable);
                  if (v) v.value = !v.value;
                  else targetObj.variables.push({ name: params.variable, value: true });
              }
              break;
          case 'AddToObjectVariable':
              if (targetObj && params?.variable) {
                  if (!targetObj.variables) targetObj.variables = [];
                  const v = targetObj.variables.find(v => v.name === params.variable);
                  const toAdd = Number(params.value || 0);
                  if (v) v.value = Number(v.value || 0) + toAdd;
                  else targetObj.variables.push({ name: params.variable, value: toAdd });

                  // Spawn visual floating feedback!
                  spawnFloatingFeedback(targetObj, toAdd, params.variable);
              }
              break;
          case 'GoToScene':
              if (params?.sceneName) {
                  sceneChangeRequested.current = true;
                  onGoToScene(params.sceneName);
              }
              break;
          case 'SetSceneUnlocked':
              if (params?.sceneName) {
                  const unlocked = params.valueBoolean !== false;
                  gameVariables.current['scene_unlocked_' + params.sceneName] = unlocked;
              }
              break;
          case 'CreateMatch':
              frameMatchFound.current = true;
              framePlayerJoined.current = true;
              break;
          case 'JoinMatch':
              frameMatchFound.current = true;
              framePlayerJoined.current = true;
              break;
          case 'SendNetworkMessage':
              frameReceiveNetworkMessage.current = true;
              break;
          case 'SetPlayerName':
              if (targetObj) {
                  targetObj.name = params?.name || params?.value || 'Jugador';
              }
              break;
          case 'PlayAnimation':
              if(targetObj && params?.animationId) {
                  const animId = String(params.animationId);
                  const anim = animations.find(a => a.id === animId);
                  if (anim) {
                      const currentAnim = activeAnimations.current.get(targetObj.id);
                      const isOneShotPlaying = currentAnim && currentAnim.animation.loop === false;
                      let stillPlaying = false;
                      if (isOneShotPlaying) {
                          const totalDuration = currentAnim.animation.frames.reduce((sum: number, f: any) => sum + f.duration, 0);
                          const elapsed = performance.now() - currentAnim.startTime;
                          if (elapsed < totalDuration) {
                              stillPlaying = true;
                          }
                      }
                      if (forceRestart || !currentAnim || (currentAnim.animation.id !== anim.id && !stillPlaying)) {
                          activeAnimations.current.set(targetObj.id, {
                              animation: anim,
                              startTime: performance.now(),
                          });
                      }
                  }
              }
              break;
          case 'SetUIText':
              if (targetObj && targetObj.isUI && typeof params?.text === 'string') {
                  targetObj.text = params.text;
              }
              break;
          case 'SetObjectPosition':
              if (targetObj && params?.x != null && params?.y != null) {
                  targetObj.x = Number(params.x);
                  targetObj.y = Number(params.y);
              }
              break;
          case 'MoveObject':
                if (targetObj && params?.direction && params?.speed != null) {
                    const speed = Number(params.speed);
                    const direction = (params.direction || '').toLowerCase();
                    if (isContinuous) {
                        if (!targetObj.pendingMovements) targetObj.pendingMovements = [];
                        targetObj.pendingMovements.push({ direction, speed });
                    } else {
                        switch (direction) {
                            case 'right': targetObj.x += speed; break;
                            case 'left': targetObj.x -= speed; break;
                            case 'up': targetObj.y -= speed; break;
                            case 'down': targetObj.y += speed; break;
                        }
                    }
                }
                break;
          case 'SetVelocityX':
                if (targetObj && (params?.vx != null || params?.velocity != null)) {
                    targetObj.vx = Number(params.vx ?? params.velocity);
                }
                break;
          case 'SetVelocityY':
                if (targetObj && (params?.vy != null || params?.velocity != null)) {
                    targetObj.vy = Number(params.vy ?? params.velocity);
                }
                break;
          case 'SetRotationSpeed':
                if (targetObj && params?.speed != null) {
                    targetObj.rotationSpeed = Number(params.speed);
                }
                break;
          case 'SetScaleSpeedX':
                if (targetObj && params?.speed != null) {
                    targetObj.scaleSpeedX = Number(params.speed);
                }
                break;
          case 'SetScaleSpeedY':
                if (targetObj && params?.speed != null) {
                    targetObj.scaleSpeedY = Number(params.speed);
                }
                break;
            case 'OscillateObject':
                if (targetObj && params?.axis && params?.distance != null && params?.speed != null) {
                    targetObj.oscillation = {
                        axis: params.axis as 'x' | 'y',
                        distance: Number(params.distance),
                        speed: Number(params.speed),
                        initialX: targetObj.initialX ?? targetObj.x,
                        initialY: targetObj.initialY ?? targetObj.y,
                        startTime: performance.now()
                    };
                    if (targetObj.initialX === undefined) targetObj.initialX = targetObj.x;
                    if (targetObj.initialY === undefined) targetObj.initialY = targetObj.y;
                }
                break;
            case 'OscillateScale':
                if (targetObj && params?.distance != null && params?.speed != null) {
                    targetObj.scaleOscillation = {
                        distance: Number(params.distance),
                        speed: Number(params.speed),
                        initialScaleX: targetObj.initialScaleX ?? (targetObj.scaleX || 1),
                        initialScaleY: targetObj.initialScaleY ?? (targetObj.scaleY || 1),
                        startTime: performance.now()
                    };
                    if (targetObj.initialScaleX === undefined) targetObj.initialScaleX = targetObj.scaleX || 1;
                    if (targetObj.initialScaleY === undefined) targetObj.initialScaleY = targetObj.scaleY || 1;
                }
                break;
            case 'RotateContinuously':
                if (targetObj && params?.speed != null) {
                    targetObj.rotationSpeed = Number(params.speed);
                }
                break;
            case 'RotateObject':
                if (targetObj && params?.rotation != null) {
                    const rotation = Number(params.rotation || 0);
                    if (isContinuous) {
                        targetObj.rotation = ((targetObj.rotation || 0) + rotation * deltaTime) % 360;
                    } else {
                        targetObj.rotation = ((targetObj.rotation || 0) + rotation) % 360;
                    }
                    if (targetObj.rotation < 0) targetObj.rotation += 360;
                }
                break;
            case 'ScaleObject':
                if (targetObj && params?.scaleX != null && params?.scaleY != null) {
                    const scaleX = Number(params.scaleX || 1);
                    const scaleY = Number(params.scaleY || 1);
                    if (isContinuous) {
                        targetObj.scaleX = Math.max(0.01, (targetObj.scaleX ?? 1) + (scaleX - 1) * deltaTime);
                        targetObj.scaleY = Math.max(0.01, (targetObj.scaleY ?? 1) + (scaleY - 1) * deltaTime);
                    } else {
                        targetObj.scaleX = Math.max(0.01, (targetObj.scaleX ?? 1) * scaleX);
                        targetObj.scaleY = Math.max(0.01, (targetObj.scaleY ?? 1) * scaleY);
                    }
                }
                break;
            case 'SetScale':
                if (targetObj && params?.scaleX != null && params?.scaleY != null) {
                    targetObj.scaleX = Math.max(0.01, Number(params.scaleX));
                    targetObj.scaleY = Math.max(0.01, Number(params.scaleY));
                }
                break;
            case 'MoveTo':
                if (targetObj && params?.x != null && params?.y != null) {
                    const duration = Number(params.duration || 1);
                    if (!targetObj.tweens) targetObj.tweens = [];
                    // Remove existing position tweens to avoid conflicts
                    targetObj.tweens = targetObj.tweens.filter(t => t.type !== 'position');
                    targetObj.tweens.push({
                        type: 'position',
                        startX: targetObj.x,
                        startY: targetObj.y,
                        endX: Number(params.x),
                        endY: Number(params.y),
                        startTime: performance.now(),
                        duration: duration * 1000
                    });
                }
                break;
            case 'RotateTo':
                if (targetObj && params?.rotation != null) {
                    const duration = Number(params.duration || 1);
                    if (!targetObj.tweens) targetObj.tweens = [];
                    // Remove existing rotation tweens
                    targetObj.tweens = targetObj.tweens.filter(t => t.type !== 'rotation');
                    targetObj.tweens.push({
                        type: 'rotation',
                        startRotation: targetObj.rotation || 0,
                        endRotation: Number(params.rotation),
                        startTime: performance.now(),
                        duration: duration * 1000
                    });
                }
                break;
            case 'ScaleTo':
                if (targetObj && params?.scaleX != null && params?.scaleY != null) {
                    const duration = Number(params.duration || 1);
                    if (!targetObj.tweens) targetObj.tweens = [];
                    // Remove existing scale tweens
                    targetObj.tweens = targetObj.tweens.filter(t => t.type !== 'scale');
                    targetObj.tweens.push({
                        type: 'scale',
                        startScaleX: targetObj.scaleX || 1,
                        startScaleY: targetObj.scaleY || 1,
                        endScaleX: Number(params.scaleX),
                        endScaleY: Number(params.scaleY),
                        startTime: performance.now(),
                        duration: duration * 1000
                    });
                }
                break;
            case 'SlideTo':
                if (targetObj && params?.x != null && params?.y != null) {
                    const duration = Number(params.duration || 1);
                    if (!targetObj.tweens) targetObj.tweens = [];
                    targetObj.tweens = targetObj.tweens.filter(t => t.type !== 'position');
                    targetObj.tweens.push({
                        type: 'position',
                        startX: targetObj.x,
                        startY: targetObj.y,
                        endX: Number(params.x),
                        endY: Number(params.y),
                        startTime: performance.now(),
                        duration: duration * 1000
                    });
                }
                break;
            case 'SetDraggable':
                if (targetObj) {
                    targetObj.isDraggable = params?.enabled !== false;
                    targetObj.dragXLocked = !!params?.lockX;
                    targetObj.dragYLocked = !!params?.lockY;
                    if (params?.minX != null) targetObj.dragMinX = Number(params.minX);
                    if (params?.maxX != null) targetObj.dragMaxX = Number(params.maxX);
                    if (params?.minY != null) targetObj.dragMinY = Number(params.minY);
                    if (params?.maxY != null) targetObj.dragMaxY = Number(params.maxY);
                }
                break;
            case 'EnableCollision':
                if (targetObj) {
                    targetObj.isTouchable = true;
                }
                break;
            case 'DisableCollision':
                if (targetObj) {
                    targetObj.isTouchable = false;
                }
                break;
            case 'ShowConsole':
                setConsoleOpen(true);
                break;
            case 'CreateObject':
                if (action.params?.templateObjectName) {
                    const templateName = action.params.templateObjectName;
                    const templateObj = scene.gameObjects.find(o => o.name === templateName) || globalObjects?.find(o => o.name === templateName);
                    if (templateObj) {
                        const newObj = {
                            ...JSON.parse(JSON.stringify(templateObj)),
                            id: Date.now() + Math.random(),
                            x: 0,
                            y: 0
                        };
                        gameObjectsRef.current.push(newObj);
                    }
                }
                break;
            case 'GenerateObjectAt':
                if (action.params?.templateObjectName && action.params?.targetObjectName) {
                    const templateName = action.params.templateObjectName;
                    const targetName = action.params.targetObjectName;
                    const templateObj = scene.gameObjects.find(o => o.name === templateName) || globalObjects?.find(o => o.name === templateName);
                    const targetObjRef = gameObjectsRef.current.find(o => o.name === targetName);
                    if (templateObj && targetObjRef) {
                        const targetAbsPos = getObjectAbsolutePosition(targetObjRef.id, new Map(gameObjectsRef.current.map(o => [o.id, o])));
                        const newObj = {
                            ...JSON.parse(JSON.stringify(templateObj)),
                            id: Date.now() + Math.random(),
                            x: targetAbsPos.x,
                            y: targetAbsPos.y
                        };
                        gameObjectsRef.current.push(newObj);
                    }
                }
                break;
            case 'SetQuestState':
                if (action.params?.questId && action.params?.questState) {
                    gameVariables.current['quest_' + action.params.questId] = action.params.questState;
                }
                break;
            case 'ForceJump':
                if (targetObj && targetObj.behaviors?.some(b => ['PlatformerCharacter', 'Physics'].includes(b.name)) && action.params?.jumpForce != null) {
                    targetObj.vy = -Number(action.params.jumpForce);
                    targetObj.grounded = false;
                }
                break;
            case 'TriggerAttack':
                if (targetObj) {
                    frameAttacks.current.push({ name: targetObj.name, id: targetObj.id });
                }
                break;
            case 'SetParent':
                if (targetObj) {
                    if (!action.params?.parentName) {
                        targetObj.parentId = null;
                    } else {
                        const parentObj = gameObjectsRef.current.find(o => o.name === action.params.parentName);
                        if (parentObj) {
                            targetObj.parentId = parentObj.id;
                        }
                    }
                }
                break;
          case 'PlaySound':
                if (action.params?.soundId) {
                    const soundAsset = assets.find(a => a.id === action.params.soundId);
                    if (soundAsset) {
                        const cachedAudio = audioCache.current.get(soundAsset.url);
                        if (cachedAudio) {
                            const audioToPlay = cachedAudio.cloneNode() as HTMLAudioElement;
                            audioToPlay.loop = action.params.loop === true || action.params.loop === 'true';
                            audioToPlay.play().catch(() => {});
                        }
                    }
                }
              break;
            case 'SetBackgroundMusic':
                if (action.params?.soundId) {
                    if (backgroundMusicPlayer.current) {
                        backgroundMusicPlayer.current.pause();
                        backgroundMusicPlayer.current = null;
                    }
                    const musicAsset = assets.find(a => a.id === action.params.soundId);
                    if (musicAsset) {
                        currentBackgroundMusicId.current = musicAsset.id;
                        const cachedAudio = audioCache.current.get(musicAsset.url);
                        if (cachedAudio) {
                            const audio = cachedAudio.cloneNode() as HTMLAudioElement;
                            audio.loop = action.params.loop !== false && action.params.loop !== 'false';
                            audio.play().catch(e => console.error("Error playing background music:", e));
                            backgroundMusicPlayer.current = audio;
                        }
                    }
                }
                break;
            case 'StopBackgroundMusic':
                if (backgroundMusicPlayer.current) {
                    backgroundMusicPlayer.current.pause();
                    backgroundMusicPlayer.current.currentTime = 0;
                    backgroundMusicPlayer.current = null;
                    currentBackgroundMusicId.current = null;
                }
                break;
            case 'PauseBackgroundMusic':
                if (backgroundMusicPlayer.current) {
                    backgroundMusicPlayer.current.pause();
                }
                break;
            case 'ResumeBackgroundMusic':
                if (backgroundMusicPlayer.current) {
                    backgroundMusicPlayer.current.play().catch(() => {});
                }
                break;
            case 'SetBackgroundMusicVolume':
                if (backgroundMusicPlayer.current && action.params?.volume != null) {
                    const volume = Math.max(0, Math.min(100, Number(action.params.volume))) / 100;
                    backgroundMusicPlayer.current.volume = volume;
                }
                break;
          case 'SetBackgroundColor':
                if(action.params?.color) setRuntimeBackgroundColor(action.params.color);
              break;
          case 'PlayVideo': {
              const selectedAsset = projectData.assets?.find(a => a.id === action.params?.videoAssetId);
              const url = selectedAsset ? selectedAsset.url : targetObj?.videoUrl;
              if (url) {
                  let video = videoCache.current.get(url);
                  if (!video) {
                      video = document.createElement('video');
                      video.muted = targetObj?.videoMuted !== false;
                      video.playsInline = true;
                      video.setAttribute('webkit-playsinline', 'true');
                      video.loop = targetObj?.videoLoop !== false;
                      video.src = url;
                      video.load();
                      videoCache.current.set(url, video);
                  }
                  if (video) {
                      video.dataset.playState = 'playing';
                      video.play().catch(()=>{});
                  }
                  if (targetObj) {
                      targetObj.videoUrl = url;
                  }
              }
              break;
          }
          case 'PauseVideo': {
              const selectedAsset = projectData.assets?.find(a => a.id === action.params?.videoAssetId);
              const url = selectedAsset ? selectedAsset.url : targetObj?.videoUrl;
              if (url) {
                  let video = videoCache.current.get(url);
                  if (!video) {
                      video = document.createElement('video');
                      video.muted = targetObj?.videoMuted !== false;
                      video.playsInline = true;
                      video.setAttribute('webkit-playsinline', 'true');
                      video.loop = targetObj?.videoLoop !== false;
                      video.src = url;
                      video.load();
                      videoCache.current.set(url, video);
                  }
                  if (video) {
                      video.dataset.playState = 'paused';
                      video.pause();
                  }
              }
              break;
          }
          case 'StopVideo': {
              const selectedAsset = projectData.assets?.find(a => a.id === action.params?.videoAssetId);
              const url = selectedAsset ? selectedAsset.url : targetObj?.videoUrl;
              if (url) {
                  let video = videoCache.current.get(url);
                  if (!video) {
                      video = document.createElement('video');
                      video.muted = targetObj?.videoMuted !== false;
                      video.playsInline = true;
                      video.setAttribute('webkit-playsinline', 'true');
                      video.loop = targetObj?.videoLoop !== false;
                      video.src = url;
                      video.load();
                      videoCache.current.set(url, video);
                  }
                  if (video) {
                      video.dataset.playState = 'paused';
                      video.pause();
                      video.currentTime = 0;
                  }
              }
              break;
          }
          case 'SetCameraZoom':
              if (action.params?.zoomLevel) {
                  camera.current.zoom = Math.max(0.1, Number(action.params.zoomLevel));
              }
              break;
           case 'SaveGame':
              if (action.params?.slot) {
                  try {
                      const gameState = {
                          sceneName: scene.name,
                          gameObjects: gameObjectsRef.current,
                          gameVariables: gameVariables.current,
                          camera: camera.current,
                      };
                      localStorage.setItem('return-2d-save-slot-' + action.params.slot, JSON.stringify(gameState));
                      console.log('Game saved to slot ' + action.params.slot);
                  } catch (e) { console.error('Error saving game state:', e); }
              }
              break;
          case 'LoadGame':
              if (action.params?.slot) {
                  try {
                      const savedStateJSON = localStorage.getItem('return-2d-save-slot-' + action.params.slot);
                      if (savedStateJSON) {
                          const savedState = JSON.parse(savedStateJSON);
                          if (savedState.sceneName !== scene.name) {
                              sceneChangeRequested.current = true;
                              onGoToScene(savedState.sceneName); 
                          }
                          gameObjectsRef.current = savedState.gameObjects;
                          gameVariables.current = savedState.gameVariables;
                          camera.current = savedState.camera;
                          console.log('Game loaded from slot ' + action.params.slot);
                      }
                  } catch(e) { console.error('Error loading game state:', e); }
              }
              break;
            case 'StartTimer':
                if (action.params?.timerName && action.params?.duration != null) {
                    timersRef.current.set(action.params.timerName, {
                        startTime: performance.now(),
                        duration: Number(action.params.duration) * 1000
                    });
                }
                break;
            case 'StopTimer':
                if (action.params?.timerName) {
                    timersRef.current.delete(action.params.timerName);
                }
                break;
        case 'Attack':
            if (targetObj) {
                // Play sword swing sound
                playSwordSynthSound();
                // Flag to animate rotation
                targetObj.attackEndTime = Date.now() + 150;
                
                const damageVal = action.params?.damage !== undefined ? Number(action.params.damage) : 15;
                const attackBox: GameObject = {
                    id: Date.now() + Math.random(),
                    name: 'AttackBox',
                    x: targetObj.x + (targetObj.direction === 'left' ? -35 : targetObj.width + 5),
                    y: targetObj.y + (targetObj.height * 0.1),
                    width: 35,
                    height: targetObj.height * 0.8,
                    isProjectile: true,
                    projectileLifetime: 0.15,
                    behaviors: [], // No solid tile, overlap to damage!
                    color: '#ffffff',
                    opacity: 0.6,
                    zIndex: 10,
                    stats: { hp: 1, maxHp: 1, attack: damageVal }
                };
                gameObjectsRef.current.push(attackBox);
            }
            break;
        case 'Shoot':
            if (targetObj) {
                // Play shoot sound
                playShootSynthSound();
                // Flag to animate rotation momentarily
                targetObj.attackEndTime = Date.now() + 100;

                const bSpeed = Number(action.params?.speed || 400);
                const bDamage = Number(action.params?.damage || 15);
                const bDir = targetObj.direction === 'left' ? -1 : 1;
                
                const bulletBox: GameObject = {
                    id: Date.now() + Math.random(),
                    name: 'Bullet',
                    x: targetObj.x + (bDir === -1 ? -15 : targetObj.width + 5),
                    y: targetObj.y + targetObj.height / 2 - 4,
                    width: 12,
                    height: 6,
                    isProjectile: true,
                    projectileLifetime: 3.0,
                    vx: bDir * bSpeed,
                    vy: 0,
                    color: action.params?.color || '#ffff00',
                    opacity: 0.9,
                    zIndex: 12,
                    stats: { hp: 1, maxHp: 1, attack: bDamage }
                };
                gameObjectsRef.current.push(bulletBox);
            }
            break;
        case 'CreatePlayers':
            {
                const pCount = Math.max(2, Math.min(16, Number(action.params?.count || action.params?.value || 2)));
                const mainPlayer = gameObjectsRef.current.find(obj => 
                    obj.behaviors?.some(b => b.name === 'PlatformerCharacter' || b.name === 'TopDownRPGMovement')
                );
                if (mainPlayer) {
                    const rootName = mainPlayer.name.split('_Player')[0];
                    const existingClones = gameObjectsRef.current.filter(obj => 
                        obj.id !== mainPlayer.id && obj.name.startsWith(rootName + '_Player')
                    );
                    if (existingClones.length + 1 !== pCount) {
                        // Clean up existing clones
                        gameObjectsRef.current = gameObjectsRef.current.filter(obj => 
                            obj.id === mainPlayer.id || !obj.name.startsWith(rootName + '_Player')
                        );
                        // Spawn clones
                        for (let i = 1; i < pCount; i++) {
                            const clone: GameObject = JSON.parse(JSON.stringify(mainPlayer));
                            clone.id = Date.now() + Math.random() + i;
                            clone.name = `${rootName}_Player${i + 1}`;
                            clone.x = mainPlayer.x + i * (mainPlayer.width + 12);
                            gameObjectsRef.current.push(clone);
                        }
                    }
                }
            }
            break;
        case 'DisconnectPlayers':
            {
                const mainPlayer = gameObjectsRef.current.find(obj => 
                    obj.behaviors?.some(b => b.name === 'PlatformerCharacter' || b.name === 'TopDownRPGMovement')
                );
                if (mainPlayer) {
                    const rootName = mainPlayer.name.split('_Player')[0];
                    gameObjectsRef.current = gameObjectsRef.current.filter(obj => 
                        obj.id === mainPlayer.id || !obj.name.startsWith(rootName + '_Player')
                    );
                    framePlayerLeft.current = true;
                }
            }
            break;
        case 'ModifyStat':
            if (targetObj?.stats && action.params?.stat && action.params?.operation && action.params?.value != null) {
                const stat = action.params.stat as keyof GameObject['stats'];
                const operation = action.params.operation;
                const value = Number(action.params.value);
                let currentVal = targetObj.stats[stat] || 0;
                
                let diff = 0;
                if (operation === 'add') diff = value;
                else if (operation === 'subtract') diff = -value;
                else if (operation === 'set') diff = value - currentVal;

                if (operation === 'add') currentVal += value;
                else if (operation === 'subtract') currentVal -= value;
                else if (operation === 'set') currentVal = value;
                
                if (stat === 'hp') {
                    targetObj.stats.hp = Math.max(0, Math.min(targetObj.stats.maxHp, currentVal));
                    spawnFloatingFeedback(targetObj, diff, 'HP');
                } else {
                    targetObj.stats[stat] = currentVal;
                    spawnFloatingFeedback(targetObj, diff, stat);
                }
            }
            break;
        case 'GainHealth':
            if (targetObj && targetObj.stats && params?.value != null) {
                const gain = Number(params.value);
                targetObj.stats.hp = Math.max(0, Math.min(targetObj.stats.maxHp, (targetObj.stats.hp || 100) + gain));
                spawnFloatingFeedback(targetObj, gain, 'HP');
            }
            break;
        case 'LoseHealth':
            if (targetObj && targetObj.stats && params?.value != null) {
                const loss = Number(params.value);
                targetObj.stats.hp = Math.max(0, (targetObj.stats.hp || 100) - loss);
                spawnFloatingFeedback(targetObj, -loss, 'HP');
            }
            break;
        case 'Knockback':
            if (targetObj) {
                const force = Number(params?.force || 300);
                const sourceName = params?.fromObjectName;
                let angle = -Math.PI / 4;
                
                if (sourceName === 'Self' && self && targetObj.id !== self.id) {
                    const dx = targetObj.x - self.x;
                    const dy = targetObj.y - self.y;
                    angle = Math.atan2(dy, dx);
                } else if (sourceName && sourceName !== 'Self') {
                    const sourceObj = gameObjectsRef.current.find(o => o.name === sourceName);
                    if (sourceObj) {
                        const dx = targetObj.x - sourceObj.x;
                        const dy = targetObj.y - sourceObj.y;
                        angle = Math.atan2(dy, dx);
                    }
                }
                
                let vx = Math.cos(angle) * force;
                let vy = Math.sin(angle) * force;
                
                const hasRPG = targetObj.behaviors?.some(b => b.name === 'TopDownRPGMovement');
                if (hasRPG) {
                    targetObj.rpgKnockbackVx = vx;
                    targetObj.rpgKnockbackVy = vy;
                } else {
                    if (Math.abs(vx) < 50) {
                        vx = (targetObj.direction === 'left' ? 1 : -1) * force * 0.7;
                    }
                    if (vy > -120) {
                        vy = -force * 0.5;
                    }
                    targetObj.vx = vx;
                    targetObj.vy = vy;
                    targetObj.grounded = false;
                }
            }
            break;
          case 'ShowDialogue':
              if (action.params?.dialogueText) {
                  setDialogue({ 
                      text: action.params.dialogueText, 
                      speaker: action.object,
                      onCompleteActions: action.onCompleteActions
                  });
              }
              break;
          case 'SetJoystickEnabled':
              if (params?.enabled !== undefined) {
                  const isEnabled = params.enabled === true || params.enabled === 'true';
                  setJoystickRuntimeEnabled(isEnabled);
              }
              break;
          case 'EnableBehavior':
              if (targetObj && targetObj.behaviors && params?.behaviorName) {
                  const origBehavs = targetObj._originalBehaviors || targetObj.behaviors;
                  origBehavs.forEach((b: any) => {
                      if (b.name === params.behaviorName) {
                          b.disabled = false;
                      }
                  });
              }
              break;
          case 'DisableBehavior':
              if (targetObj && targetObj.behaviors && params?.behaviorName) {
                  const origBehavs = targetObj._originalBehaviors || targetObj.behaviors;
                  origBehavs.forEach((b: any) => {
                      if (b.name === params.behaviorName) {
                          b.disabled = true;
                      }
                  });
              }
              break;
          case 'SetSkin':
              if (targetObj) {
                  let url = params?.imageUrl;
                  if (params?.assetId) {
                      const asset = assets.find(a => a.id === params.assetId);
                      if (asset) url = asset.url;
                  }
                  if (url) {
                      targetObj.imageUrl = url;
                      if (!imageCache.current.has(url)) {
                          const img = new Image();
                          img.src = url;
                          img.onload = () => {
                              imageCache.current.set(url, img);
                          };
                      }
                  }
                  if (params?.color) {
                      targetObj.color = params.color;
                  }
              }
              break;
          case 'SetPlayerSkin': {
              const playerObj = gameObjectsRef.current.find(o => 
                  !o.isUI && 
                  (
                      o.behaviors?.some(b => ['PlatformerCharacter', 'TopDownRPGMovement'].includes(b.name)) ||
                      ['player', 'jugador', 'jugador_1', 'player_1'].includes(o.name.toLowerCase())
                  )
              );
              const targetToUse = playerObj || targetObj;
              if (targetToUse) {
                  let url = params?.imageUrl;
                  if (params?.assetId) {
                      const asset = assets.find(a => a.id === params.assetId);
                      if (asset) url = asset.url;
                  }
                  if (url) {
                      targetToUse.imageUrl = url;
                      if (!imageCache.current.has(url)) {
                          const img = new Image();
                          img.src = url;
                          img.onload = () => {
                              imageCache.current.set(url, img);
                          };
                      }
                  }
                  if (params?.color) {
                      targetToUse.color = params.color;
                  }
              }
              break;
          }
      }
  };

  const executeAction = (action: Action, self?: GameObject, isContinuous: boolean = false, deltaTime: number = 0, forceRestart: boolean = false, pickedObjects?: Record<string, GameObject[]>) => {
      if (action.object === 'System' || action.object === 'Camera' || action.object === 'Self' || (self && action.object === self.name)) {
          executeActionSingle(action, self, undefined, isContinuous, deltaTime, forceRestart);
          return;
      }
      
      let targetInstances = pickedObjects && pickedObjects[action.object] ? pickedObjects[action.object] : undefined;
      
      if (!targetInstances || targetInstances.length === 0) {
          targetInstances = gameObjectsRef.current.filter(o => o.name === action.object);
      }
      
      if (targetInstances.length > 0) {
          targetInstances.forEach(inst => {
              executeActionSingle(action, self, inst, isContinuous, deltaTime, forceRestart);
          });
      } else {
          executeActionSingle(action, self, undefined, isContinuous, deltaTime, forceRestart);
      }
  };

  const executeActionsSequential = async (
      actionsList: Action[], 
      self?: GameObject, 
      isContinuous: boolean = false, 
      deltaTime: number = 0, 
      forceRestart: boolean = false, 
      pickedObjects?: Record<string, GameObject[]>,
      sequenceKey?: string
  ) => {
      if (sequenceKey) {
          if (activeSequencesRef.current.has(sequenceKey)) {
              return;
          }
          activeSequencesRef.current.add(sequenceKey);
      }
      try {
          for (let i = 0; i < actionsList.length; i++) {
              const action = actionsList[i];
              if (action.action === 'Wait') {
                  const secs = Number(action.params?.duration !== undefined ? action.params.duration : 1);
                  if (secs > 0) {
                      await new Promise(resolve => setTimeout(resolve, secs * 1000));
                  }
              } else {
                  executeAction(action, self, isContinuous, deltaTime, forceRestart, pickedObjects);
                  if (sceneChangeRequested.current) {
                      sceneChangeRequested.current = false;
                      break;
                  }
              }
          }
      } finally {
          if (sequenceKey) {
              activeSequencesRef.current.delete(sequenceKey);
          }
      }
  };

  const checkCondition = (cond: Condition, executingObj?: GameObject, executingObj2?: GameObject) => {
    const { variable, value } = cond.params || {};
    const operator = cond.params?.operator || '==';
    let obj = executingObj && executingObj.name === cond.object ? executingObj : 
              executingObj2 && executingObj2.name === cond.object ? executingObj2 :
              gameObjectsRef.current.find(o => o.name === cond.object);
    
    // Robust numeric check that safely ignores booleans and trims strings
    const isNumeric = (val: any) => {
        if (val === null || val === undefined || typeof val === 'boolean') return false;
        const s = String(val).trim();
        return s !== '' && !isNaN(Number(s));
    };

    switch (cond.trigger) {
        case 'Always':
            return true;
        case 'OnCollisionWith':
        case 'OnVerticalCollision':
        case 'OnHorizontalCollision':
            return frameCollisions.current.some(c => {
                const pairMatch = ((c.obj1Name === cond.object && c.obj2Name === cond.target) || (c.obj2Name === cond.object && c.obj1Name === cond.target));
                if (!pairMatch) return false;

                if (cond.trigger === 'OnCollisionWith') {
                    // Generic 'OnCollisionWith' matches any collision type
                    return true;
                } else {
                    // Specific triggers must match specific collision types
                    return c.type === cond.trigger;
                }
            });
        case 'OnObjectClicked':
            return obj ? frameClicks.current.some(c => c.id === obj.id) : frameClicks.current.some(c => c.name === cond.object);
        case 'OnInteract':
            return obj ? frameInteractions.current.some(c => c.id === obj.id) : frameInteractions.current.some(c => c.name === cond.object);
        case 'IsSceneUnlocked':
            if (cond.params?.sceneName) {
                return !!gameVariables.current['scene_unlocked_' + cond.params.sceneName];
            }
            return false;
        case 'OnKeyPress':
            return cond.params?.key && frameKeyPresses.current.includes(cond.params.key.toLowerCase());
        case 'OnAnyKeyPress':
            return frameKeyPresses.current.length > 0;
        case 'OnAttack':
            return obj ? frameAttacks.current.some(c => c.id === obj.id) : frameAttacks.current.some(c => c.name === cond.object);
        case 'OnTimerElapsed':
            return frameTimerEvents.current.includes(cond.params?.timerName);
        case 'OnDialogueEnd':
            return frameDialogueEnd.current;
        case 'IsMobile':
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
        case 'IsPC':
            return !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);
        case 'CompareVariable': {
            if (!variable) return false;
            // Get current value, defaulting to 0 if undefined/null
            const currentVarRaw = gameVariables.current[variable];
            const varValue = (currentVarRaw === undefined || currentVarRaw === null) ? 0 : currentVarRaw;
            
            const compValue = value !== undefined ? String(value).trim() : "";
            
            if (isNumeric(varValue) && isNumeric(compValue)) {
                const nVar = Number(varValue);
                const nComp = Number(compValue);
                switch (operator) {
                    case '==': return nVar === nComp;
                    case '!=': return nVar !== nComp;
                    case '>': return nVar > nComp;
                    case '<': return nVar < nComp;
                    case '>=': return nVar >= nComp;
                    case '<=': return nVar <= nComp;
                    default: return false;
                }
            }
            
            switch (operator) {
                case '==': return String(varValue).trim() === compValue;
                case '!=': return String(varValue).trim() !== compValue;
                default: return false;
            }
        }
        case 'CompareBooleanVariable': {
            if (!variable) return false;
            let currentVarRaw = gameVariables.current[variable];
            if (currentVarRaw === 'false') currentVarRaw = false;
            else if (currentVarRaw === 'true') currentVarRaw = true;
            else currentVarRaw = !!currentVarRaw;
            
            const targetBool = !!cond.params?.valueBoolean;
            return currentVarRaw === targetBool;
        }
        case 'CompareObjectVariable': {
            if (!obj?.variables || !variable) return false;
            const objVar = obj.variables.find(v => v.name === variable);
            const varValue = objVar ? objVar.value : 0;
            const compValue = value !== undefined ? String(value).trim() : "";

            if (isNumeric(varValue) && isNumeric(compValue)) {
                const nVar = Number(varValue);
                const nComp = Number(compValue);
                switch (operator) {
                    case '==': return nVar === nComp;
                    case '!=': return nVar !== nComp;
                    case '>': return nVar > nComp;
                    case '<': return nVar < nComp;
                    case '>=': return nVar >= nComp;
                    case '<=': return nVar <= nComp;
                    default: return false;
                }
            }
            switch (operator) {
                case '==': return String(varValue).trim() === compValue;
                case '!=': return String(varValue).trim() !== compValue;
                default: return false;
            }
        }
        case 'CompareObjectBooleanVariable': {
            if (!obj?.variables || !variable) return false;
            const objVar = obj.variables.find(v => v.name === variable);
            let varValue = objVar ? objVar.value : false;
            if (varValue === 'false') varValue = false;
            else if (varValue === 'true') varValue = true;
            else varValue = !!varValue;
            
            const targetBool = !!cond.params?.valueBoolean;
            return varValue === targetBool;
        }
        case 'CompareStat': {
            if (!obj || !cond.params?.stat) return false;
            const statName = cond.params?.stat as keyof GameObject['stats'];
            const statValue = obj.stats?.[statName] ?? 0;
            const compValue = value !== undefined ? String(value).trim() : "";

            if (isNumeric(statValue) && isNumeric(compValue)) {
                const nStat = Number(statValue);
                const nComp = Number(compValue);
                switch (operator) {
                    case '==': return nStat === nComp;
                    case '!=': return nStat !== nComp;
                    case '>': return nStat > nComp;
                    case '<': return nStat < nComp;
                    case '>=': return nStat >= nComp;
                    case '<=': return nStat <= nComp;
                    default: return false;
                }
            }
            switch (operator) {
                case '==': return String(statValue).trim() === compValue;
                case '!=': return String(statValue).trim() !== compValue;
                default: return false;
            }
        }
        case 'IsOnGround': return obj && !!obj.grounded;
        case 'IsMoving': return obj && ((obj.vx || 0) !== 0 || (obj.vy || 0) !== 0);
        case 'IsIdle': return obj && (obj.vx || 0) === 0 && (obj.vy || 0) === 0 && !!obj.grounded;
        case 'IsRunning': return obj && (obj.vx || 0) !== 0 && !!obj.grounded;
        case 'IsJumping': return obj && !obj.grounded;
        case 'IsClimbing': return obj && !!obj.isClimbing;
        case 'IsLookingLeft': return obj && obj.direction === 'left';
        case 'IsLookingRight': return obj && obj.direction === 'right';
        case 'IsMusicPlaying':
            const isPlaying = backgroundMusicPlayer.current && !backgroundMusicPlayer.current.paused;
            if (!isPlaying) return false;
            if (cond.params?.soundId) return currentBackgroundMusicId.current === cond.params.soundId;
            return true;
        case 'OnJoystickMove':
            return frameJoystickEvents.current.length > 0;
        case 'OnJoystickUp':
            return frameJoystickEvents.current.includes('up');
        case 'OnJoystickDown':
            return frameJoystickEvents.current.includes('down');
        case 'OnJoystickLeft':
            return frameJoystickEvents.current.includes('left');
        case 'OnJoystickRight':
            return frameJoystickEvents.current.includes('right');
        case 'OnButtonDown':
            return cond.params?.buttonName ? frameButtonDown.current.includes(cond.params.buttonName) : frameButtonDown.current.length > 0;
        case 'OnButtonUp':
            return cond.params?.buttonName ? frameButtonUp.current.includes(cond.params.buttonName) : frameButtonUp.current.length > 0;
        case 'OnTriggerDown':
            return cond.params?.triggerName ? frameTriggerDown.current.includes(cond.params.triggerName) : frameTriggerDown.current.length > 0;
        case 'OnTriggerUp':
            return cond.params?.triggerName ? frameTriggerUp.current.includes(cond.params.triggerName) : frameTriggerUp.current.length > 0;
        case 'OnConsoleCommand':
            return cond.params?.command ? frameConsoleCommands.current.includes(cond.params.command) : frameConsoleCommands.current.length > 0;
        case 'OnMatchFound':
            return frameMatchFound.current;
        case 'OnPlayerJoined':
            return framePlayerJoined.current;
        case 'OnPlayerLeft':
            return framePlayerLeft.current;
        case 'OnReceiveNetworkMessage':
            return frameReceiveNetworkMessage.current;
        case 'OnHealthDepleted':
            return obj && obj.stats && obj.stats.hp <= 0;
        default: return false;
    }
};

  const evaluateEvents = (deltaTime: number = 0) => {
      console.log('Evaluating events');
      const objectMap = new Map<string, GameObject[]>();
      gameObjectsRef.current.forEach(obj => {
          if (!objectMap.has(obj.name)) objectMap.set(obj.name, []);
          objectMap.get(obj.name)!.push(obj);
      });
      scene.events.forEach(event => {
        // These events are handled differently or are edge-triggered.
        if (event.conditions.some(c => c.trigger === 'OnStart' || c.trigger === 'EveryXSeconds')) {
            return;
        }

        let pickedObjects: Record<string, GameObject[]> = {};
        let conditionsMet = true;

        for (const cond of event.conditions) {
            if (!conditionsMet) break;

            if (cond.trigger === 'OnCollisionWith' || cond.trigger === 'OnVerticalCollision' || cond.trigger === 'OnHorizontalCollision') {
                const objName = cond.object;
                const targetName = cond.target;

                let candidateObj1 = pickedObjects[objName] || objectMap.get(objName) || [];
                let candidateObj2 = pickedObjects[targetName!] || objectMap.get(targetName!) || [];

                const matches = frameCollisions.current.filter(c => {
                    const pairMatch = ((c.obj1Name === objName && c.obj2Name === targetName) || (c.obj2Name === objName && c.obj1Name === targetName));
                    if (!pairMatch) return false;
                    if (cond.trigger !== 'OnCollisionWith' && c.type !== cond.trigger) return false;
                    
                    const isMatch1 = candidateObj1.some(o => o.id === c.obj1Id || o.id === c.obj2Id);
                    const isMatch2 = candidateObj2.some(o => o.id === c.obj1Id || o.id === c.obj2Id);
                    return isMatch1 && isMatch2;
                });

                if (matches.length === 0) {
                    conditionsMet = false;
                    break;
                }

                const validObj1: GameObject[] = [];
                const validObj2: GameObject[] = [];

                matches.forEach(m => {
                    const o1 = candidateObj1.find(o => o.id === m.obj1Id || o.id === m.obj2Id);
                    const o2 = candidateObj2.find(o => o.id === m.obj1Id || o.id === m.obj2Id);
                    if (o1 && !validObj1.includes(o1)) validObj1.push(o1);
                    if (o2 && !validObj2.includes(o2)) validObj2.push(o2);
                });

                pickedObjects[objName] = validObj1;
                pickedObjects[targetName!] = validObj2;

            } else if (['OnObjectClicked', 'OnHealthDepleted', 'IsIdle', 'IsRunning', 'IsJumping', 'IsOnGround', 'IsMoving', 'CompareObjectVariable', 'CompareStat', 'CompareObjectBooleanVariable', 'OnAttack'].includes(cond.trigger)) {
                
                const objectName = cond.object;
                const instancesToCheck = pickedObjects[objectName] || objectMap.get(objectName) || [];
                
                const validInstances = instancesToCheck.filter(inst => checkCondition(cond, inst));

                if (validInstances.length === 0) {
                    conditionsMet = false;
                    break;
                }

                pickedObjects[objectName] = validInstances;

            } else {
                if (!checkCondition(cond)) {
                    conditionsMet = false;
                    break;
                }
            }
        }

        if (conditionsMet) {
            const isEventTrigger = event.conditions.some(c => ['OnClick', 'OnKeyPress', 'OnAttack', 'OnTimerElapsed', 'OnDialogueEnd'].includes(c.trigger));
            executeActionsSequential(event.actions, undefined, !isEventTrigger, deltaTime, false, pickedObjects, `event-${event.id}`);
        }
      });
  };

  useEffect(() => {
    setRuntimeBackgroundColor(scene.backgroundColor);
    camera.current.zoom = scene.defaultZoom || 1;
    camera.current.x = (initialGameWidth || 1024) / 2;
    camera.current.y = (initialGameHeight || 768) / 2;
    
    if (initialState) {
        gameObjectsRef.current = JSON.parse(JSON.stringify(initialState.gameObjects));
        gameVariables.current = JSON.parse(JSON.stringify(initialState.gameVariables));
    } else {
        gameObjectsRef.current = JSON.parse(JSON.stringify(scene.gameObjects.map(o => {
            const hasHealthB = o.behaviors?.some(b => b.name === 'Health');
            const bossB = o.behaviors?.find(b => b.name === 'Boss');
            let stats = o.stats;
            if (!stats) {
                if (bossB) {
                    const hp = Number(bossB.properties?.hp !== undefined ? bossB.properties.hp : 500);
                    const maxHp = Number(bossB.properties?.maxHp !== undefined ? bossB.properties.maxHp : 500);
                    stats = { hp, maxHp, attack: 15 };
                } else if (hasHealthB) {
                    stats = { hp: 100, maxHp: 100, attack: 10 };
                }
            }
            return {
                ...o,
                vx: 0, vy: 0, grounded: false,
                stats
            };
        })));
        
        const initialVars: Record<string, string | number | boolean> = {};
        globalVariables.forEach(v => { initialVars[v.name] = v.value; });
        // Only initialize variables if they haven't been set yet (to allow persistence across scenes)
        if (Object.keys(gameVariables.current).length === 0) {
            gameVariables.current = initialVars;
        } else {
            // Ensure any NEW global variables are added, but keep existing values
            globalVariables.forEach(v => {
                if (gameVariables.current[v.name] === undefined) {
                    gameVariables.current[v.name] = v.value;
                }
            });
        }
    }
    
    activeAnimations.current.clear();
    timersRef.current.clear();
    intervalsRef.current.clear();
    setDialogue(null);

    if (backgroundMusicPlayer.current) {
        backgroundMusicPlayer.current.pause();
        backgroundMusicPlayer.current = null;
        currentBackgroundMusicId.current = null;
    }
    if (scene.backgroundMusicId) {
        const musicAsset = assets.find(a => a.id === scene.backgroundMusicId);
        if (musicAsset) {
            currentBackgroundMusicId.current = musicAsset.id;
            const cachedAudio = audioCache.current.get(musicAsset.url);
            if(cachedAudio){
                const audio = cachedAudio.cloneNode() as HTMLAudioElement;
                audio.loop = true;
                audio.play().catch(e => console.error("Error playing background music:", e));
                backgroundMusicPlayer.current = audio;
            }
        }
    }

    const handleKeyDown = (e: KeyboardEvent) => { 
        if (e.key === 'Tab') {
            e.preventDefault();
            setConsoleOpen(prev => !prev);
            return;
        }
        if (consoleOpen) return;
        const key = e.key.toLowerCase();
        const code = e.code.toLowerCase();
        if (key === 'e' && activeInteractableRef.current) {
            frameInteractions.current.push({
                id: activeInteractableRef.current.id,
                name: activeInteractableRef.current.name
            });
        }
        if (!keysPressed.current[key] && !keysPressed.current[code]) {
            frameKeyPresses.current.push(key);
            frameKeyPresses.current.push(code);
        }
        keysPressed.current[code] = true; 
        keysPressed.current[key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => { 
        keysPressed.current[e.code.toLowerCase()] = false; 
        keysPressed.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let lastTime = 0;
    let lastFrameTime = 0;
    let animationFrameId: number;

    const gameLoop = (timestamp: number) => {
      // Filter out behaviors that are disabled
      gameObjectsRef.current.forEach(obj => {
          if (obj.behaviors) {
              if (!obj._originalBehaviors) {
                  obj._originalBehaviors = [...obj.behaviors];
              }
              obj.behaviors = obj._originalBehaviors.filter(b => (b as any).disabled !== true);
          }
      });

      const now = performance.now();
      if (lastTime === 0) {
        lastTime = now;
        lastFrameTime = now;
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }
      
      const targetFps = projectData?.fps || 60;
      const fpsInterval = 1000 / targetFps;
      const elapsed = now - lastFrameTime;
      if (elapsed < fpsInterval) {
          animationFrameId = requestAnimationFrame(gameLoop);
          return;
        }

      const deltaTime = Math.min(0.1, elapsed / 1000.0);
      lastTime = now;
      lastFrameTime = now - (elapsed % fpsInterval);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Process timers and intervals
      timersRef.current.forEach((timer, name) => {
          if (now >= timer.startTime + timer.duration) {
              frameTimerEvents.current.push(name);
              timersRef.current.delete(name);
          }
      });
      scene.events.forEach((event, eventIndex) => {
          event.conditions.forEach((cond, condIndex) => {
              if (cond.trigger === 'EveryXSeconds' && cond.params?.interval) {
                  const key = `evt-${event.id || eventIndex}-cond-${condIndex}`;
                  const intervalData = intervalsRef.current.get(key);
                  const intervalMs = Number(cond.params.interval) * 1000;
                  if (!intervalData) {
                      intervalsRef.current.set(key, { interval: intervalMs, lastTriggerTime: now });
                  } else if (now >= intervalData.lastTriggerTime + intervalData.interval) {
                      const otherConditionsMet = event.conditions.filter(c => c !== cond).every(cn => checkCondition(cn));
                      if(otherConditionsMet) {
                          executeActionsSequential(event.actions, undefined, false, 0, false, undefined, `event-${event.id}`);
                      }
                      intervalData.lastTriggerTime = now;
                  }
              }
          });
      });

      const controllablePlayers = gameObjectsRef.current.filter(obj => 
          !obj.isUI && obj.behaviors?.some(b => b.name === 'PlatformerCharacter' || b.name === 'TopDownRPGMovement')
      );
      
      const currentControlledId = selectedPlayerId !== null && controllablePlayers.some(p => p.id === selectedPlayerId)
          ? selectedPlayerId
          : controllablePlayers[0]?.id;

      const objectsById = new Map<number, GameObject>(gameObjectsRef.current.map(o => [o.id, o]));
      
      const staticCollisionShapes: ({ x: number; y: number; width: number; height: number; owner: GameObject })[] = [];
        const allObjectsWithAbsPosForPhysics = gameObjectsRef.current.map(o => ({...o, ...getObjectAbsolutePosition(o.id, objectsById)}));
        
        allObjectsWithAbsPosForPhysics.forEach(obj => {
            if (obj.behaviors?.some(b => b.name === 'Solid')) {
                staticCollisionShapes.push({ ...getCollisionBox(obj), owner: obj });
            }
            const tilemapBehavior = obj.behaviors?.find(b => b.name === 'Tilemap');
            if (tilemapBehavior) {
                const { tileSize = 32, collisionData = '' } = tilemapBehavior.properties;
                const rows = String(collisionData).split('\n');
                rows.forEach((row, y) => {
                    for (let x = 0; x < row.length; x++) {
                        if (row[x] !== ' ' && row[x] !== '0') {
                            staticCollisionShapes.push({
                                x: obj.x + x * tileSize,
                                y: obj.y + y * tileSize,
                                width: tileSize,
                                height: tileSize,
                                owner: obj,
                            });
                        }
                    }
                });
            }
        });


      frameJoystickEvents.current = [];
      const actions = actionsPressed.current;
      
      // Reset non-UI actions and intensity
      ['moveLeft','moveRight','moveUp','moveDown','jump','attack','run'].forEach(act => {
        if (!actions[act+'_ui']) actions[act] = false;
      });
      actions.moveHorizontalIntensity = 0;
      
      if (keysPressed.current['shift'] || keysPressed.current['shiftleft'] || keysPressed.current['shiftright'] || keysPressed.current['keyz']) {
          actions.run = true;
      }

      const joystickUpNow = joystickState.current.active && joystickState.current.angle > -135 && joystickState.current.angle < -45;
      
      if (joystickUpNow && !joystickUpPreviousFrame.current) {
          actions.jump = true;
      }
      joystickUpPreviousFrame.current = joystickUpNow;

      if (joystickState.current.active) {
          const joystickSize = joystick?.size ?? 120;
          const maxDistance = joystickSize / 2;
          const intensity = joystickState.current.distance / maxDistance;
          const angle = joystickState.current.angle;
          const angleRad = angle * (Math.PI / 180);
          const horizontalProjection = Math.cos(angleRad);
          
          if (Math.abs(horizontalProjection) > 0.15) { // Threshold
             actions.moveHorizontalIntensity = horizontalProjection * intensity;
             if (horizontalProjection > 0) {
                 actions.moveRight = true;
                 if (!frameJoystickEvents.current.includes('right')) frameJoystickEvents.current.push('right');
             } else {
                 actions.moveLeft = true;
                 if (!frameJoystickEvents.current.includes('left')) frameJoystickEvents.current.push('left');
             }
          }

          // Keep vertical logic for events
          if (angle > 45 && angle < 135) {
             actions.moveDown = true;
             if (!frameJoystickEvents.current.includes('down')) frameJoystickEvents.current.push('down');
          }

          if (joystickUpNow) {
              actions.moveUp = true;
              if (!frameJoystickEvents.current.includes('up')) frameJoystickEvents.current.push('up');
          }
      }
      
      // Keyboard input overrides joystick for horizontal movement intensity
      let keyboardHorizontal = 0;
      if (keysPressed.current['arrowleft'] || keysPressed.current['keya']) keyboardHorizontal -= 1;
      if (keysPressed.current['arrowright'] || keysPressed.current['keyd']) keyboardHorizontal += 1;
      
      if (keyboardHorizontal !== 0) {
          actions.moveHorizontalIntensity = keyboardHorizontal;
      }

      // Set digital actions for events from keyboard
      if (keysPressed.current['arrowleft'] || keysPressed.current['keya']) actions.moveLeft = true;
      if (keysPressed.current['arrowright'] || keysPressed.current['keyd']) actions.moveRight = true;
      if (keysPressed.current['arrowup'] || keysPressed.current['keyw']) actions.moveUp = true;
      if (keysPressed.current['arrowdown'] || keysPressed.current['keys']) actions.moveDown = true;
      if (keysPressed.current['space']) actions.jump = true;
      if (keysPressed.current['keyx'] || actions.attack) actions.attack = true;
      
      // Handle single-press actions like jump and attack
      if (actions.jump) {
        if (!actions.jumpPressed) {
            actions.jumpAction = true;
            actions.jumpPressed = true;
        } else {
            actions.jumpAction = false;
        }
      } else {
          actions.jumpPressed = false;
          actions.jumpAction = false;
      }

      if (actions.attack) {
          if (!actions.attackPressed) {
              actions.attackAction = true;
              actions.attackPressed = true;
          } else {
              actions.attackAction = false;
          }
      } else {
          actions.attackPressed = false;
          actions.attackAction = false;
      }

      gameObjectsRef.current.forEach(obj => {
          if (draggingRef.current && draggingRef.current.id === obj.id) {
              obj.vx = 0;
              obj.vy = 0;
              if (obj.position3D) {
                  obj.position3D.x = obj.x / 50;
                  obj.position3D.z = obj.y / 50;
                  obj.vy3D = 0;
                  obj.vx3D = 0;
                  obj.vz3D = 0;
              }
              return;
          }
          if (previewMode === '3d') {
              if (!obj.position3D) {
                  obj.position3D = { x: obj.x / 50, y: (obj.zIndex || 0) * 0.1, z: obj.y / 50 };
              }
              if (!obj.scale3D) {
                  obj.scale3D = { x: (obj.scaleX ?? 1) * (obj.width / 50), y: 1.0, z: (obj.scaleY ?? 1) * (obj.height / 50) };
              }
              if (!obj.rotation3D) {
                  obj.rotation3D = { x: 0, y: (obj.rotation || 0) * Math.PI / 180, z: 0 };
              }

              // Handle 3D Movement for Player
              const isCurrentControlled = currentControlledId === undefined || obj.id === currentControlledId;
              const hasRPGMovement = obj.behaviors?.some(b => b.name === 'TopDownRPGMovement');
              const platformer = obj.behaviors?.find(b => b.name === 'PlatformerCharacter');
              const rpgMovement = obj.behaviors?.find(b => b.name === 'TopDownRPGMovement');

              if ((platformer || rpgMovement) && isCurrentControlled) {
                  const speedVal = (platformer?.properties?.speed ?? rpgMovement?.properties?.speed ?? 100) / 30;
                  const jumpVal = (platformer?.properties?.jumpForce ?? 300) / 100;
                  
                  let moveX = 0;
                  let moveZ = 0;
                  
                  if (actions.moveLeft) moveX = -1;
                  if (actions.moveRight) moveX = 1;
                  if (actions.moveUp) moveZ = -1;
                  if (actions.moveDown) moveZ = 1;

                  if (moveX !== 0 && moveZ !== 0) {
                      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
                      moveX /= len;
                      moveZ /= len;
                  }

                  obj.position3D.x += moveX * speedVal * deltaTime;
                  obj.position3D.z += moveZ * speedVal * deltaTime;

                  if (moveX < 0) {
                      obj.direction = 'left';
                      obj.rotation3D.y = Math.PI;
                  } else if (moveX > 0) {
                      obj.direction = 'right';
                      obj.rotation3D.y = 0;
                  } else if (moveZ < 0) {
                      obj.rotation3D.y = -Math.PI / 2;
                  } else if (moveZ > 0) {
                      obj.rotation3D.y = Math.PI / 2;
                  }

                  // 3D Jump & Gravity
                  if (obj.vy3D === undefined) obj.vy3D = 0;
                  if (obj.grounded3D === undefined) obj.grounded3D = false;

                  if (platformer) {
                      const gravity3D = 12;
                      obj.vy3D -= gravity3D * deltaTime;
                      obj.position3D.y += obj.vy3D * deltaTime;

                      if (obj.position3D.y <= 0) {
                          obj.position3D.y = 0;
                          obj.vy3D = 0;
                          obj.grounded3D = true;
                      } else {
                          obj.grounded3D = false;
                      }

                      if (actions.jump && obj.grounded3D) {
                          obj.vy3D = jumpVal;
                          obj.grounded3D = false;
                      }
                  } else {
                      if (actions.jump) {
                          obj.position3D.y += speedVal * deltaTime;
                      }
                      if (keysPressed.current['shift'] || keysPressed.current['shiftleft'] || keysPressed.current['shiftright']) {
                          obj.position3D.y -= speedVal * deltaTime;
                      }
                  }
              }

              // Patrol behavior in 3D
              const patrolBehavior = obj.behaviors?.find(b => b.name === 'Patrol' || b.name === 'Patrol3D');
              if (patrolBehavior) {
                  const { speed = 50, range = 100, axis = 'z' } = patrolBehavior.properties;
                  if (obj.initial3D === undefined) {
                      obj.initial3D = { ...obj.position3D };
                  }
                  const time = performance.now() / 1000;
                  const range3D = range / 50;
                  const speed3D = speed / 50;
                  const t = (time * speed3D) / range3D;
                  const cycle = t % 2;
                  const offset = (cycle < 1 ? cycle * range3D : (2 - cycle) * range3D) - range3D / 2;
                  
                  if (axis === 'x') {
                      obj.position3D.x = obj.initial3D.x + offset;
                  } else if (axis === 'y') {
                      obj.position3D.y = obj.initial3D.y + offset;
                  } else {
                      obj.position3D.z = obj.initial3D.z + offset;
                  }
              }

              // Oscillate behavior in 3D
              const oscillateBehavior = obj.behaviors?.find(b => b.name === 'Oscillate' || b.name === 'Oscillate3D');
              if (oscillateBehavior) {
                  const { axis = 'y', distance = 100, speed = 2 } = oscillateBehavior.properties;
                  if (obj.initial3D === undefined) {
                      obj.initial3D = { ...obj.position3D };
                  }
                  const time = performance.now() / 1000;
                  const dist3D = distance / 50;
                  const offset = Math.sin(time * speed) * dist3D;
                  
                  if (axis === 'x') {
                      obj.position3D.x = obj.initial3D.x + offset;
                  } else if (axis === 'y') {
                      obj.position3D.y = obj.initial3D.y + offset;
                  } else {
                      obj.position3D.z = obj.initial3D.z + offset;
                  }
              }

              // Boss behavior in 3D
              const bossBehavior = obj.behaviors?.find(b => b.name === 'Boss' || b.name === 'Boss3D');
              if (bossBehavior) {
                  const { speed = 40, jumpForce = 300, attackInterval = 2.0, attackSpeed = 300, projectileColor = '#ef4444' } = bossBehavior.properties;
                  const playerObj = gameObjectsRef.current.find(p => p.id !== obj.id && p.behaviors?.some(b => ['PlatformerCharacter', 'TopDownRPGMovement'].includes(b.name)));
                  if (playerObj) {
                      if (!playerObj.position3D) {
                          playerObj.position3D = { x: playerObj.x / 50, y: (playerObj.zIndex || 0) * 0.1, z: playerObj.y / 50 };
                      }
                      
                      const pPos = playerObj.position3D;
                      const bPos = obj.position3D;
                      
                      const dx = pPos.x - bPos.x;
                      const dz = pPos.z - bPos.z;
                      const dist = Math.sqrt(dx * dx + dz * dz);
                      const speed3D = speed / 50;
                      
                      if (dist > 0.1) {
                          bPos.x += (dx / dist) * speed3D * deltaTime;
                          bPos.z += (dz / dist) * speed3D * deltaTime;
                          obj.rotation3D.y = Math.atan2(dx, dz);
                      }

                      if (obj.vy3D === undefined) obj.vy3D = 0;
                      const gravity3D = 12;
                      obj.vy3D -= gravity3D * deltaTime;
                      bPos.y += obj.vy3D * deltaTime;
                      if (bPos.y <= 0) {
                          bPos.y = 0;
                          obj.vy3D = 0;
                          if (Math.random() < 0.015) {
                              obj.vy3D = jumpForce / 100;
                          }
                      }

                      if (!obj._lastAttackTime) obj._lastAttackTime = Date.now();
                      const timeNow = Date.now();
                      if (timeNow - obj._lastAttackTime > attackInterval * 1000) {
                          obj._lastAttackTime = timeNow;
                          const projId = Date.now() + Math.floor(Math.random() * 1000);
                          const angle = Math.atan2(pPos.x - bPos.x, pPos.z - bPos.z);
                          const projVx = Math.sin(angle) * (attackSpeed / 50);
                          const projVz = Math.cos(angle) * (attackSpeed / 50);

                          const projectile3D = {
                              id: projId,
                              name: `${obj.name}_Proyectil3D`,
                              x: obj.x,
                              y: obj.y,
                              width: 14,
                              height: 14,
                              color: projectileColor,
                              zIndex: 20,
                              isUI: false,
                              isProjectile: true,
                              projectileLifetime: 3.0,
                              position3D: { x: bPos.x, y: bPos.y + 0.5, z: bPos.z },
                              scale3D: { x: 0.3, y: 0.3, z: 0.3 },
                              vx3D: projVx,
                              vz3D: projVz,
                              vy3D: 0,
                              behaviors: [{ name: 'Physics', properties: { gravity: 0 } }]
                          };
                          gameObjectsRef.current.push(projectile3D);
                      }
                  }
              }

              if (obj.isProjectile && obj.vx3D !== undefined) {
                  obj.position3D.x += (obj.vx3D || 0) * deltaTime;
                  obj.position3D.z += (obj.vz3D || 0) * deltaTime;
                  obj.position3D.y += (obj.vy3D || 0) * deltaTime;
              }

              // Sync back to 2D
              obj.x = Math.round(obj.position3D.x * 50);
              obj.y = Math.round(obj.position3D.z * 50);
              obj.zIndex = Math.round(obj.position3D.y * 10);
          }

          if (obj.isProjectile) {
              obj.x += (obj.vx || 0) * deltaTime;
              obj.y += (obj.vy || 0) * deltaTime;
              
              if (obj.projectileLifetime !== undefined) {
                  obj.projectileLifetime -= deltaTime;
                  if (obj.projectileLifetime <= 0) {
                      setTimeout(() => {
                         if (gameObjectsRef.current) {
                            gameObjectsRef.current = gameObjectsRef.current.filter(o => o.id !== obj.id);
                         }
                      }, 0);
                  }
              }

              // Check collisions with other objects
              const projBox = getCollisionBox(obj);
              const isFriendly = obj.name === 'Bullet' || obj.name === 'AttackBox';
              
              for (const other of gameObjectsRef.current) {
                  if (other.id !== obj.id && !other.isProjectile) {
                      const isPlayer = other.behaviors?.some(b => b.name === 'PlatformerCharacter' || b.name === 'TopDownRPGMovement');
                      const isEnemy = other.behaviors?.some(b => b.name === 'Boss') || other.name.toLowerCase().includes('enemy') || other.name.toLowerCase().includes('enemigo') || (!isPlayer && other.stats !== undefined);

                      // Friendly projectiles hit enemies. Hostile projectiles hit players!
                      const canHit = (isFriendly && isEnemy) || (!isFriendly && isPlayer && obj.name !== 'AttackBox' && obj.name !== 'Bullet');

                      if (canHit && isColliding(projBox, getCollisionBox(other))) {
                          if (other.stats) {
                              const dmg = obj.stats?.attack ?? 15;
                              other.stats.hp = Math.max(0, (other.stats.hp || 100) - dmg);
                          }
                          
                          // Apply horizontal and vertical knockback
                          const knockForceX = 220;
                          const knockForceY = -160;
                          // If projectile on left of target, push right. Else push left.
                          const pushDir = (obj.x + obj.width / 2) < (other.x + other.width / 2) ? 1 : -1;
                          
                          other.vx = pushDir * knockForceX;
                          other.vy = knockForceY;
                          if (other.behaviors?.some(b => b.name === 'TopDownRPGMovement')) {
                              other.rpgKnockbackVx = pushDir * knockForceX * 1.8;
                              other.rpgKnockbackVy = Math.sign(other.y - obj.y) * knockForceX;
                          }
                          
                          // Remove projectile (unless it is a persistent melee slash AttackBox)
                          if (obj.name !== 'AttackBox') {
                              setTimeout(() => {
                                 if (gameObjectsRef.current) {
                                    gameObjectsRef.current = gameObjectsRef.current.filter(o => o.id !== obj.id);
                                 }
                              }, 0);
                              break;
                          }
                      }
                  }
              }
              return; // Skip normal script and updates for transient projectiles
          }

           obj.scripts?.forEach(script => {
             const scriptId = script.id || script.trigger;
             if (script.trigger === 'OnUpdate' || script.trigger === 'Always') {
                 executeActionsSequential(script.actions, obj, true, deltaTime, false, undefined, `obj-${obj.id}-script-${scriptId}`);
             } else if (!['OnStart', 'OnClick', 'OnCollisionWith', 'OnTimerElapsed'].includes(script.trigger)) {
                 // Handle state-based triggers like IsRunning, IsJumping, CompareVariable, etc.
                 const mockCondition: Condition = {
                     trigger: script.trigger as any,
                     object: obj.name,
                     params: script.params,
                     target: script.params?.targetObjectName
                 };
                 if (checkCondition(mockCondition, obj)) {
                     executeActionsSequential(script.actions, obj, true, deltaTime, false, undefined, `obj-${obj.id}-script-${scriptId}`);
                 }
             }
           });

          if (obj.tweens) {
              const now = performance.now();
              obj.tweens = obj.tweens.filter(tween => {
                  const elapsed = now - tween.startTime;
                  const progress = Math.min(1, elapsed / tween.duration);
                  
                  // Simple linear easing
                  if (tween.type === 'position') {
                      obj.x = tween.startX + (tween.endX - tween.startX) * progress;
                      obj.y = tween.startY + (tween.endY - tween.startY) * progress;
                  } else if (tween.type === 'rotation') {
                      obj.rotation = tween.startRotation + (tween.endRotation - tween.startRotation) * progress;
                  } else if (tween.type === 'scale') {
                      obj.scaleX = tween.startScaleX + (tween.endScaleX - tween.startScaleX) * progress;
                      obj.scaleY = tween.startScaleY + (tween.endScaleY - tween.startScaleY) * progress;
                  }
                  
                  return progress < 1;
              });
          }

          if (obj.oscillation) {
              const time = (performance.now() - obj.oscillation.startTime) / 1000;
              const offset = Math.sin(time * obj.oscillation.speed) * obj.oscillation.distance;
              if (obj.oscillation.axis === 'x') {
                  obj.x = obj.oscillation.initialX + offset;
              } else {
                  obj.y = obj.oscillation.initialY + offset;
              }
          }

          // New Behaviors Implementation
          const patrolBehavior = obj.behaviors?.find(b => b.name === 'Patrol');
          if (patrolBehavior) {
              const { speed = 50, range = 100, sticky = true } = patrolBehavior.properties;
              if (obj.initialX === undefined) obj.initialX = obj.x;
              const time = performance.now() / 1000;
              // Use a triangle wave for linear patrol
              const t = (time * speed) / range;
              const cycle = t % 2;
              const offset = cycle < 1 ? cycle * range : (2 - cycle) * range;
              const lastX = obj.x;
              obj.x = obj.initialX + offset - range / 2;
              obj.direction = cycle < 1 ? 'right' : 'left';
              if (sticky && deltaTime > 0) {
                  obj.platformVx = (obj.x - lastX) / deltaTime;
                  obj.platformVy = 0;
              }
          }

          const oscillateBehavior = obj.behaviors?.find(b => b.name === 'Oscillate');
          if (oscillateBehavior) {
              const { axis = 'x', distance = 100, speed = 2, sticky = true } = oscillateBehavior.properties;
              if (obj.initialX === undefined) obj.initialX = obj.x;
              if (obj.initialY === undefined) obj.initialY = obj.y;
              const time = performance.now() / 1000;
              const offset = Math.sin(time * speed) * distance;
              const lastX = obj.x;
              const lastY = obj.y;
              if (axis === 'x') {
                  obj.x = obj.initialX + offset;
              } else {
                  obj.y = obj.initialY + offset;
              }
              if (sticky && deltaTime > 0) {
                  obj.platformVx = (obj.x - lastX) / deltaTime;
                  obj.platformVy = (obj.y - lastY) / deltaTime;
              }
          }

          const rotateBehavior = obj.behaviors?.find(b => b.name === 'Rotate');
          if (rotateBehavior) {
              const { rotationSpeed = 90 } = rotateBehavior.properties;
              obj.rotation = ((obj.rotation || 0) + rotationSpeed * deltaTime) % 360;
              if (obj.rotation < 0) obj.rotation += 360;
          }

          const pulseBehavior = obj.behaviors?.find(b => b.name === 'Pulse');
          if (pulseBehavior) {
              const { distance = 0.2, speed = 2 } = pulseBehavior.properties;
              if (obj.initialScaleX === undefined) obj.initialScaleX = obj.scaleX ?? 1;
              if (obj.initialScaleY === undefined) obj.initialScaleY = obj.scaleY ?? 1;
              const time = performance.now() / 1000;
              const offset = Math.sin(time * speed) * distance;
              obj.scaleX = obj.initialScaleX + offset;
              obj.scaleY = obj.initialScaleY + offset;
          }

          const scoreCounterBehavior = obj.behaviors?.find(b => b.name === 'ScoreCounter');
          if (scoreCounterBehavior) {
              const { variableName = 'score', format = 'Score: {value}' } = scoreCounterBehavior.properties;
              const value = gameVariables.current[variableName] ?? 0;
              obj.text = String(format).replace('{value}', String(value));
          }

          const tweenPathBehavior = obj.behaviors?.find(b => b.name === 'TweenPath');
          if (tweenPathBehavior) {
               const { speed = 100, loop = true, points: pointsStr = '0,0;100,100' } = tweenPathBehavior.properties;
               const points = String(pointsStr).split(';').map((p: string) => { const [x, y] = p.split(','); return { x: Number(x), y: Number(y) }; });
               
               if (obj.tweenPathIndex === undefined) obj.tweenPathIndex = 0;
               if (obj.tweenPathProgress === undefined) obj.tweenPathProgress = 0;

               const p1 = points[obj.tweenPathIndex];
               const p2 = points[(obj.tweenPathIndex + 1) % points.length];
               
               const dist = Math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2);
               if (dist === 0) {
                     obj.tweenPathIndex = (obj.tweenPathIndex + 1) % points.length;
               } else {
                     const step = (speed * deltaTime) / dist;
                     obj.tweenPathProgress += step;
                     if (obj.tweenPathProgress >= 1) {
                         obj.tweenPathProgress = 0;
                         obj.tweenPathIndex = obj.tweenPathIndex + 1;
                         if (!loop && obj.tweenPathIndex >= points.length - 1) {
                             obj.tweenPathIndex = points.length - 2;
                             obj.tweenPathProgress = 1;
                         } else {
                             obj.tweenPathIndex = obj.tweenPathIndex % points.length;
                         }
                     }
                     // Apply tweened position
                     // If obj.initialX/Y are not set, we might need to anchor this.
                     // Let's assume points are absolute for now.
                     obj.x = p1.x + (p2.x - p1.x) * obj.tweenPathProgress;
                     obj.y = p1.y + (p2.y - p1.y) * obj.tweenPathProgress;
               }
          }

          const attackBehavior = obj.behaviors?.find(b => b.name === 'Attack');
          if (attackBehavior) {
              // This behavior might be used to trigger the attack action
          }
          
          const bossBehavior = obj.behaviors?.find(b => b.name === 'Boss');
          if (bossBehavior) {
              const bProps = bossBehavior.properties || {};
              if (obj.bossSpeed === undefined) obj.bossSpeed = Number(bProps.speed !== undefined ? bProps.speed : 80);
              if (obj.bossJumpForce === undefined) obj.bossJumpForce = Number(bProps.jumpForce !== undefined ? bProps.jumpForce : 300);
              if (obj.bossAttackInterval === undefined) obj.bossAttackInterval = Number(bProps.attackInterval !== undefined ? bProps.attackInterval : 2);
              if (obj.bossAttackSpeed === undefined) obj.bossAttackSpeed = Number(bProps.attackSpeed !== undefined ? bProps.attackSpeed : 300);
              if (obj.bossFollowPlayer === undefined) obj.bossFollowPlayer = bProps.followPlayer !== undefined ? bProps.followPlayer : true;
              if (obj.bossProjectileColor === undefined) obj.bossProjectileColor = bProps.projectileColor || '#ef4444';

              const speed = obj.bossSpeed;
              const jumpForce = obj.bossJumpForce;
              const attackInterval = obj.bossAttackInterval;
              const attackSpeed = obj.bossAttackSpeed;
              const followPlayer = obj.bossFollowPlayer;
              const projectileColor = obj.bossProjectileColor;

              const playerObj = gameObjectsRef.current?.find(o => 
                  o.name.toLowerCase().includes('player') || 
                  o.name.toLowerCase().includes('jugador') ||
                  o.behaviors?.some(b => b.name === 'PlatformerCharacter' || b.name === 'TopDownRPGMovement')
              );

              if (followPlayer && playerObj) {
                  if (playerObj.x < obj.x) {
                      obj.direction = 'left';
                      obj.vx = -speed;
                  } else {
                      obj.direction = 'right';
                      obj.vx = speed;
                  }

                  const playerIsHigher = playerObj.y < obj.y - 40;
                  const isBlocked = Math.abs(obj.vx) > 0 && Math.abs((obj.lastX || 0) - obj.x) < 0.2;
                  if (obj.grounded && (isBlocked || (playerIsHigher && Math.random() < 0.015))) {
                      obj.vy = -jumpForce;
                      obj.grounded = false;
                  }
                  obj.lastX = obj.x;
              }

              if (!obj._lastAttackTime) obj._lastAttackTime = Date.now();
              const now = Date.now();
              if (now - obj._lastAttackTime > attackInterval * 1000) {
                  obj._lastAttackTime = now;
                  if (playerObj) {
                      const projId = Date.now() + Math.floor(Math.random() * 1000);
                      const angle = Math.atan2(playerObj.y - obj.y, playerObj.x - obj.x);
                      const projVx = Math.cos(angle) * attackSpeed;
                      const projVy = Math.sin(angle) * attackSpeed;

                      const bossProjectile = {
                          id: projId,
                          name: `${obj.name}_Proyectil`,
                          x: obj.direction === 'left' ? obj.x - 15 : obj.x + obj.width + 15,
                          y: obj.y + obj.height / 2 - 5,
                          width: 14,
                          height: 14,
                          color: projectileColor,
                          zIndex: 20,
                          vx: projVx,
                          vy: projVy,
                          isUI: false,
                          behaviors: [
                              { name: 'Physics', properties: { gravity: 0 } }
                          ],
                          variables: [],
                          stats: { hp: 1, maxHp: 1, attack: 10 },
                          isProjectile: true,
                          projectileLifetime: 3.0
                      };

                      gameObjectsRef.current.push(bossProjectile);
                  }
              }
          }

          if (obj.rotationSpeed) {
              obj.rotation = ((obj.rotation || 0) + obj.rotationSpeed * deltaTime) % 360;
              if (obj.rotation < 0) obj.rotation += 360;
          }

          if (obj.scaleOscillation) {
              const time = (performance.now() - obj.scaleOscillation.startTime) / 1000;
              const offset = Math.sin(time * obj.scaleOscillation.speed) * obj.scaleOscillation.distance;
              obj.scaleX = Math.max(0.01, obj.scaleOscillation.initialScaleX + offset);
              obj.scaleY = Math.max(0.01, obj.scaleOscillation.initialScaleY + offset);
          } else {
              if (obj.scaleSpeedX) {
                  obj.scaleX = Math.max(0.01, (obj.scaleX ?? 1) + obj.scaleSpeedX * deltaTime);
              }
              if (obj.scaleSpeedY) {
                  obj.scaleY = Math.max(0.01, (obj.scaleY ?? 1) + obj.scaleSpeedY * deltaTime);
              }
          }

          if (obj.pendingMovements) {
              obj.pendingMovements.forEach(move => {
                  const speed = Number(move.speed || 0);
                  const direction = (move.direction || '').toLowerCase();
                  switch (direction) {
                      case 'right': obj.x += speed * deltaTime; break;
                      case 'left': obj.x -= speed * deltaTime; break;
                      case 'up': obj.y -= speed * deltaTime; break;
                      case 'down': obj.y += speed * deltaTime; break;
                  }
              });
              obj.pendingMovements = [];
          }

          if(obj.isUI) {
              obj.x += (obj.vx || 0) * deltaTime;
              obj.y += (obj.vy || 0) * deltaTime;
              return;
          }

          const isCurrentControlled = currentControlledId === undefined || obj.id === currentControlledId;

          const hasRPGMovement = obj.behaviors?.some(b => b.name === 'TopDownRPGMovement');
          const platformer = obj.behaviors?.find(b => b.name === 'PlatformerCharacter');
          if (platformer && !hasRPGMovement) {
              let { speed, jumpForce } = platformer.properties;
              if (actions.run) {
                  speed *= 2;
              }

              // Check ladder and climber behavior
              const climber = obj.behaviors?.find(b => b.name === 'LadderClimber');
              const ladders = gameObjectsRef.current.filter(o => o.behaviors?.some(b => b.name === 'Ladder'));
              const isOverlappingLadder = ladders.some(ladder => {
                  const box1 = getCollisionBox({...obj, ...getObjectAbsolutePosition(obj.id, objectsById)});
                  const box2 = getCollisionBox({...ladder, ...getObjectAbsolutePosition(ladder.id, objectsById)});
                  return box1.x < box2.x + box2.width &&
                         box1.x + box1.width > box2.x &&
                         box1.y < box2.y + box2.height &&
                         box1.y + box1.height > box2.y;
              });

              if (!isOverlappingLadder) {
                  obj.isClimbing = false;
              } else if (climber && isCurrentControlled) {
                  const climbUpInput = actions.moveUp || (actions.moveVerticalIntensity && actions.moveVerticalIntensity < -0.3);
                  const climbDownInput = actions.moveDown || (actions.moveVerticalIntensity && actions.moveVerticalIntensity > 0.3);
                  if (climbUpInput || climbDownInput) {
                      obj.isClimbing = true;
                  }
              }

              if (isCurrentControlled) {
                  if (obj.isClimbing && climber) {
                      const climbSpeed = climber.properties?.speed ?? 100;
                      obj.vx = (actions.moveHorizontalIntensity || 0) * speed;
                      if ((obj.vx || 0) > 0) obj.direction = 'right';
                      if ((obj.vx || 0) < 0) obj.direction = 'left';

                      const climbUpInput = actions.moveUp || (actions.moveVerticalIntensity && actions.moveVerticalIntensity < -0.3);
                      const climbDownInput = actions.moveDown || (actions.moveVerticalIntensity && actions.moveVerticalIntensity > 0.3);
                      if (climbUpInput) {
                          obj.vy = -climbSpeed;
                      } else if (climbDownInput) {
                          obj.vy = climbSpeed;
                      } else {
                          obj.vy = 0; // Hanger
                      }

                      if (actions.jumpAction) {
                          obj.isClimbing = false;
                          obj.vy = -jumpForce;
                      }
                  } else {
                      obj.vx = (actions.moveHorizontalIntensity || 0) * speed;
                      if ((obj.vx || 0) > 0) obj.direction = 'right';
                      if ((obj.vx || 0) < 0) obj.direction = 'left';

                      if (actions.jumpAction && obj.grounded) {
                          obj.vy = -jumpForce;
                      }
                  }
                  
                  if (actions.attackAction) {
                      frameAttacks.current.push({ name: obj.name, id: obj.id });
                  }
              } else {
                  obj.vx = 0;
                  if (obj.isClimbing) {
                      obj.vy = 0;
                  }
              }
          }

          const rpgMovement = obj.behaviors?.find(b => b.name === 'TopDownRPGMovement');
          if (rpgMovement) {
              let { speed } = rpgMovement.properties;
              if (actions.run) {
                  speed *= 2;
              }
              
              if (isCurrentControlled) {
                  if (joystickState.current.active) {
                      const joystickSize = joystick?.size ?? 120;
                      const maxDistance = joystickSize / 2;
                      const intensity = joystickState.current.distance / maxDistance;
                      const angleRad = joystickState.current.angle * Math.PI / 180;
                      obj.vx = speed * intensity * Math.cos(angleRad);
                      obj.vy = speed * intensity * Math.sin(angleRad);
                      if (Math.abs(joystickState.current.angle) > 90) {
                          obj.direction = 'left';
                      } else {
                          obj.direction = 'right';
                      }
                  } else {
                      obj.vx = 0;
                      obj.vy = 0;
                      if (actions.moveLeft) { obj.vx = -speed; obj.direction = 'left'; }
                      if (actions.moveRight) { obj.vx = speed; obj.direction = 'right'; }
                      if (actions.moveUp) obj.vy = -speed;
                      if (actions.moveDown) obj.vy = speed;
                      
                      if (obj.vx !== 0 && obj.vy !== 0) {
                          obj.vx /= Math.sqrt(2);
                          obj.vy /= Math.sqrt(2);
                      }
                  }
              } else {
                  obj.vx = 0;
                  obj.vy = 0;
              }

              // Apply decay impulse knockback!
              if (obj.rpgKnockbackVx || obj.rpgKnockbackVy) {
                  obj.vx = (obj.vx || 0) + (obj.rpgKnockbackVx || 0);
                  obj.vy = (obj.vy || 0) + (obj.rpgKnockbackVy || 0);
                  obj.rpgKnockbackVx = (obj.rpgKnockbackVx || 0) * 0.82;
                  obj.rpgKnockbackVy = (obj.rpgKnockbackVy || 0) * 0.82;
                  if (Math.abs(obj.rpgKnockbackVx) < 5) obj.rpgKnockbackVx = 0;
                  if (Math.abs(obj.rpgKnockbackVy) < 5) obj.rpgKnockbackVy = 0;
              }

              // Unified automatic animations for Platformer and RPG characters
              const platBehav = obj.behaviors?.find(b => b.name === 'PlatformerCharacter');
              const isPlayerControlled = platBehav || rpgMovement;

              if (isPlayerControlled) {
                  const activeBehav = rpgMovement || platBehav;
                  const idleAnimId = activeBehav?.properties?.idleAnimId;
                  const runAnimId = activeBehav?.properties?.runAnimId;
                  const jumpAnimId = activeBehav?.properties?.jumpAnimId;
                  const attackAnimId = activeBehav?.properties?.attackAnimId;

                  const isAttackingNow = (isCurrentControlled && actions.attackAction) || frameAttacks.current.some(a => a.id === obj.id);
                  const nowTime = performance.now();

                  // 1. Resolve Attack Animation
                  if (isAttackingNow) {
                      const matchingAttackAnim = (attackAnimId && animations.find(a => a.id === attackAnimId)) || 
                          animations.find(a => {
                              const nameL = a.name.toLowerCase();
                              const objL = obj.name.toLowerCase();
                              return nameL.includes(objL) && (nameL.includes('attack') || nameL.includes('atacar') || nameL.includes('golpe'));
                          }) || animations.find(a => {
                              const nameL = a.name.toLowerCase();
                              return nameL.includes('attack') || nameL.includes('atacar') || nameL.includes('golpe');
                          });

                      let attackDuration = 350;
                      if (matchingAttackAnim) {
                          attackDuration = matchingAttackAnim.frames.reduce((sum, f) => sum + f.duration, 0);
                          if (attackDuration <= 0) attackDuration = 350;
                      }

                      obj.rpgAttackEndTime = nowTime + attackDuration;

                      if (matchingAttackAnim) {
                          const currentAnim = activeAnimations.current.get(obj.id);
                          if (!currentAnim || currentAnim.animation.id !== matchingAttackAnim.id) {
                              const animCopy = JSON.parse(JSON.stringify(matchingAttackAnim));
                              animCopy.loop = false;
                              activeAnimations.current.set(obj.id, {
                                  animation: animCopy,
                                  startTime: nowTime,
                              });
                          }
                      }
                  }

                  const isCurrentlyAttacking = nowTime < (obj.rpgAttackEndTime || 0);

                  if (!isCurrentlyAttacking) {
                      // 2. Resolve Jump Animation (Platformer only, when not grounded and not climbing)
                      const isJumpingState = platBehav && !obj.grounded && !obj.isClimbing;
                      
                      if (isJumpingState) {
                          const matchingJumpAnim = (jumpAnimId && animations.find(a => a.id === jumpAnimId)) ||
                              animations.find(a => {
                                  const nameL = a.name.toLowerCase();
                                  const objL = obj.name.toLowerCase();
                                  return nameL.includes(objL) && (nameL.includes('jump') || nameL.includes('salto') || nameL.includes('saltar') || nameL.includes('caer'));
                              }) || animations.find(a => {
                                  const nameL = a.name.toLowerCase();
                                  return nameL.includes('jump') || nameL.includes('salto') || nameL.includes('saltar') || nameL.includes('caer');
                              });

                          if (matchingJumpAnim) {
                              const currentAnim = activeAnimations.current.get(obj.id);
                              if (!currentAnim || currentAnim.animation.id !== matchingJumpAnim.id) {
                                  const animCopy = JSON.parse(JSON.stringify(matchingJumpAnim));
                                  animCopy.loop = true;
                                  activeAnimations.current.set(obj.id, {
                                      animation: animCopy,
                                      startTime: nowTime,
                                  });
                              }
                          }
                      }
                      // 3. Resolve Running / Walking Animation
                      else if ((obj.vx || 0) !== 0 || (platBehav ? false : (obj.vy || 0) !== 0)) {
                          const matchingWalkAnim = (runAnimId && animations.find(a => a.id === runAnimId)) ||
                              animations.find(a => {
                                  const nameL = a.name.toLowerCase();
                                  const objL = obj.name.toLowerCase();
                                  return nameL.includes(objL) && (nameL.includes('walk') || nameL.includes('run') || nameL.includes('move') || nameL.includes('caminar') || nameL.includes('correr') || nameL.includes('moverse'));
                              }) || animations.find(a => {
                                  const nameL = a.name.toLowerCase();
                                  return nameL.includes('walk') || nameL.includes('run') || nameL.includes('move') || nameL.includes('caminar') || nameL.includes('correr') || nameL.includes('moverse');
                              });

                          if (matchingWalkAnim) {
                              const currentAnim = activeAnimations.current.get(obj.id);
                              if (!currentAnim || currentAnim.animation.id !== matchingWalkAnim.id) {
                                  const animCopy = JSON.parse(JSON.stringify(matchingWalkAnim));
                                  animCopy.loop = true;
                                  activeAnimations.current.set(obj.id, {
                                      animation: animCopy,
                                      startTime: nowTime,
                                  });
                              }
                          }
                      }
                      // 4. Resolve Idle Animation
                      else {
                          const matchingIdleAnim = (idleAnimId && animations.find(a => a.id === idleAnimId)) ||
                              animations.find(a => {
                                  const nameL = a.name.toLowerCase();
                                  const objL = obj.name.toLowerCase();
                                  return nameL.includes(objL) && (nameL.includes('idle') || nameL.includes('quieto') || nameL.includes('parado') || nameL.includes('stand'));
                              }) || animations.find(a => {
                                  const nameL = a.name.toLowerCase();
                                  return nameL.includes('idle') || nameL.includes('quieto') || nameL.includes('parado') || nameL.includes('stand');
                              });

                          if (matchingIdleAnim) {
                              const currentAnim = activeAnimations.current.get(obj.id);
                              if (!currentAnim || currentAnim.animation.id !== matchingIdleAnim.id) {
                                  const animCopy = JSON.parse(JSON.stringify(matchingIdleAnim));
                                  animCopy.loop = true;
                                  activeAnimations.current.set(obj.id, {
                                      animation: animCopy,
                                      startTime: nowTime,
                                  });
                              }
                          } else {
                              const currentAnim = activeAnimations.current.get(obj.id);
                              if (currentAnim && currentAnim.animation.loop) {
                                  activeAnimations.current.delete(obj.id);
                                  const originalObject = scene.gameObjects.find(o => o.id === obj.id);
                                  if (originalObject) {
                                      obj.imageUrl = originalObject.imageUrl;
                                      obj.animOffsetX = 0;
                                      obj.animOffsetY = 0;
                                      obj.animRotation = 0;
                                      obj.animScaleX = 1;
                                      obj.animScaleY = 1;
                                  }
                              }
                          }
                      }
                  }
              }
          }
          
          const physics = obj.behaviors?.find(b => ['Physics', 'PlatformerCharacter', 'Boss'].includes(b.name || ''));
          
          if (rpgMovement) {
            obj.x += (obj.vx || 0) * deltaTime;
            let currentAbsPos = getObjectAbsolutePosition(obj.id, objectsById);
            let objWithAbsPosH = {...obj, ...currentAbsPos};
            for (const solidShape of staticCollisionShapes) {
                if (obj.id !== solidShape.owner.id && isColliding(getCollisionBox(objWithAbsPosH), solidShape)) {
                     frameCollisions.current.push({ obj1Name: obj.name, obj2Name: solidShape.owner.name, type: 'OnHorizontalCollision', obj1Id: obj.id, obj2Id: solidShape.owner.id });
                     const horizontalBox = getCollisionBox(objWithAbsPosH);
                     const objCenterX = horizontalBox.x + horizontalBox.width / 2;
                     const solidCenterX = solidShape.x + solidShape.width / 2;
                     
                     if (objCenterX < solidCenterX) {
                         obj.x = solidShape.x - horizontalBox.width - (currentAbsPos.x - obj.x);
                     } else {
                         obj.x = solidShape.x + solidShape.width - (currentAbsPos.x - obj.x);
                     }
                     obj.vx = 0;
                     
                     currentAbsPos = getObjectAbsolutePosition(obj.id, objectsById);
                     objWithAbsPosH = {...obj, ...currentAbsPos};
                }
            }
            
            obj.y += (obj.vy || 0) * deltaTime;
            currentAbsPos = getObjectAbsolutePosition(obj.id, objectsById);
            let objWithAbsPosV = {...obj, ...currentAbsPos};
            for (const solidShape of staticCollisionShapes) {
                if (obj.id !== solidShape.owner.id && isColliding(getCollisionBox(objWithAbsPosV), solidShape)) {
                     frameCollisions.current.push({ obj1Name: obj.name, obj2Name: solidShape.owner.name, type: 'OnVerticalCollision', obj1Id: obj.id, obj2Id: solidShape.owner.id });
                     const verticalBox = getCollisionBox(objWithAbsPosV);
                     const objCenterY = verticalBox.y + verticalBox.height / 2;
                     const solidCenterY = solidShape.y + solidShape.height / 2;
                     
                     if (objCenterY < solidCenterY) {
                         obj.y = solidShape.y - verticalBox.height - (currentAbsPos.y - obj.y);
                     } else {
                         obj.y = solidShape.y + solidShape.height - (currentAbsPos.y - obj.y);
                     }
                     obj.vy = 0;
                     
                     currentAbsPos = getObjectAbsolutePosition(obj.id, objectsById);
                     objWithAbsPosV = {...obj, ...currentAbsPos};
                }
            }
          } else if (physics) {
              // 1. UPDATE AND RESOLVE HORIZONTAL MOVEMENT FIRST
              obj.x += (obj.vx || 0) * deltaTime;
              
              let currentAbsPos = getObjectAbsolutePosition(obj.id, objectsById);
              let objWithAbsPos = {...obj, ...currentAbsPos};

              // Horizontal collision resolution (with a slightly shrunk box vertically to prevent floor friction)
              for (const solidShape of staticCollisionShapes) {
                  if (obj.id !== solidShape.owner.id) {
                      const horizontalBox = getCollisionBox(objWithAbsPos);
                      const shrinkAmountY = 3; // Pixels to shrink from top and bottom to avoid floor catching
                      const adjustedBoxH = {
                          ...horizontalBox,
                          y: horizontalBox.y + shrinkAmountY,
                          height: Math.max(1, horizontalBox.height - 2 * shrinkAmountY)
                      };

                      if (isColliding(adjustedBoxH, solidShape)) {
                          // Try stepping up (slope/ramp check)
                          const maxStepUp = 12; // pixels we can step up
                          let steppedUp = false;
                          
                          for (let step = 1; step <= maxStepUp; step++) {
                              const testBox = { ...adjustedBoxH, y: adjustedBoxH.y - step };
                              if (!isColliding(testBox, solidShape)) {
                                  const clearedAll = staticCollisionShapes.every(otherShape => {
                                      if (obj.id === otherShape.owner.id) return true;
                                      const otherTestBox = { 
                                          ...getCollisionBox({...objWithAbsPos, y: objWithAbsPos.y - step}), 
                                          y: getCollisionBox({...objWithAbsPos, y: objWithAbsPos.y - step}).y + shrinkAmountY, 
                                          height: Math.max(1, getCollisionBox({...objWithAbsPos, y: objWithAbsPos.y - step}).height - 2 * shrinkAmountY) 
                                      };
                                      return !isColliding(otherTestBox, otherShape);
                                  });
                                  if (clearedAll) {
                                      obj.y -= step;
                                      steppedUp = true;
                                      currentAbsPos = getObjectAbsolutePosition(obj.id, objectsById);
                                      objWithAbsPos = {...obj, ...currentAbsPos};
                                      break;
                                  }
                              }
                          }
                          
                          if (!steppedUp) {
                              frameCollisions.current.push({ obj1Name: obj.name, obj2Name: solidShape.owner.name, type: 'OnHorizontalCollision', obj1Id: obj.id, obj2Id: solidShape.owner.id });
                              // Push out based on character centers for maximum stability
                              const objCenterX = horizontalBox.x + horizontalBox.width / 2;
                              const solidCenterX = solidShape.x + solidShape.width / 2;
                              if (objCenterX < solidCenterX) {
                                  obj.x = solidShape.x - horizontalBox.width - (currentAbsPos.x - obj.x);
                              } else {
                                  obj.x = solidShape.x + solidShape.width - (currentAbsPos.x - obj.x);
                              }
                              obj.vx = 0;
                              
                              // Update current positions
                              currentAbsPos = getObjectAbsolutePosition(obj.id, objectsById);
                              objWithAbsPos = {...obj, ...currentAbsPos};
                          }
                      }
                  }
              }

              // 2. UPDATE AND RESOLVE VERTICAL MOVEMENT SECOND
              obj.grounded = false;
              const gravity = (obj.isClimbing || obj.parentId) ? 0 : Number(physics.properties?.gravity !== undefined ? physics.properties.gravity : 500);
              if (!obj.isClimbing && !obj.parentId) {
                  obj.vy = (obj.vy || 0) + gravity * deltaTime;
              }
              obj.y += (obj.vy || 0) * deltaTime;
              
              currentAbsPos = getObjectAbsolutePosition(obj.id, objectsById);
              objWithAbsPos = {...obj, ...currentAbsPos};

              // Vertical collision resolution (with a slightly shrunk box horizontally to prevent hugging walls from grounding player)
              for (const solidShape of staticCollisionShapes) {
                  if (obj.id !== solidShape.owner.id) {
                      const verticalBox = getCollisionBox(objWithAbsPos);
                      
                      // Check for rotated ramp slope first!
                      if (solidShape.owner.rotation) {
                          const surfaceY = getRotatedSurfaceY(verticalBox.x, verticalBox.width, solidShape.owner);
                          if (surfaceY !== null) {
                              const playerBottom = verticalBox.y + verticalBox.height;
                              if (obj.vy! >= 0 && playerBottom >= surfaceY - 12 && playerBottom <= surfaceY + 16) {
                                  frameCollisions.current.push({ obj1Name: obj.name, obj2Name: solidShape.owner.name, type: 'OnVerticalCollision', obj1Id: obj.id, obj2Id: solidShape.owner.id });
                                  obj.y = surfaceY - verticalBox.height - (currentAbsPos.y - obj.y);
                                  obj.grounded = true;
                                  obj.vy = 0;
                                  
                                  const platformObj = objectsById.get(solidShape.owner.id);
                                  if (platformObj && platformObj.platformVx) {
                                      obj.x += platformObj.platformVx * deltaTime;
                                  }
                                  
                                  currentAbsPos = getObjectAbsolutePosition(obj.id, objectsById);
                                  objWithAbsPos = {...obj, ...currentAbsPos};
                                  continue;
                              }
                          }
                      }

                      const shrinkAmountX = 3; // Pixels to shrink from left and right to avoid wall catching
                      const adjustedBoxV = {
                          ...verticalBox,
                          x: verticalBox.x + shrinkAmountX,
                          width: Math.max(1, verticalBox.width - 2 * shrinkAmountX)
                      };

                      if (isColliding(adjustedBoxV, solidShape)) {
                          frameCollisions.current.push({ obj1Name: obj.name, obj2Name: solidShape.owner.name, type: 'OnVerticalCollision', obj1Id: obj.id, obj2Id: solidShape.owner.id });
                          if (obj.vy! > 0) {
                              obj.y = solidShape.y - verticalBox.height - (currentAbsPos.y - obj.y);
                              obj.grounded = true;
                              obj.vy = 0;
                              
                              const platformObj = objectsById.get(solidShape.owner.id);
                              if (platformObj && platformObj.platformVx) {
                                  obj.x += platformObj.platformVx * deltaTime;
                              }
                          } else if (obj.vy! < 0) {
                              obj.y = solidShape.y + solidShape.height - (currentAbsPos.y - obj.y);
                              obj.vy = 0;
                          }
                          // Update current positions
                          currentAbsPos = getObjectAbsolutePosition(obj.id, objectsById);
                          objWithAbsPos = {...obj, ...currentAbsPos};
                      }
                  }
              }
          } else {
              // No specific movement behavior, just apply velocity
              obj.x += (obj.vx || 0) * deltaTime;
              obj.y += (obj.vy || 0) * deltaTime;
          }
      });

      const allObjectsWithAbsPosForCollision = gameObjectsRef.current.map(o => ({...o, ...getObjectAbsolutePosition(o.id, objectsById)}));
      const nonUiObjects = allObjectsWithAbsPosForCollision.filter(o => !o.isUI && (o.isTouchable ?? true));

      for (let i = 0; i < nonUiObjects.length; i++) {
          for (let j = i + 1; j < nonUiObjects.length; j++) {
              const obj1 = nonUiObjects[i];
              const obj2 = nonUiObjects[j];

              const isHit = (previewMode === '3d') 
                  ? checkCollision3D(obj1, obj2) 
                  : isColliding(getCollisionBox(obj1), getCollisionBox(obj2));

              if (isHit) {
                  frameCollisions.current.push({ obj1Name: obj1.name, obj2Name: obj2.name, type: 'OnCollisionWith', obj1Id: obj1.id, obj2Id: obj2.id });
                  
                  const originalObj1 = gameObjectsRef.current.find(o => o.id === obj1.id);
                  const originalObj2 = gameObjectsRef.current.find(o => o.id === obj2.id);

                   if (originalObj1) {
                       const targetsDict: Record<string, GameObject[]> = originalObj2 ? { [originalObj2.name]: [originalObj2] } : {};
                       originalObj1.scripts?.forEach(script => {
                           if (script.trigger === 'OnCollisionWith' && (!script.params?.targetObjectName || script.params.targetObjectName === originalObj2?.name)) {
                               const scriptId = script.id || script.trigger;
                               executeActionsSequential(script.actions, originalObj1, false, deltaTime, false, targetsDict, `obj-${originalObj1.id}-script-${scriptId}`);
                           }
                       });
                   }

                   if (originalObj2) {
                       const targetsDict: Record<string, GameObject[]> = originalObj1 ? { [originalObj1.name]: [originalObj1] } : {};
                       originalObj2.scripts?.forEach(script => {
                           if (script.trigger === 'OnCollisionWith' && (!script.params?.targetObjectName || script.params.targetObjectName === originalObj1?.name)) {
                               const scriptId = script.id || script.trigger;
                               executeActionsSequential(script.actions, originalObj2, false, deltaTime, false, targetsDict, `obj-${originalObj2.id}-script-${scriptId}`);
                           }
                       });
                   }
              }
          }
      }

      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of gamepads) {
          if (!gp) continue;
          
          const getButtonName = (idx: number) => {
              const mapping: Record<number, string> = {
                  0: 'A', 1: 'B', 2: 'X', 3: 'Y', 
                  4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2',
                  8: 'Select', 9: 'Start', 10: 'L3', 11: 'R3',
                  12: 'DpadUp', 13: 'DpadDown', 14: 'DpadLeft', 15: 'DpadRight',
                  16: 'Home', 17: 'Capture'
              };
              return mapping[idx] || `button_${idx}`;
          };

          gp.buttons.forEach((btn, idx) => {
              if (btn.pressed) {
                  const name = getButtonName(idx);
                  frameButtonDown.current.push(name);
                  
                  // Nintendo Switch Aliases and Standard Mappings
                  if (idx === 6) { frameButtonDown.current.push('ZL'); frameTriggerDown.current.push('L2'); }
                  if (idx === 7) { frameButtonDown.current.push('ZR'); frameTriggerDown.current.push('R2'); }
                  if (idx === 8) frameButtonDown.current.push('Minus');
                  if (idx === 9) frameButtonDown.current.push('Plus');
                  if (idx === 4) frameButtonDown.current.push('L');
                  if (idx === 5) frameButtonDown.current.push('R');
                  
                  frameButtonDown.current.push(`button_${idx}`);
              }
          });
          if (gp.axes.length >= 2) {
              const x = gp.axes[0], y = gp.axes[1];
              if (Math.abs(x) > 0.3 || Math.abs(y) > 0.3) {
                  frameJoystickEvents.current.push('move');
                  if (x > 0.3) frameJoystickEvents.current.push('right');
                  if (x < -0.3) frameJoystickEvents.current.push('left');
                  if (y > 0.3) frameJoystickEvents.current.push('down');
                  if (y < -0.3) frameJoystickEvents.current.push('up');
              }
          }
      }

      // Check for interactables near player
      const playerObjForInteract = gameObjectsRef.current.find(o => o.behaviors?.some(b => b.name === 'PlatformerCharacter' || b.name === 'TopDownRPGMovement'));
      let currentActiveInteractable: { id: number; name: string; prompt: string } | null = null;
      
      if (playerObjForInteract) {
          const interactables = gameObjectsRef.current.filter(o => o.behaviors?.some(b => b.name === 'Interactable'));
          let minDistance = Infinity;
          for (const item of interactables) {
              const dx = item.x - playerObjForInteract.x;
              const dy = item.y - playerObjForInteract.y;
              const dist = Math.hypot(dx, dy);
              const interactBehav = item.behaviors?.find(b => b.name === 'Interactable');
              const radius = Number(interactBehav?.properties?.radius || 60);
              
              if (dist <= radius && dist < minDistance) {
                  minDistance = dist;
                  currentActiveInteractable = {
                      id: item.id,
                      name: item.name,
                      prompt: String(interactBehav?.properties?.prompt || 'Interactuar [E]')
                  };
              }
          }
      }
      
      if (activeInteractableRef.current?.id !== currentActiveInteractable?.id) {
          activeInteractableRef.current = currentActiveInteractable;
          setActiveInteractable(currentActiveInteractable);
      }

      evaluateEvents(deltaTime);
      frameKeyPresses.current = [];
      frameCollisions.current = [];
      frameClicks.current = [];
      frameInteractions.current = [];
      frameTimerEvents.current = [];
      frameAttacks.current = [];
      frameDialogueEnd.current = false;
      frameButtonDown.current = [];
      frameButtonUp.current = [];
      frameTriggerDown.current = [];
      frameTriggerUp.current = [];
      frameConsoleCommands.current = [];
      framePlayerJoined.current = false;
      framePlayerLeft.current = false;
      frameMatchFound.current = false;
      frameReceiveNetworkMessage.current = false;

      activeAnimations.current.forEach((activeAnim, objId) => {
        const obj = gameObjectsRef.current.find(o => o.id === objId);
        if (!obj) {
            activeAnimations.current.delete(objId);
            return;
        }

        const totalDuration = activeAnim.animation.frames.reduce((sum, f) => sum + f.duration, 0);
        if (totalDuration <= 0) {
            activeAnimations.current.delete(objId);
            return;
        }

        const elapsed = now - activeAnim.startTime;

        if (elapsed >= totalDuration) {
            if (activeAnim.animation.loop) {
                activeAnim.startTime = now;
            } else {
                activeAnimations.current.delete(objId);
                const originalObject = scene.gameObjects.find(o => o.id === objId);
                if (originalObject) {
                    obj.imageUrl = originalObject.imageUrl;
                    obj.animOffsetX = 0;
                    obj.animOffsetY = 0;
                    obj.animRotation = 0;
                    obj.animScaleX = 1;
                    obj.animScaleY = 1;
                }
                return;
            }
        }

        const currentElapsed = (now - activeAnim.startTime) % totalDuration;
        let cumulativeTime = 0;
        let currentFrameIndex = 0;
        for (let i = 0; i < activeAnim.animation.frames.length; i++) {
            cumulativeTime += activeAnim.animation.frames[i].duration;
            if (currentElapsed < cumulativeTime) {
                currentFrameIndex = i;
                break;
            }
        }
        
        const currentFrame = activeAnim.animation.frames[currentFrameIndex];
        const nextFrameIndex = (currentFrameIndex + 1) % activeAnim.animation.frames.length;
        const nextFrame = activeAnim.animation.frames[nextFrameIndex];

        const frameStartTime = cumulativeTime - currentFrame.duration;
        const frameElapsed = currentElapsed - frameStartTime;
        const t = frameElapsed / currentFrame.duration;

        if (currentFrame) {
            const asset = assets.find(a => a.id === currentFrame.assetId);
            if (asset) obj.imageUrl = asset.url;
            
            const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
            const shouldInterpolate = activeAnim.animation.loop || currentFrameIndex < activeAnim.animation.frames.length - 1;
            
            obj.animOffsetX = shouldInterpolate ? lerp(currentFrame.x ?? 0, nextFrame.x ?? currentFrame.x ?? 0, t) : (currentFrame.x ?? 0);
            obj.animOffsetY = shouldInterpolate ? lerp(currentFrame.y ?? 0, nextFrame.y ?? currentFrame.y ?? 0, t) : (currentFrame.y ?? 0);
            obj.animRotation = shouldInterpolate ? lerp(currentFrame.rotation ?? 0, nextFrame.rotation ?? currentFrame.rotation ?? 0, t) : (currentFrame.rotation ?? 0);
            obj.animScaleX = shouldInterpolate ? lerp(currentFrame.scaleX ?? 1, nextFrame.scaleX ?? currentFrame.scaleX ?? 1, t) : (currentFrame.scaleX ?? 1);
            obj.animScaleY = shouldInterpolate ? lerp(currentFrame.scaleY ?? 1, nextFrame.scaleY ?? currentFrame.scaleY ?? 1, t) : (currentFrame.scaleY ?? 1);
        }
      });

      // Apply dynamic sword swing rotation effect
      gameObjectsRef.current.forEach(obj => {
          if (obj.attackEndTime !== undefined && Date.now() < obj.attackEndTime) {
              const remaining = obj.attackEndTime - Date.now();
              const progress = Math.max(0, Math.min(1, remaining / 150));
              const swingAngle = 45 * progress;
              obj.animRotation = (obj.direction === 'left' ? -swingAngle : swingAngle);
          }
      });
      
      const currentUiObjects = gameObjectsRef.current.filter(o => o.isUI);
      if (currentUiObjects.length > 0) {
          setUiObjects([...currentUiObjects]);
      } else if (uiObjects.length > 0) {
          setUiObjects([]);
      }
      
      let followTarget = gameObjectsRef.current.find(o => o.behaviors?.some(b => b.name === 'FollowCamera'));
      if (followTarget) {
          const followTargetWithAbsPos = {...followTarget, ...getObjectAbsolutePosition(followTarget.id, objectsById)};
          const collisionBox = getCollisionBox(followTargetWithAbsPos);
          
          const idealCamX = collisionBox.x + collisionBox.width / 2;
          const idealCamY = collisionBox.y + collisionBox.height / 2;
       
          if (scene.cameraBounds?.enabled) {
              const bounds = scene.cameraBounds;
              const zoomedWidth = canvas.width / camera.current.zoom;
              const zoomedHeight = canvas.height / camera.current.zoom;
              
              if (bounds.width < zoomedWidth) {
                  camera.current.x = bounds.x + bounds.width / 2;
              } else {
                  const minCamX = bounds.x + zoomedWidth / 2;
                  const maxCamX = bounds.x + bounds.width - zoomedWidth / 2;
                  camera.current.x = Math.max(minCamX, Math.min(idealCamX, maxCamX));
              }

              if (bounds.height < zoomedHeight) {
                  camera.current.y = bounds.y + bounds.height / 2;
              } else {
                  const minCamY = bounds.y + zoomedHeight / 2;
                  const maxCamY = bounds.y + bounds.height - zoomedHeight / 2;
                  camera.current.y = Math.max(minCamY, Math.min(idealCamY, maxCamY));
              }
          } else {
              camera.current.x = idealCamX;
              camera.current.y = idealCamY;
          }
      } else {
          camera.current.x = (initialGameWidth || 1024) / 2;
          camera.current.y = (initialGameHeight || 768) / 2;
      }


      ctx.fillStyle = runtimeBackgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(camera.current.zoom, camera.current.zoom);
      ctx.translate(-camera.current.x, -camera.current.y);
      
      const allDrawableObjects = gameObjectsRef.current.map(o => ({...o, ...getObjectAbsolutePosition(o.id, objectsById)}));

      const renderedVideoUrls = new Set<string>();

      allDrawableObjects.filter(o => !o.isUI).sort((a,b) => (a.zIndex || 0) - (b.zIndex || 0)).forEach(obj => {
        if (obj.visible === false) return;
        const tilemapBehavior = obj.behaviors?.find(b => b.name === 'Tilemap');

        if (tilemapBehavior && obj.imageUrl) {
            const img = imageCache.current.get(obj.imageUrl);
            if (img && img.complete) {
                const { tileSize = 32, collisionData = '' } = tilemapBehavior.properties;
                const rows = String(collisionData).split('\n');
                rows.forEach((row, y) => {
                    for (let x = 0; x < row.length; x++) {
                        if (row[x] !== ' ' && row[x] !== '0') {
                            ctx.drawImage(img, obj.x + x * tileSize, obj.y + y * tileSize, tileSize, tileSize);
                        }
                    }
                });
            }
        } else {
            ctx.save();
            ctx.globalAlpha = obj.opacity ?? 1;
            const centerX = obj.x + obj.width / 2;
            const centerY = obj.y + obj.height / 2;
            
            ctx.translate(centerX + (obj.animOffsetX || 0), centerY + (obj.animOffsetY || 0));
            ctx.rotate(((obj.rotation || 0) + (obj.animRotation || 0)) * Math.PI / 180);
            const scaleX = (obj.scaleX ?? 1) * (obj.animScaleX ?? 1) * (obj.direction === 'left' ? -1 : 1);
            const scaleY = (obj.scaleY ?? 1) * (obj.animScaleY ?? 1) * (obj.flipY ? -1 : 1);
            ctx.scale(scaleX, scaleY);
            
            const drawX = -obj.width / 2;
            const drawY = -obj.height / 2;

            if (obj.videoUrl) {
                renderedVideoUrls.add(obj.videoUrl);
                let video = videoCache.current.get(obj.videoUrl);
                if (!video) {
                    video = document.createElement('video');
                    video.muted = obj.videoMuted !== false;
                    video.playsInline = true;
                    video.setAttribute('webkit-playsinline', 'true');
                    video.loop = obj.videoLoop !== false;
                    video.src = obj.videoUrl;
                    video.load();
                    videoCache.current.set(obj.videoUrl, video);
                }
                if (video) {
                    if (video.dataset.playState === undefined) {
                        video.dataset.playState = (obj.videoAutoplay ?? true) ? 'playing' : 'paused';
                    }
                    if (video.dataset.playState === 'playing') {
                        if (video.paused) {
                            video.play().catch(()=>{});
                        }
                    } else {
                        if (!video.paused) {
                            video.pause();
                        }
                    }
                    video.loop = obj.videoLoop !== false;
                    video.muted = obj.videoMuted !== false;
                    try {
                        ctx.drawImage(video, drawX, drawY, obj.width, obj.height);
                    } catch (e) {
                        // Video might not be ready, ignore error
                    }
                }
            } else if (obj.imageUrl) {
                const img = imageCache.current.get(obj.imageUrl);
                if (img && img.complete) {
                    ctx.drawImage(img, drawX, drawY, obj.width, obj.height);
                } else if (obj.color && obj.color !== 'transparent') {
                    ctx.fillStyle = obj.color;
                    ctx.fillRect(drawX, drawY, obj.width, obj.height);
                }
            } else if (obj.color !== 'transparent') {
                ctx.fillStyle = obj.color;
                ctx.fillRect(drawX, drawY, obj.width, obj.height);
            }
            
            // Draw Health Bar
            const healthBehavior = obj.behaviors?.find(b => b.name === 'Health');
            if (healthBehavior && healthBehavior.properties.showHealthBar !== false && obj.stats) {
                const hp = obj.stats.hp ?? 100;
                const maxHp = obj.stats.maxHp ?? 100;
                const hpPercent = Math.max(0, Math.min(1, hp / maxHp));
                
                const barWidth = obj.width;
                const barHeight = 6;
                const barY = drawY - barHeight - 4;
                const barX = drawX;
                
                // Background
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(barX, barY, barWidth, barHeight);
                // Foreground
                ctx.fillStyle = hpPercent > 0.5 ? '#22c55e' : (hpPercent > 0.25 ? '#eab308' : '#ef4444');
                ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
            }

            // Draw Score / Text (if any)
            if (obj.text) {
                ctx.fillStyle = obj.textColor || 'white';
                ctx.font = `bold ${obj.fontSize || 16}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(obj.text, 0, 0); // drawX and drawY are -width/2, -height/2, so 0,0 is center
            }

            ctx.restore();
        }
      });
      
      // Pause any cached video that is not actively rendering in this frame to prevent background lag
      videoCache.current.forEach((video, url) => {
          if (!renderedVideoUrls.has(url) && !video.paused) {
              try {
                  video.pause();
              } catch (e) {
                  // Ignore errors
              }
          }
      });
      
      // Update and draw visual floating feedbacks!
      floatingFeedbacks.current.forEach(f => {
          f.x += f.vx * deltaTime;
          f.y += f.vy * deltaTime;
          f.lifetime -= deltaTime;
          f.opacity = Math.max(0, f.lifetime);
      });
      floatingFeedbacks.current = floatingFeedbacks.current.filter(f => f.lifetime > 0);

      floatingFeedbacks.current.forEach(f => {
          ctx.save();
          ctx.globalAlpha = f.opacity;
          ctx.fillStyle = f.color;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 4;
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.strokeText(f.text, f.x, f.y);
          ctx.fillText(f.text, f.x, f.y);
          ctx.restore();
      });
      
      ctx.restore();

      animationFrameId = requestAnimationFrame(gameLoop);
    };
    
    const charImageUrls: string[] = [];
    scene.gameObjects.forEach(o => {
        if (o.characterImageMapping) {
            const map = parseCharacterImageMapping(o.characterImageMapping);
            Object.values(map).forEach(url => {
                if (url && !charImageUrls.includes(url)) charImageUrls.push(url);
            });
        }
    });

    const allImageAssets = [...assets.filter(a => a.type === 'image')];
    charImageUrls.forEach(url => {
        if (!allImageAssets.some(a => a.url === url)) {
            allImageAssets.push({ id: 'char-' + url, type: 'image', url, name: 'CharImg' });
        }
    });

    const imagePromises = allImageAssets.map(asset => new Promise<void>((resolve) => {
        if (imageCache.current.has(asset.url)) return resolve();
        const img = new Image();
        img.onload = () => { imageCache.current.set(asset.url, img); resolve(); };
        img.onerror = () => { console.error(`Failed to load image: ${asset.url}`); resolve(); }; // Resolve anyway to not block game start
        img.src = asset.url;
    }));

    const audioPromises = assets.filter(a => a.type === 'audio').map(asset => new Promise<void>((resolve) => {
        if (audioCache.current.has(asset.url)) return resolve();
        const audio = new Audio();
        let resolved = false;
        const done = () => {
            if (!resolved) {
                resolved = true;
                resolve();
            }
        };
        const timer = setTimeout(done, 150);
        audio.oncanplaythrough = () => {
            clearTimeout(timer);
            audioCache.current.set(asset.url, audio);
            done();
        };
        audio.onerror = () => {
            clearTimeout(timer);
            console.error(`Failed to load audio: ${asset.url}`);
            done();
        };
        audio.src = asset.url;
    }));
    
    const usedVideoUrls = new Set<string>();
    scene.gameObjects.forEach(obj => {
        if (obj.videoUrl) {
            usedVideoUrls.add(obj.videoUrl);
        }
    });
    scene.events.forEach(event => {
        event.actions.forEach(action => {
            if (action.action === 'PlayVideo' && action.params?.videoAssetId) {
                const asset = assets.find(a => a.id === action.params.videoAssetId);
                if (asset?.url) usedVideoUrls.add(asset.url);
            }
        });
    });
    scene.gameObjects.forEach(obj => {
        obj.scripts?.forEach(script => {
            script.actions.forEach(action => {
                if (action.action === 'PlayVideo' && action.params?.videoAssetId) {
                    const asset = assets.find(a => a.id === action.params.videoAssetId);
                    if (asset?.url) usedVideoUrls.add(asset.url);
                }
            });
        });
    });

    const videoPromises = assets.filter(a => a.type === 'video' && usedVideoUrls.has(a.url)).map(asset => new Promise<void>((resolve) => {
        if (videoCache.current.has(asset.url)) return resolve();
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('webkit-playsinline', 'true');
        video.loop = true;
        let resolved = false;
        const done = () => {
            if (!resolved) {
                resolved = true;
                resolve();
            }
        };
        const timer = setTimeout(done, 150);
        video.oncanplay = () => {
            clearTimeout(timer);
            videoCache.current.set(asset.url, video);
            done();
        };
        video.onerror = () => {
            clearTimeout(timer);
            console.error(`Failed to load video: ${asset.url}`);
            done();
        };
        video.src = asset.url;
        video.load();
    }));

    // Boot the game loop and OnStart triggers instantly for zero black-screen lag
    if (!initialState) {
        scene.events.forEach(event => {
            const hasOnStart = event.conditions.some(c => c.trigger === 'OnStart');
            if (hasOnStart) {
                const otherConditionsMet = event.conditions.filter(c => c.trigger !== 'OnStart').every(c => checkCondition(c));
                if (otherConditionsMet) {
                    executeActionsSequential(event.actions, undefined, false, 0, false, undefined, `event-${event.id}`);
                }
            }
        });
        gameObjectsRef.current.forEach(obj => {
            obj.scripts?.forEach(script => {
                if (script.trigger === 'OnStart') {
                    const scriptId = script.id || script.trigger;
                    executeActionsSequential(script.actions, obj, false, 0, false, undefined, `obj-${obj.id}-script-${scriptId}`);
                }
            });
        });
    }
    
    // Launch the rendering animation loop instantly!
    animationFrameId = requestAnimationFrame(gameLoop);

    // Preload assets asynchronously in the background to populate the cache
    Promise.allSettled([...imagePromises, ...audioPromises, ...videoPromises]).then(() => {
        console.log("Background asset caching finished.");
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (backgroundMusicPlayer.current) {
          backgroundMusicPlayer.current.pause();
          backgroundMusicPlayer.current = null;
      }
      videoCache.current.forEach(video => {
          try {
              video.pause();
              video.src = '';
              video.load();
          } catch (e) {
              // Ignore any errors when stopping videos
          }
      });
      videoCache.current.clear();
    };
  }, [scene, onGoToScene, globalVariables, assets, animations, initialState]);

  const isColliding = (box1: {x:number, y:number, width:number, height:number}, box2: {x:number, y:number, width:number, height:number}) => {
    return box1.x < box2.x + box2.width &&
           box1.x + box1.width > box2.x &&
           box1.y < box2.y + box2.height &&
           box1.y + box1.height > box2.y;
  };

  const checkCollision3D = (obj1: GameObject, obj2: GameObject) => {
    const p1 = obj1.position3D || { x: obj1.x / 50, y: (obj1.zIndex || 0) * 0.1, z: obj1.y / 50 };
    const p2 = obj2.position3D || { x: obj2.x / 50, y: (obj2.zIndex || 0) * 0.1, z: obj2.y / 50 };
    
    const w1 = (obj1.width || 40) / 50;
    const h1 = (obj1.height || 40) / 50;
    const d1 = obj1.scale3D?.y ?? 1.0;

    const w2 = (obj2.width || 40) / 50;
    const h2 = (obj2.height || 40) / 50;
    const d2 = obj2.scale3D?.y ?? 1.0;

    return (
        Math.abs(p1.x - p2.x) < (w1 + w2) / 2 &&
        Math.abs(p1.y - p2.y) < (d1 + d2) / 2 &&
        Math.abs(p1.z - p2.z) < (h1 + h2) / 2
    );
  };

  const parseCharacterImageMapping = (mappingStr: string | undefined): Record<string, string> => {
      const map: Record<string, string> = {};
      if (!mappingStr) return map;
      const lines = mappingStr.split(/[\n,]/);
      lines.forEach(line => {
          const parts = line.split('=');
          if (parts.length >= 2) {
              const char = parts[0].trim();
              const url = parts.slice(1).join('=').trim();
              if (char) {
                  map[char] = url;
              }
          }
      });
      return map;
  };

  const renderUITextElements = (text: string, obj?: GameObject) => {
      let newText = text;
      for (const key in gameVariables.current) {
          newText = newText.replace(new RegExp(`\\{${key}\\}`, 'g'), String(gameVariables.current[key]));
      }
      if (obj && obj.variables) {
          obj.variables.forEach(v => {
              newText = newText.replace(new RegExp(`\\{${v.name}\\}`, 'g'), String(v.value));
          });
      }

      if (obj && obj.characterImageMapping) {
          const map = parseCharacterImageMapping(obj.characterImageMapping);
          if (Object.keys(map).length > 0) {
              return (
                  <div className="flex items-center justify-center gap-0.5 flex-wrap pointer-events-none">
                      {Array.from(newText).map((char, idx) => {
                          const imgUrl = map[char] || map[char.toLowerCase()] || map[char.toUpperCase()];
                          if (imgUrl) {
                              return (
                                  <img 
                                      key={idx} 
                                      src={imgUrl} 
                                      alt={char} 
                                      className="object-contain inline-block" 
                                      style={{ height: `${obj.fontSize || 24}px`, minWidth: `${(obj.fontSize || 24) * 0.6}px` }} 
                                      referrerPolicy="no-referrer"
                                  />
                              );
                          }
                          return <span key={idx} style={{ fontSize: `${obj.fontSize || 16}px` }} className="text-white font-bold">{char}</span>;
                      })}
                  </div>
              );
          }
      }

      return <span>{newText}</span>;
  }

  const renderUIText = (text: string, obj?: GameObject) => {
      let newText = text;
      for (const key in gameVariables.current) {
          newText = newText.replace(new RegExp(`\\{${key}\\}`, 'g'), String(gameVariables.current[key]));
      }
      if (obj && obj.variables) {
          obj.variables.forEach(v => {
              newText = newText.replace(new RegExp(`\\{${v.name}\\}`, 'g'), String(v.value));
          });
      }
      return newText;
  }
  
  const initVideos = () => {
    const activeVideoUrls = new Set<string>();
    gameObjectsRef.current.forEach(obj => {
        if (obj.videoUrl && obj.visible !== false) {
            activeVideoUrls.add(obj.videoUrl);
        }
    });
    uiObjects.forEach(obj => {
        if (obj.videoUrl && obj.visible !== false) {
            activeVideoUrls.add(obj.videoUrl);
        }
    });

    videoCache.current.forEach((video, url) => {
        if (activeVideoUrls.has(url)) {
            if (video.paused && video.dataset.playState !== 'paused') {
                video.play().catch(() => {});
            }
        } else {
            if (!video.paused) {
                try {
                    video.pause();
                } catch (e) {
                    // Ignore errors
                }
            }
        }
    });
  };

  const initAudio = () => {
    if (!audioContextRef.current) {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser");
        }
    }
    if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
    }
    initVideos();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
        (e.target as Element).setPointerCapture(e.pointerId);
    } catch (err) {
        console.error("Failed to set pointer capture", err);
    }
    initAudio();
    if (dialogue) {
        setDialogue(null);
        frameDialogueEnd.current = true;
        return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    const objectsById = new Map<number, GameObject>(gameObjectsRef.current.map(o => [o.id, o]));
    const worldMouseX = (mouseX / camera.current.zoom) + camera.current.x - (canvas.width / (2*camera.current.zoom));
    const worldMouseY = (mouseY / camera.current.zoom) + camera.current.y - (canvas.height / (2*camera.current.zoom));
    
    // Check UI objects first (top-down)
    const clickedUIObject = [...uiObjects]
        .sort((a,b) => (b.zIndex || 0) - (a.zIndex || 0))
        .find(obj => {
            const rect = { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
            return mouseX >= rect.x && mouseX <= rect.x + rect.width &&
                   mouseY >= rect.y && mouseY <= rect.y + rect.height;
        });

    const clickedObject = clickedUIObject || [...gameObjectsRef.current]
        .sort((a,b) => (b.zIndex || 0) - (a.zIndex || 0))
        .find(obj => {
            if (obj.isUI) return false;
            const absPos = getObjectAbsolutePosition(obj.id, objectsById);
            const collisionBox = getCollisionBox({...obj, ...absPos});
            return worldMouseX >= collisionBox.x && worldMouseX <= collisionBox.x + collisionBox.width &&
                   worldMouseY >= collisionBox.y && worldMouseY <= collisionBox.y + collisionBox.height;
        });
    
    if (clickedObject) {
        frameClicks.current.push({ name: clickedObject.name, id: clickedObject.id });
        clickedObject.scripts?.forEach(script => {
            if (script.trigger === 'OnClick') {
                const scriptId = script.id || script.trigger;
                executeActionsSequential(script.actions, clickedObject, false, 0, false, undefined, `obj-${clickedObject.id}-script-${scriptId}`);
            }
        });

        if (clickedObject.isDraggable) {
            const isUI = clickedObject.isUI;
            draggingRef.current = {
                id: clickedObject.id,
                offsetX: clickedObject.x - (isUI ? mouseX : worldMouseX),
                offsetY: clickedObject.y - (isUI ? mouseY : worldMouseY)
            };
        }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      const worldMouseX = (mouseX / camera.current.zoom) + camera.current.x - (canvas.width / (2*camera.current.zoom));
      const worldMouseY = (mouseY / camera.current.zoom) + camera.current.y - (canvas.height / (2*camera.current.zoom));

      const obj = [...gameObjectsRef.current, ...uiObjects].find(o => o.id === draggingRef.current!.id);
      if (obj) {
          const isUI = obj.isUI;
          const targetX = isUI ? mouseX : worldMouseX;
          const targetY = isUI ? mouseY : worldMouseY;

          let updatedX = obj.x;
          let updatedY = obj.y;

          if (!obj.dragXLocked) {
              let newX = targetX + draggingRef.current!.offsetX;
              if (obj.dragMinX !== undefined) newX = Math.max(obj.dragMinX, newX);
              if (obj.dragMaxX !== undefined) newX = Math.min(obj.dragMaxX, newX);
              obj.x = newX;
              updatedX = newX;
          }
          if (!obj.dragYLocked) {
              let newY = targetY + draggingRef.current!.offsetY;
              if (obj.dragMinY !== undefined) newY = Math.max(obj.dragMinY, newY);
              if (obj.dragMaxY !== undefined) newY = Math.min(obj.dragMaxY, newY);
              obj.y = newY;
              updatedY = newY;
          }

          if (isUI) {
              setUiObjects(prev => prev.map(o => o.id === obj.id ? { ...o, x: updatedX, y: updatedY } : o));
          }
      }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      draggingRef.current = null;
  };
  
  const joystickSize = joystick?.size ?? 120;
  const joystickHandleSize = joystickSize / 2.4;

  const updateJoystickState = useCallback((touch: React.Touch | Touch) => {
    const base = joystickBaseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const distance = Math.min(joystickSize / 2, Math.hypot(dx, dy));
    joystickState.current = { active: true, angle, distance };

    if (joystickHandleRef.current) {
        const x = distance * Math.cos(angle * Math.PI / 180);
        const y = distance * Math.sin(angle * Math.PI / 180);
        joystickHandleRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }
  }, [joystickSize]);
  
  const handleJoystickTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    initAudio();
    const touch = e.changedTouches[0];
    if (touch && joystickBaseRef.current) {
        joystickTouchId.current = touch.identifier;
        updateJoystickState(touch);
    }
  };

  useEffect(() => {
    const handleJoystickTouchMove = (e: TouchEvent) => {
        if (joystickTouchId.current !== null) {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === joystickTouchId.current) {
                    e.preventDefault();
                    updateJoystickState(touch);
                    return;
                }
            }
        }
    };
    const handleJoystickTouchEnd = (e: TouchEvent) => {
        if (joystickTouchId.current !== null) {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === joystickTouchId.current) {
                    e.preventDefault();
                    joystickState.current = { active: false, angle: 0, distance: 0 };
                    if (joystickHandleRef.current) {
                        joystickHandleRef.current.style.transform = 'translate(0, 0)';
                    }
                    joystickTouchId.current = null;
                    return;
                }
            }
        }
    };
    window.addEventListener('touchmove', handleJoystickTouchMove, { passive: false });
    window.addEventListener('touchend', handleJoystickTouchEnd, { passive: false });
    return () => {
        window.removeEventListener('touchmove', handleJoystickTouchMove);
        window.removeEventListener('touchend', handleJoystickTouchEnd);
    };
  }, [updateJoystickState]);

  const controllablePlayers = gameObjectsRef.current.filter(obj => 
      !obj.isUI && obj.behaviors?.some(b => b.name === 'PlatformerCharacter' || b.name === 'TopDownRPGMovement')
  );
  
  const currentControlledId = selectedPlayerId !== null && controllablePlayers.some(p => p.id === selectedPlayerId)
      ? selectedPlayerId
      : controllablePlayers[0]?.id;

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      {!responsive && (
        <header className="flex items-center justify-between p-2 bg-gray-900 text-white shrink-0 border-b border-gray-800">
            <div className="flex items-center gap-4">
                <span className="font-bold">Vista Previa del Juego</span>
            </div>
            <button onClick={() => onExit({ gameObjects: gameObjectsRef.current, gameVariables: gameVariables.current })} className="px-4 py-1 bg-red-600 hover:bg-red-700 rounded-md">Salir</button>
        </header>
      )}
      {responsive && (
        <>
          <button 
              onClick={() => onExit({ gameObjects: gameObjectsRef.current, gameVariables: gameVariables.current })} 
              className="absolute top-4 right-4 z-[60] p-2 bg-red-600/50 hover:bg-red-600 text-white rounded-full transition-colors backdrop-blur-sm"
              title="Salir"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
          </button>
        </>
      )}

      {typeof onExit === 'function' && controllablePlayers.length >= 2 && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[60] flex items-center bg-slate-900/95 border border-slate-700 p-1.5 rounded-full shadow-xl pointer-events-auto hover:border-indigo-500/55 transition-colors">
              <span className="text-xs text-slate-400 px-3 border-r border-slate-700 font-semibold font-sans tracking-wide">Jugador Activo:</span>
              <div className="flex gap-1 ml-2">
                  {controllablePlayers.map((player) => {
                      const isActive = (currentControlledId === player.id);
                      return (
                          <button
                              key={player.id}
                              onClick={() => setSelectedPlayerId(player.id)}
                              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${
                                  isActive 
                                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-105' 
                                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                              }`}
                          >
                              {player.name}
                          </button>
                      );
                  })}
              </div>
          </div>
      )}

      <main ref={mainRef} className="flex-grow relative w-full h-full overflow-hidden flex justify-center items-center bg-black">
        <canvas
          ref={canvasRef}
          width={gameWidth}
          height={gameHeight}
          style={{ width: '100%', height: '100%', touchAction: 'none', imageRendering: (projectData?.hdRendering !== false) ? 'auto' : 'pixelated' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="absolute bottom-0 left-0 w-full h-24 bg-black/20 pointer-events-none"></div>
            {uiObjects.sort((a,b) => (a.zIndex || 0) - (b.zIndex || 0)).map(obj => {
                if (obj.visible === false) return null;
                const isControlButton = !!obj.controlAction && obj.controlAction !== 'none';
                
                const scaleX = (obj.scaleX ?? 1) * (obj.animScaleX ?? 1) * (obj.direction === 'left' ? -1 : 1);
                const scaleY = (obj.scaleY ?? 1) * (obj.animScaleY ?? 1) * (obj.flipY ? -1 : 1);

                const style: React.CSSProperties = {
                    position: 'absolute',
                    left: obj.x + (obj.animOffsetX || 0), top: obj.y + (obj.animOffsetY || 0),
                    width: obj.width, height: obj.height,
                    color: obj.color,
                    zIndex: obj.zIndex ?? 0,
                    opacity: obj.opacity ?? 1,
                    backgroundImage: obj.imageUrl ? `url(${obj.imageUrl})` : 'none',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    pointerEvents: isControlButton ? 'auto' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: isControlButton ? '2px solid rgba(255,255,255,0.3)' : 'none',
                    borderRadius: '0.5rem',
                    backgroundColor: isControlButton ? 'rgba(0,0,0,0.4)' : (obj.color !== 'transparent' && !obj.imageUrl ? obj.color : 'transparent'),
                    userSelect: 'none',
                    transformOrigin: 'center',
                    transform: `rotate(${(obj.rotation || 0) + (obj.animRotation || 0)}deg) scale(${scaleX}, ${scaleY})`,
                };
                
                const handlePress = (e: React.MouseEvent | React.TouchEvent) => { 
                    e.preventDefault();
                    if(obj.controlAction) {
                      actionsPressed.current[obj.controlAction] = true; 
                      actionsPressed.current[obj.controlAction+'_ui'] = true;
                    }
                };
                const handleRelease = (e: React.MouseEvent | React.TouchEvent) => { 
                    e.preventDefault();
                     if(obj.controlAction) {
                      actionsPressed.current[obj.controlAction] = false; 
                      actionsPressed.current[obj.controlAction+'_ui'] = false;
                    }
                };

                if (isControlButton) {
                    return (
                        <button
                            key={obj.id}
                            style={style}
                            onMouseDown={handlePress}
                            onMouseUp={handleRelease}
                            onMouseLeave={handleRelease}
                            onTouchStart={handlePress}
                            onTouchEnd={handleRelease}
                            className="font-bold active:bg-indigo-500/70"
                        >
                            <span style={{ transform: scaleX < 0 ? 'scaleX(-1)' : 'none' }}>
                                {obj.text && renderUITextElements(obj.text, obj)}
                            </span>
                        </button>
                    )
                }

                if (obj.isHealthBar) {
                    let targetObj = gameObjectsRef.current.find(o => o.name === obj.healthBarTarget);
                    if (!targetObj && obj.healthBarTarget) {
                        targetObj = gameObjectsRef.current.find(o => o.name.toLowerCase().includes(obj.healthBarTarget!.toLowerCase()));
                    }
                    if (!targetObj) {
                        targetObj = gameObjectsRef.current.find(o => o.name.toLowerCase().includes('jugador') || o.name.toLowerCase().includes('player'));
                    }
                    if (!targetObj) {
                        targetObj = gameObjectsRef.current.find(o => o.stats && typeof o.stats.hp === 'number');
                    }

                    const hp = targetObj?.stats?.hp ?? 100;
                    const maxHp = targetObj?.stats?.maxHp ?? 100;
                    const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));

                    let barColor = 'bg-[#10b981]'; // Emerald
                    if (hpPercent < 25) {
                        barColor = 'bg-[#ef4444] animate-pulse'; // Red
                    } else if (hpPercent < 50) {
                        barColor = 'bg-[#f59e0b]'; // Amber
                    }

                    return (
                        <div key={obj.id} style={{
                            ...style,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(15, 23, 42, 0.85)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '0.5rem',
                            padding: '6px 8px',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
                            pointerEvents: 'none'
                        }}>
                            <div className="flex items-center justify-between text-[11px] font-bold text-white mb-1.5 tracking-wide">
                                <span className="flex items-center gap-1">
                                    ❤️ <span className="font-sans text-[11px] text-gray-200">{targetObj ? targetObj.name : (obj.healthBarTarget || 'Jugador')}</span>
                                </span>
                                <span className="font-mono text-gray-300">{Math.round(hp)}/{maxHp}</span>
                            </div>
                            <div className="w-full bg-[#020617] rounded-full h-2.5 overflow-hidden border border-white/5 relative">
                                <div 
                                    className={`${barColor} h-full transition-all duration-300 rounded-full`}
                                    style={{ width: `${hpPercent}%` }}
                                />
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={obj.id} style={style}>
                        {obj.text && <div className="w-full h-full p-1 font-bold text-white text-center flex items-center justify-center" style={{ transform: scaleX < 0 ? 'scaleX(-1)' : 'none' }}>{renderUITextElements(obj.text, obj)}</div>}
                    </div>
                );
            })}
            {joystickRuntimeEnabled && (
              <div
                  ref={joystickBaseRef}
                  onTouchStart={handleJoystickTouchStart}
                  style={{
                      position: 'absolute',
                      bottom: '40px',
                      [joystick.position || 'left']: '40px',
                      width: `${joystickSize}px`,
                      height: `${joystickSize}px`,
                      backgroundColor: joystick.backgroundImageUrl ? 'transparent' : `rgba(255, 255, 255, ${joystick.opacity ?? 0.1})`,
                      backgroundImage: joystick.backgroundImageUrl ? `url(${joystick.backgroundImageUrl})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: '50%',
                      pointerEvents: 'auto',
                      userSelect: 'none',
                      zIndex: 999
                  }}
              >
                  <div 
                      ref={joystickHandleRef}
                      style={{
                          position: 'absolute',
                          width: `${joystickHandleSize}px`,
                          height: `${joystickHandleSize}px`,
                          backgroundColor: joystick.handleImageUrl ? 'transparent' : 'rgba(255, 255, 255, 0.3)',
                          backgroundImage: joystick.handleImageUrl ? `url(${joystick.handleImageUrl})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          borderRadius: '50%',
                          left: `calc(50% - ${joystickHandleSize / 2}px)`,
                          top: `calc(50% - ${joystickHandleSize / 2}px)`,
                          transition: 'transform 50ms linear'
                      }}/>
              </div>
            )}
            {activeInteractable && (
                <>
                    {/* Visual Prompt Bubble */}
                    <div 
                        className="absolute bottom-1/4 left-1/2 -translate-x-1/2 bg-indigo-950/90 border border-indigo-400 text-indigo-100 font-bold px-4 py-2 rounded-full shadow-2xl text-xs flex items-center gap-2 animate-pulse pointer-events-auto cursor-pointer select-none z-50"
                        onClick={() => {
                            if (activeInteractableRef.current) {
                                frameInteractions.current.push({
                                    id: activeInteractableRef.current.id,
                                    name: activeInteractableRef.current.name
                                });
                            }
                        }}
                    >
                        <span className="bg-indigo-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-mono">E</span>
                        <span>{activeInteractable.prompt}</span>
                    </div>

                    {/* Pro Mobile/Arcade Action Button */}
                    <button 
                        style={{
                            position: 'absolute',
                            bottom: '40px',
                            [joystick?.position === 'right' ? 'left' : 'right']: '45px',
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(99, 102, 241, 0.85)',
                            border: '3px solid rgba(255, 255, 255, 0.5)',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            pointerEvents: 'auto',
                            zIndex: 999
                        }}
                        onClick={() => {
                            if (activeInteractableRef.current) {
                                frameInteractions.current.push({
                                    id: activeInteractableRef.current.id,
                                    name: activeInteractableRef.current.name
                                });
                            }
                        }}
                        className="active:scale-95 transition-transform"
                    >
                        <span className="text-[14px]">⚡</span>
                        <span>INTERACT</span>
                    </button>
                </>
            )}
             {dialogue && (
                <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-3/4 max-w-2xl bg-black/80 text-white p-4 rounded-lg border-2 border-indigo-400 pointer-events-auto" onClick={() => setDialogue(null)}>
                    <p className="text-lg">{dialogue.text}</p>
                    <small className="text-indigo-300 block mt-2 text-right">Click para continuar...</small>
                </div>
            )}
            {consoleOpen && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/95 border border-indigo-500/50 p-3 rounded-lg shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-3">
                  <span className="text-indigo-400 font-mono font-bold leading-8 select-none">{'>'}</span>
                  <input 
                    autoFocus
                    type="text" 
                    className="flex-grow bg-transparent text-white font-mono text-base outline-none border-none h-10 w-full placeholder:text-gray-600"
                    placeholder="Escribe un comando y pulsa [ENTER]..."
                    value={consoleValue}
                    onChange={(e) => setConsoleValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.stopPropagation();
                            if (consoleValue.trim()) {
                                frameConsoleCommands.current.push(consoleValue.trim());
                                setConsoleValue('');
                            }
                            setConsoleOpen(false);
                        } else if (e.key === 'Escape') {
                            e.stopPropagation();
                            setConsoleOpen(false);
                        }
                    }}
                  />
                </div>
              </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default GameView;