import JSZip from 'jszip';
import type { ProjectData } from '../types';

export const generateGameHTML = (projectData?: ProjectData | null): string => {
    if (!projectData) return '';

    // This script is a self-contained game engine, adapted from GameView.tsx
    // to provide full feature parity with the in-editor preview.
    const gameEngineScript = `
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) throw new Error("Canvas not found");
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get 2D context");

        // Game State
        let gameObjects = [];
        let keysPressed = {};
        let actionsPressed = {};
        let gameVariables = {};
        // Initialize gameVariables with global values from project data
        if (window.projectData && window.projectData.globalVariables) {
            window.projectData.globalVariables.forEach(v => {
                gameVariables[v.name] = v.value;
            });
        }

        let imageCache = new Map();
        let audioCache = new Map();
        let videoCache = new Map();
        let backgroundMusicPlayer = null;
        let currentBackgroundMusicId = null;
        let activeAnimations = new Map();
        let camera = { x: 0, y: 0, zoom: 1 };
        let currentScene = null;
        let runtimeBackgroundColor = '#111827';
        let interactionRequired = true;
        let selectedPlayerId = null;
        
        // Project Data
        let allScenes = [];
        let assets = [];
        let animations = [];
        let globalObjects = [];
        
        // Loop and Event Management
        let animationFrameId;
        let dialogueElement = null;
        let frameCollisions = [];
        let frameClicks = [];
        let frameInteractions = [];
        let frameJoystickEvents = [];
        let frameTimerEvents = [];
        let frameAttacks = [];
        let frameButtonDown = [];
        let frameButtonUp = [];
        let frameTriggerDown = [];
        let frameTriggerUp = [];
        let frameConsoleCommands = [];
        let framePlayerJoined = false;
        let framePlayerLeft = false;
        let frameMatchFound = false;
        let frameReceiveNetworkMessage = false;
        let timers = new Map();
        let intervals = new Map();
        let joystickState = { active: false, angle: 0, distance: 0 };
        let joystickTouchId = null;
        let joystickUpPreviousFrame = false;
        window.audioContext = null;
        let joystickSize = 120;
        let dragging = null;
        let buttonState = {};
        let activeInteractable = null;

        const getObjectAbsolutePosition = (objectId, objectsById) => {
            let currentId = objectId;
            let absX = 0;
            let absY = 0;
            let currentRotation = 0;
            let safety = 100;
            const path = [];
            
            while(currentId && safety-- > 0) {
                const obj = objectsById.get(currentId);
                if (!obj) break;
                path.unshift(obj);
                currentId = obj.parentId;
            }
            
            for (const obj of path) {
                // Apply current rotation to this object's position
                const rad = currentRotation * Math.PI / 180;
                const rotatedX = obj.x * Math.cos(rad) - obj.y * Math.sin(rad);
                const rotatedY = obj.x * Math.sin(rad) + obj.y * Math.cos(rad);
                
                absX += rotatedX;
                absY += rotatedY;
                
                currentRotation += (obj.rotation || 0) + (obj.animRotation || 0);
            }
            return { x: absX, y: absY, rotation: currentRotation };
        };

        const getCollisionBox = (objWithAbsPos) => {
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

        const isColliding = (box1, box2) => {
            return box1.x < box2.x + box2.width &&
                box1.x + box1.width > box2.x &&
                box1.y < box2.y + box2.height &&
                box1.y + box1.height > box2.y;
        };
        
        const showDialogue = (text) => {
            if (dialogueElement) dialogueElement.remove();
            dialogueElement = document.createElement('div');
            dialogueElement.style.position = 'fixed';
            dialogueElement.style.bottom = '10%';
            dialogueElement.style.left = '50%';
            dialogueElement.style.transform = 'translateX(-50%)';
            dialogueElement.style.width = '80%';
            dialogueElement.style.maxWidth = '600px';
            dialogueElement.style.padding = '1rem';
            dialogueElement.style.backgroundColor = 'rgba(0,0,0,0.8)';
            dialogueElement.style.color = 'white';
            dialogueElement.style.border = '2px solid #6366f1';
            dialogueElement.style.borderRadius = '8px';
            dialogueElement.style.cursor = 'pointer';
            dialogueElement.style.zIndex = '10000';
            dialogueElement.innerText = text;
            document.body.appendChild(dialogueElement);
            dialogueElement.addEventListener('click', () => {
                if (dialogueElement) dialogueElement.remove();
                dialogueElement = null;
                frameDialogueEnd = true;
            });
        };
        
        const executeActionSingle = (action, self, targetOverride, isContinuous = false, deltaTime = 0, forceRestart = false) => {
            let params = action.params;
            if (typeof params === 'string') {
                try {
                    params = JSON.parse(params);
                } catch (e) {}
            }

            let targetObj;
            if (targetOverride) {
                targetObj = gameObjects.find(o => o.id === targetOverride.id);
            } else if ((action.object === 'Self' || (self && action.object === self.name)) && self) {
                targetObj = gameObjects.find(o => o.id === self.id);
            } else {
                targetObj = gameObjects.find(o => o.name === action.object) || gameObjects.find(o => o.id === action.object);
            }

            if (!targetObj && action.object !== 'System') return;

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
                        const idsToDestroy = new Set([targetObj.id]);
                        let added = true;
                        while (added) {
                            added = false;
                            gameObjects.forEach(o => {
                                if (o.parentId && idsToDestroy.has(o.parentId) && !idsToDestroy.has(o.id)) {
                                    idsToDestroy.add(o.id);
                                    added = true;
                                }
                            });
                        }
                        gameObjects = gameObjects.filter(o => !idsToDestroy.has(o.id));
                    }
                    break;
                case 'SetVariable':
                    if (params?.variable) {
                        const val = params.value;
                        gameVariables[params.variable] = (val !== '' && !isNaN(Number(val))) ? Number(val) : val;
                    }
                    break;
                case 'SetBooleanVariable':
                    if (params?.variable) {
                        gameVariables[params.variable] = !!params.valueBoolean;
                    }
                    break;
                case 'ToggleBooleanVariable':
                    if (params?.variable) {
                        gameVariables[params.variable] = !gameVariables[params.variable];
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
                        const targetToTeleport = gameObjects.find(o => o.name === params.targetObjectName);
                        if (targetToTeleport) {
                            targetObj.x = targetToTeleport.x;
                            targetObj.y = targetToTeleport.y;
                        }
                    }
                    break;
                case 'SetParent':
                    if (targetObj) {
                        if (!params?.parentName) {
                            targetObj.parentId = null;
                        } else {
                            const parentObj = gameObjects.find(o => o.name === params.parentName);
                            if (parentObj) {
                                targetObj.parentId = parentObj.id;
                            }
                        }
                    }
                    break;
                case 'AddToVariable':
                    if (params?.variable) {
                        const currentRaw = gameVariables[params.variable];
                        const currentVal = Number((currentRaw === undefined || currentRaw === null || currentRaw === '') ? 0 : currentRaw);
                        const toAdd = Number(params.value ?? 0);
                        const result = currentVal + toAdd;
                        gameVariables[params.variable] = isNaN(result) ? (params.value ?? 0) : result;
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
                    }
                    break;
                case 'GoToScene':
                    if (params?.sceneName) loadSceneByName(params.sceneName);
                    break;
                case 'SetSceneUnlocked':
                    if (params?.sceneName) {
                        const unlocked = params.valueBoolean !== false;
                        gameVariables['scene_unlocked_' + params.sceneName] = unlocked;
                    }
                    break;
                case 'CreateMatch':
                    frameMatchFound = true;
                    framePlayerJoined = true;
                    break;
                case 'JoinMatch':
                    frameMatchFound = true;
                    framePlayerJoined = true;
                    break;
                case 'SendNetworkMessage':
                    frameReceiveNetworkMessage = true;
                    break;
                case 'SetPlayerName':
                    if (targetObj) {
                        targetObj.name = params?.name || params?.value || 'Jugador';
                    }
                    break;
                case 'PlayAnimation':
                    if (targetObj && params?.animationId) {
                        const animId = String(params.animationId);
                        const anim = animations.find(a => a.id === animId);
                        if (anim) {
                            const currentAnim = activeAnimations.get(targetObj.id);
                            const isOneShotPlaying = currentAnim && currentAnim.animation.loop === false;
                            let stillPlaying = false;
                            if (isOneShotPlaying) {
                                const totalDuration = currentAnim.animation.frames.reduce((sum, f) => sum + f.duration, 0);
                                const elapsed = performance.now() - currentAnim.startTime;
                                if (elapsed < totalDuration) {
                                    stillPlaying = true;
                                }
                            }
                            if (forceRestart || !currentAnim || (currentAnim.animation.id !== anim.id && !stillPlaying)) {
                                activeAnimations.set(targetObj.id, { animation: anim, startTime: performance.now() });
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
                        targetObj.vx = Number(params?.vx ?? params?.velocity);
                    }
                    break;
                case 'SetVelocityY':
                    if (targetObj && (params?.vy != null || params?.velocity != null)) {
                        targetObj.vy = Number(params?.vy ?? params?.velocity);
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
                            axis: params.axis,
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
                    if (typeof showConsole === 'function') showConsole();
                    break;
                case 'CreateObject':
                    if (params?.templateObjectName) {
                        const templateName = params.templateObjectName;
                        const templateObj = allScenes.flatMap(s => s.gameObjects).find(o => o.name === templateName) || globalObjects.find(o => o.name === templateName);
                        if (templateObj) {
                            const newObj = {
                                ...JSON.parse(JSON.stringify(templateObj)),
                                id: Date.now() + Math.random(),
                                x: 0,
                                y: 0
                            };
                            gameObjects.push(newObj);
                        }
                    }
                    break;
                case 'GenerateObjectAt':
                    if (params?.templateObjectName && params?.targetObjectName) {
                        const templateName = params.templateObjectName;
                        const targetName = params.targetObjectName;
                        const templateObj = allScenes.flatMap(s => s.gameObjects).find(o => o.name === templateName) || globalObjects.find(o => o.name === templateName);
                        const targetObjRef = gameObjects.find(o => o.name === targetName);
                        if (templateObj && targetObjRef) {
                            const targetAbsPos = getObjectAbsolutePosition(targetObjRef.id, new Map(gameObjects.map(o => [o.id, o])));
                            const newObj = {
                                ...JSON.parse(JSON.stringify(templateObj)),
                                id: Date.now() + Math.random(),
                                x: targetAbsPos.x,
                                y: targetAbsPos.y
                            };
                            gameObjects.push(newObj);
                        }
                    }
                    break;
                case 'PlaySound':
                    if (params?.soundId) {
                        const soundAsset = assets.find(a => a.id === params.soundId);
                        if (soundAsset) {
                            const cachedAudio = audioCache.get(soundAsset.url);
                            if (cachedAudio) {
                                const clone = cachedAudio.cloneNode();
                                clone.loop = params.loop === true || params.loop === 'true';
                                clone.play().catch(() => {});
                            }
                        }
                    }
                    break;
                case 'SetBackgroundMusic':
                    if (params?.soundId) {
                        if (backgroundMusicPlayer) backgroundMusicPlayer.pause();
                        const musicAsset = assets.find(a => a.id === params.soundId);
                        if (musicAsset) {
                            const cachedAudio = audioCache.get(musicAsset.url);
                            if (cachedAudio) {
                                backgroundMusicPlayer = cachedAudio.cloneNode();
                                backgroundMusicPlayer.loop = params.loop !== false && params.loop !== 'false';
                                backgroundMusicPlayer.play().catch(()=>{});
                                currentBackgroundMusicId = musicAsset.id;
                            }
                        }
                    }
                    break;
                case 'StopBackgroundMusic':
                    if (backgroundMusicPlayer) {
                        backgroundMusicPlayer.pause();
                        backgroundMusicPlayer.currentTime = 0;
                        currentBackgroundMusicId = null;
                    }
                    break;
                case 'PauseBackgroundMusic':
                    if (backgroundMusicPlayer) backgroundMusicPlayer.pause();
                    break;
                case 'ResumeBackgroundMusic':
                    if (backgroundMusicPlayer) backgroundMusicPlayer.play().catch(()=>{});
                    break;
                case 'SetBackgroundMusicVolume':
                    if (backgroundMusicPlayer && params?.volume != null) {
                        backgroundMusicPlayer.volume = Math.max(0, Math.min(100, Number(params.volume))) / 100;
                    }
                    break;
                case 'SetBackgroundColor':
                    if (params?.color) runtimeBackgroundColor = params.color;
                    break;
                case 'PlayVideo': {
                    const selectedAsset = assets.find(a => a.id === params?.videoAssetId);
                    const url = selectedAsset ? selectedAsset.url : targetObj?.videoUrl;
                    if (url) {
                        const video = videoCache.get(url);
                        if (video) video.play().catch(()=>{});
                    }
                    break;
                }
                case 'PauseVideo': {
                    const selectedAsset = assets.find(a => a.id === params?.videoAssetId);
                    const url = selectedAsset ? selectedAsset.url : targetObj?.videoUrl;
                    if (url) {
                        const video = videoCache.get(url);
                        if (video) video.pause();
                    }
                    break;
                }
                case 'StopVideo': {
                    const selectedAsset = assets.find(a => a.id === params?.videoAssetId);
                    const url = selectedAsset ? selectedAsset.url : targetObj?.videoUrl;
                    if (url) {
                        const video = videoCache.get(url);
                        if (video) {
                            video.pause();
                            video.currentTime = 0;
                        }
                    }
                    break;
                }
                case 'ModifyStat':
                    if (targetObj?.stats && params?.stat && params?.operation && params?.value != null) {
                        const { stat, operation, value } = params;
                        let currentVal = targetObj.stats[stat] || 0;
                        if (operation === 'add') currentVal += Number(value);
                        else if (operation === 'subtract') currentVal -= Number(value);
                        else if (operation === 'set') currentVal = Number(value);
                        if (stat === 'hp') targetObj.stats.hp = Math.max(0, Math.min(targetObj.stats.maxHp, currentVal));
                        else targetObj.stats[stat] = currentVal;
                    }
                    break;
                case 'GainHealth':
                    if (targetObj && targetObj.stats && params?.value != null) {
                        const gain = Number(params.value);
                        targetObj.stats.hp = Math.max(0, Math.min(targetObj.stats.maxHp, (targetObj.stats.hp || 100) + gain));
                    }
                    break;
                case 'LoseHealth':
                    if (targetObj && targetObj.stats && params?.value != null) {
                        const loss = Number(params.value);
                        targetObj.stats.hp = Math.max(0, (targetObj.stats.hp || 100) - loss);
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
                            const sourceObj = gameObjects.find(o => o.name === sourceName);
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
                case 'Attack':
                    if (targetObj) {
                        try {
                            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                                if (ctx.state === 'suspended') ctx.resume();
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
                            }
                        } catch (e) {}

                        targetObj.attackEndTime = Date.now() + 150;

                        const damageVal = params?.damage !== undefined ? Number(params.damage) : 15;
                        const attackBox = {
                            id: Date.now() + Math.random(),
                            name: 'AttackBox',
                            x: targetObj.x + (targetObj.direction === 'left' ? -35 : targetObj.width + 5),
                            y: targetObj.y + (targetObj.height * 0.1),
                            width: 35,
                            height: targetObj.height * 0.8,
                            isProjectile: true,
                            projectileLifetime: 0.15,
                            behaviors: [],
                            color: '#ffffff',
                            opacity: 0.6,
                            zIndex: 10,
                            stats: { hp: 1, maxHp: 1, attack: damageVal }
                        };
                        gameObjects.push(attackBox);
                    }
                    break;
                case 'Shoot':
                    if (targetObj) {
                        try {
                            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                                if (ctx.state === 'suspended') ctx.resume();
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
                            }
                        } catch (e) {}

                        targetObj.attackEndTime = Date.now() + 100;

                        const bSpeed = Number(params?.speed || 400);
                        const bDamage = Number(params?.damage || 15);
                        const bDir = targetObj.direction === 'left' ? -1 : 1;
                        
                        const bulletBox = {
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
                            color: params?.color || '#ffff00',
                            opacity: 0.9,
                            zIndex: 12,
                            stats: { hp: 1, maxHp: 1, attack: bDamage }
                        };
                        gameObjects.push(bulletBox);
                    }
                    break;
                case 'CreatePlayers':
                    {
                        const pCount = Math.max(2, Math.min(16, Number(params?.count || params?.value || 2)));
                        const mainPlayer = gameObjects.find(obj => 
                            obj.behaviors?.some(b => b.name === 'PlatformerCharacter' || b.name === 'TopDownRPGMovement')
                        );
                        if (mainPlayer) {
                            const rootName = mainPlayer.name.split('_Player')[0];
                            const existingClones = gameObjects.filter(obj => 
                                obj.id !== mainPlayer.id && obj.name.startsWith(rootName + '_Player')
                            );
                            if (existingClones.length + 1 !== pCount) {
                                gameObjects = gameObjects.filter(obj => 
                                    obj.id === mainPlayer.id || !obj.name.startsWith(rootName + '_Player')
                                );
                                for (let i = 1; i < pCount; i++) {
                                    const clone = JSON.parse(JSON.stringify(mainPlayer));
                                    clone.id = Date.now() + Math.random() + i;
                                    clone.name = rootName + '_Player' + (i + 1);
                                    clone.x = mainPlayer.x + i * (mainPlayer.width + 12);
                                    gameObjects.push(clone);
                                }
                            }
                        }
                    }
                    break;
                case 'DisconnectPlayers':
                    {
                        const mainPlayer = gameObjects.find(obj => 
                            obj.behaviors?.some(b => b.name === 'PlatformerCharacter' || b.name === 'TopDownRPGMovement')
                        );
                        if (mainPlayer) {
                            const rootName = mainPlayer.name.split('_Player')[0];
                            gameObjects = gameObjects.filter(obj => 
                                obj.id === mainPlayer.id || !obj.name.startsWith(rootName + '_Player')
                            );
                            framePlayerLeft = true;
                        }
                    }
                    break;
                case 'ShowDialogue':
                    if (params?.dialogueText) showDialogue(params.dialogueText);
                    break;
                case 'SetQuestState':
                    if (params?.questId && params?.questState) gameVariables['quest_' + params.questId] = params.questState;
                    break;
                case 'ForceJump':
                    if (targetObj && targetObj.behaviors?.some(b => ['PlatformerCharacter', 'Physics'].includes(b.name)) && params?.jumpForce != null) {
                        targetObj.vy = -Number(params.jumpForce);
                        targetObj.grounded = false;
                    }
                    break;
                case 'TriggerAttack':
                    if (targetObj) {
                        frameAttacks.push({ name: targetObj.name, id: targetObj.id });
                    }
                    break;
                 case 'SaveGame':
                    if (params?.slot) {
                        try {
                            localStorage.setItem('return-2d-save-' + params.slot, JSON.stringify({
                                sceneName: currentScene.name, gameObjects, gameVariables, camera
                            }));
                        } catch (e) { console.error('Error saving game:', e); }
                    }
                    break;
                case 'LoadGame':
                    if (params?.slot) {
                        try {
                            const saved = JSON.parse(localStorage.getItem('return-2d-save-' + params.slot));
                            if (saved) loadSceneByName(saved.sceneName, saved);
                        } catch(e) { console.error('Error loading game:', e); }
                    }
                    break;
                case 'SetCameraZoom':
                    if (params?.zoomLevel) camera.zoom = Math.max(0.1, Number(params.zoomLevel));
                    break;
                case 'StartTimer':
                    if (params?.timerName && params?.duration != null) {
                        timers.set(params.timerName, { startTime: performance.now(), duration: Number(params.duration) * 1000 });
                    }
                    break;
                case 'StopTimer':
                    if (params?.timerName) {
                        timers.delete(params.timerName);
                    }
                    break;
                case 'CreateObject':
                    if (!params?.templateObjectName) break;
                    const template = currentScene.gameObjects.find(o => o.name === params.templateObjectName);
                    if (!template) break;
                    const newObject = JSON.parse(JSON.stringify(template));
                    newObject.id = Date.now() + Math.random();
                    let spawnX = Number(params.x) || 0;
                    let spawnY = Number(params.y) || 0;
                    if (params.positionType === 'relativeToObject' && params.relativeToObjectName) {
                        const relativeObj = gameObjects.find(o => o.name === params.relativeToObjectName);
                        if (relativeObj) {
                            const parentAbsPos = getObjectAbsolutePosition(relativeObj.id, new Map(gameObjects.map(o => [o.id, o])));
                            spawnX = parentAbsPos.x + (Number(params.offsetX) || 0);
                            spawnY = parentAbsPos.y + (Number(params.offsetY) || 0);
                        }
                    }
                    newObject.x = spawnX; newObject.y = spawnY;
                    newObject.parentId = null; newObject.vx = 0; newObject.vy = 0; newObject.grounded = false;
                    gameObjects.push(newObject);
                    break;
            }
        };

        const executeAction = (action, self, isContinuous = false, deltaTime = 0, forceRestart = false, pickedObjects = undefined) => {
            if (action.object === 'System' || action.object === 'Camera' || action.object === 'Self' || (self && action.object === self.name)) {
                executeActionSingle(action, self, undefined, isContinuous, deltaTime, forceRestart);
                return;
            }
            
            let targetInstances = pickedObjects && pickedObjects[action.object] ? pickedObjects[action.object] : undefined;
            
            if (!targetInstances || targetInstances.length === 0) {
                targetInstances = gameObjects.filter(o => o.name === action.object || String(o.id) === action.object);
            }
            
            if (targetInstances.length > 0) {
                targetInstances.forEach(inst => {
                    executeActionSingle(action, self, inst, isContinuous, deltaTime, forceRestart);
                });
            } else {
                executeActionSingle(action, self, undefined, isContinuous, deltaTime, forceRestart);
            }
        };

        const activeSequences = new Set();

        const executeActionsSequential = async (actionsList, self, isContinuous = false, deltaTime = 0, forceRestart = false, pickedObjects = undefined, sequenceKey = undefined) => {
            if (!actionsList) return;
            if (sequenceKey) {
                if (activeSequences.has(sequenceKey)) {
                    return;
                }
                activeSequences.add(sequenceKey);
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
                    }
                }
            } finally {
                if (sequenceKey) {
                    activeSequences.delete(sequenceKey);
                }
            }
        };

        const checkCondition = (cond, executingObj, executingObj2) => {
            const { variable, value, stat } = cond.params || {};
            const operator = cond.params?.operator || '==';
            let obj = executingObj && executingObj.name === cond.object ? executingObj : 
                      executingObj2 && executingObj2.name === cond.object ? executingObj2 :
                      gameObjects.find(o => o.name === cond.object);
            
            // Robust numeric check that safely ignores booleans and trims strings
            const isNumeric = (val) => {
                if (val === null || val === undefined || typeof val === 'boolean') return false;
                const s = String(val).trim();
                return s !== '' && !isNaN(Number(s));
            };

            switch (cond.trigger) {
                case 'Always': return true;
                case 'OnCollisionWith': case 'OnVerticalCollision': case 'OnHorizontalCollision':
                    return frameCollisions.some(c => {
                        const pairMatch = ((c.obj1Name === cond.object && c.obj2Name === cond.target) || (c.obj2Name === cond.object && c.obj1Name === cond.target));
                        if (!pairMatch) return false;
                        if (cond.trigger === 'OnCollisionWith') return true;
                        return c.type === cond.trigger;
                    });
                case 'OnObjectClicked': return obj ? frameClicks.some(c => c.id === obj.id) : frameClicks.some(c => c.name === cond.object);
                case 'OnInteract': return obj ? frameInteractions.some(c => c.id === obj.id) : frameInteractions.some(c => c.name === cond.object);
                case 'IsSceneUnlocked':
                    if (cond.params?.sceneName) {
                        return !!gameVariables['scene_unlocked_' + cond.params.sceneName];
                    }
                    return false;
                case 'OnKeyPress': return cond.params?.key && frameKeyPresses.includes(cond.params.key.toLowerCase());
                case 'OnAnyKeyPress': return frameKeyPresses.length > 0;
                case 'OnAttack': return obj ? frameAttacks.some(c => c.id === obj.id) : frameAttacks.some(c => c.name === cond.object);
                case 'OnTimerElapsed': return frameTimerEvents.includes(cond.params?.timerName);
                case 'OnDialogueEnd': return frameDialogueEnd;
                case 'CompareVariable': {
                    if (!variable) return false;
                    const currentVarRaw = gameVariables[variable];
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
                case 'IsMobile':
                    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
                case 'IsPC':
                    return !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);
                case 'CompareBooleanVariable': {
                    if (!variable) return false;
                    let currentVarRaw = gameVariables[variable];
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
                    if (!obj || !stat) return false;
                    const statValue = obj.stats?.[stat] ?? 0;
                    const compValue = value;
                    const isNumeric = (val) => val !== '' && !isNaN(Number(val));

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
                        case '==': return String(statValue) === String(compValue);
                        case '!=': return String(statValue) !== String(compValue);
                        default: return false;
                    }
                }
                case 'IsOnGround': return obj && !!obj.grounded; case 'IsMoving': return obj && (obj.vx !== 0 || obj.vy !== 0);
                case 'IsIdle': return obj && obj.vx === 0 && obj.vy === 0 && !!obj.grounded;
                case 'IsRunning': return obj && obj.vx !== 0 && !!obj.grounded; case 'IsJumping': return obj && !obj.grounded;
                case 'IsClimbing': return obj && !!obj.isClimbing;
                case 'IsLookingLeft': return obj && obj.direction === 'left';
                case 'IsLookingRight': return obj && obj.direction === 'right';
                case 'IsMusicPlaying':
                    const isPlaying = backgroundMusicPlayer && !backgroundMusicPlayer.paused;
                    if (!isPlaying) return false;
                    return cond.params?.soundId ? currentBackgroundMusicId === cond.params.soundId : true;
                case 'OnJoystickMove': return joystickState.active;
                case 'OnJoystickUp': return frameJoystickEvents.includes('up');
                case 'OnJoystickDown': return frameJoystickEvents.includes('down');
                case 'OnJoystickLeft': return frameJoystickEvents.includes('left');
                case 'OnJoystickRight': return frameJoystickEvents.includes('right');
                case 'OnButtonDown': return cond.params?.buttonName ? frameButtonDown.includes(cond.params.buttonName) : frameButtonDown.length > 0;
                case 'OnButtonUp': return cond.params?.buttonName ? frameButtonUp.includes(cond.params.buttonName) : frameButtonUp.length > 0;
                case 'OnTriggerDown': return cond.params?.triggerName ? frameTriggerDown.includes(cond.params.triggerName) : frameTriggerDown.length > 0;
                case 'OnTriggerUp': return cond.params?.triggerName ? frameTriggerUp.includes(cond.params.triggerName) : frameTriggerUp.length > 0;
                case 'OnConsoleCommand': return cond.params?.command ? frameConsoleCommands.includes(cond.params.command) : frameConsoleCommands.length > 0;
                case 'OnMatchFound': return frameMatchFound;
                case 'OnPlayerJoined': return framePlayerJoined;
                case 'OnPlayerLeft': return framePlayerLeft;
                case 'OnReceiveNetworkMessage': return frameReceiveNetworkMessage;
                case 'OnHealthDepleted': return obj && obj.stats && obj.stats.hp <= 0;
                default: return false;
            }
        };
        
        let frameDialogueEnd = false;
        const evaluateEvents = (deltaTime = 0) => {
             if (!currentScene) return;
             currentScene.events.forEach(event => {
                if (event.conditions.some(c => c.trigger === 'OnStart' || c.trigger === 'EveryXSeconds')) return;
                
                let pickedObjects = {};
                let conditionsMet = true;

                for (const cond of event.conditions) {
                    if (!conditionsMet) break;

                    if (cond.trigger === 'OnCollisionWith' || cond.trigger === 'OnVerticalCollision' || cond.trigger === 'OnHorizontalCollision') {
                        const objName = cond.object;
                        const targetName = cond.target;

                        let candidateObj1 = pickedObjects[objName] || gameObjects.filter(o => o.name === objName);
                        let candidateObj2 = pickedObjects[targetName] || gameObjects.filter(o => o.name === targetName);

                        const matches = frameCollisions.filter(c => {
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

                        const validObj1 = [];
                        const validObj2 = [];

                        matches.forEach(m => {
                            const o1 = candidateObj1.find(o => o.id === m.obj1Id || o.id === m.obj2Id);
                            const o2 = candidateObj2.find(o => o.id === m.obj1Id || o.id === m.obj2Id);
                            if (o1 && !validObj1.includes(o1)) validObj1.push(o1);
                            if (o2 && !validObj2.includes(o2)) validObj2.push(o2);
                        });

                        pickedObjects[objName] = validObj1;
                        pickedObjects[targetName] = validObj2;

                    } else if (['OnObjectClicked', 'OnHealthDepleted', 'IsIdle', 'IsRunning', 'IsJumping', 'IsOnGround', 'IsMoving', 'CompareObjectVariable', 'CompareStat', 'CompareObjectBooleanVariable', 'OnAttack'].includes(cond.trigger)) {
                        
                        const objectName = cond.object;
                        const instancesToCheck = pickedObjects[objectName] || gameObjects.filter(o => o.name === objectName);
                        
                        const validInstances = instancesToCheck.filter(inst => checkCondition(cond, inst, null));

                        if (validInstances.length === 0) {
                            conditionsMet = false;
                            break;
                        }

                        pickedObjects[objectName] = validInstances;

                    } else {
                        if (!checkCondition(cond, null, null)) {
                            conditionsMet = false;
                            break;
                        }
                    }
                }

                if (conditionsMet) {
                    const isEventTrigger = event.conditions.some(c => ['OnClick', 'OnKeyPress', 'OnAttack', 'OnTimerElapsed', 'OnDialogueEnd'].includes(c.trigger));
                    executeActionsSequential(event.actions, null, !isEventTrigger, deltaTime, false, pickedObjects, \`event-\${event.id}\`);
                }
             });
        };
        
        let lastTime = 0;
        let lastFrameTime = 0;
        function gameLoop(timestamp) {
            const now = performance.now();
            if (lastTime === 0) {
                lastTime = now;
                lastFrameTime = now;
            }
            const targetFps = window.projectData && window.projectData.fps ? Number(window.projectData.fps) : 60;
            const fpsInterval = 1000 / targetFps;
            const elapsed = now - lastFrameTime;
            if (elapsed < fpsInterval) {
                animationFrameId = requestAnimationFrame(gameLoop);
                return;
            }
            
            const deltaTime = Math.min(0.1, elapsed / 1000.0);
            lastTime = now;
            lastFrameTime = now - (elapsed % fpsInterval);

            // Console display logic
            let consoleUI = document.getElementById('engine-console');
            if (consoleUI) consoleUI.style.display = consoleActive ? 'block' : 'none';

            // Gamepad Polling
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            for (const gp of gamepads) {
                if (!gp) continue;

                const getButtonName = (idx) => {
                    const mapping = {
                        0: "A", 1: "B", 2: "X", 3: "Y", 
                        4: "L1", 5: "R1", 6: "L2", 7: "R2",
                        8: "Select", 9: "Start", 10: "L3", 11: "R3",
                        12: "DpadUp", 13: "DpadDown", 14: "DpadLeft", 15: "DpadRight",
                        16: "Home", 17: "Capture"
                    };
                    return mapping[idx] || ("button_" + idx);
                };

                gp.buttons.forEach((btn, index) => {
                    const btnName = "button_" + index;
                    const readableName = getButtonName(index);
                    if (btn.pressed) {
                        if (!buttonState[btnName]) {
                            frameButtonDown.push(btnName);
                            frameButtonDown.push(readableName);
                            
                            // Aliases
                            if (index === 6) frameButtonDown.push('ZL');
                            if (index === 7) frameButtonDown.push('ZR');
                            if (index === 8) frameButtonDown.push('Minus');
                            if (index === 9) frameButtonDown.push('Plus');
                            if (index === 4) frameButtonDown.push('L');
                            if (index === 5) frameButtonDown.push('R');
                            
                            buttonState[btnName] = true;
                        }
                    } else if (buttonState[btnName]) {
                        frameButtonUp.push(btnName);
                        frameButtonUp.push(readableName);
                        buttonState[btnName] = false;
                    }
                    
                    if (index === 0 && btn.pressed) actionsPressed.jump = true;
                    if (index === 2 && btn.pressed) actionsPressed.attack = true;
                });
                
                gp.axes.forEach((axis, index) => {
                   if (index === 0 && Math.abs(axis) > 0.1) {
                       actionsPressed.moveHorizontalIntensity = axis;
                       if (axis > 0) actionsPressed.moveRight = true;
                       else actionsPressed.moveLeft = true;
                   }
                });
            }

            timers.forEach((timer, name) => {
                if (now >= timer.startTime + timer.duration) {
                    frameTimerEvents.push(name);
                    timers.delete(name);
                }
            });

            currentScene.events.forEach((event, eventIndex) => {
                event.conditions.forEach((cond, condIndex) => {
                    if (cond.trigger === 'EveryXSeconds' && cond.params?.interval) {
                        const key = \`evt-\${event.id || eventIndex}-cond-\${condIndex}\`;
                        const intervalData = intervals.get(key);
                        const intervalMs = Number(cond.params.interval) * 1000;
                        if (!intervalData) {
                            intervals.set(key, { interval: intervalMs, lastTriggerTime: now });
                        } else if (now >= intervalData.lastTriggerTime + intervalData.interval) {
                            const otherConditionsMet = event.conditions.filter(c => c !== cond).every(c => checkCondition(c, null, null));
                            if (otherConditionsMet) {
                                executeActionsSequential(event.actions, null, false, 0, false, undefined, \`event-\${event.id}\`);
                            }
                            intervalData.lastTriggerTime = now;
                        }
                    }
                });
            });

            const objectsById = new Map(gameObjects.map(o => [o.id, o]));
            
            const staticCollisionShapes = [];
            const allObjectsWithAbsPosForPhysics = gameObjects.map(o => ({...o, ...getObjectAbsolutePosition(o.id, objectsById)}));
            
            allObjectsWithAbsPosForPhysics.forEach(obj => {
                if (obj.behaviors?.some(b => b.name === 'Solid')) {
                    staticCollisionShapes.push({ ...getCollisionBox(obj), owner: obj });
                }
                const tilemapBehavior = obj.behaviors?.find(b => b.name === 'Tilemap');
                if (tilemapBehavior) {
                    const { tileSize = 32, collisionData = '' } = tilemapBehavior.properties || {};
                    const rows = String(collisionData).split('\\n');
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

            frameJoystickEvents = [];

            ['moveLeft','moveRight','moveUp','moveDown','jump','attack','run'].forEach(act => {
                if (!actionsPressed[act+'_ui']) actionsPressed[act] = false;
            });
            actionsPressed.moveHorizontalIntensity = 0;
            
            if (keysPressed['shift'] || keysPressed['shiftleft'] || keysPressed['shiftright'] || keysPressed['keyz']) {
                actionsPressed.run = true;
            }
            
            const joystickUpNow = joystickState.active && joystickState.angle > -135 && joystickState.angle < -45;

            if (joystickUpNow && !joystickUpPreviousFrame) {
                actionsPressed.jump = true;
            }
            joystickUpPreviousFrame = joystickUpNow;

            if (joystickState.active) {
                const angle = joystickState.angle;
                const angleRad = angle * (Math.PI / 180);
                const horizontalProjection = Math.cos(angleRad);
                const maxDistance = joystickSize / 2;
                const intensity = joystickState.distance / maxDistance;
                
                if (Math.abs(horizontalProjection) > 0.15) {
                   actionsPressed.moveHorizontalIntensity = horizontalProjection * intensity;
                   if (horizontalProjection > 0) {
                       actionsPressed.moveRight = true;
                       if (!frameJoystickEvents.includes('right')) frameJoystickEvents.push('right');
                   } else {
                       actionsPressed.moveLeft = true;
                       if (!frameJoystickEvents.includes('left')) frameJoystickEvents.push('left');
                   }
                }

                if (angle > 45 && angle < 135) {
                   actionsPressed.moveDown = true;
                   if (!frameJoystickEvents.includes('down')) frameJoystickEvents.push('down');
                }

                if (joystickUpNow) {
                    actionsPressed.moveUp = true;
                    if (!frameJoystickEvents.includes('up')) frameJoystickEvents.push('up');
                }
            }
            
            let keyboardHorizontal = 0;
            if (keysPressed['arrowleft'] || keysPressed['keya']) keyboardHorizontal -= 1;
            if (keysPressed['arrowright'] || keysPressed['keyd']) keyboardHorizontal += 1;
            
            if (keyboardHorizontal !== 0) {
                actionsPressed.moveHorizontalIntensity = keyboardHorizontal;
            }

            if (keysPressed['arrowleft'] || keysPressed['keya']) actionsPressed.moveLeft = true;
            if (keysPressed['arrowright'] || keysPressed['keyd']) actionsPressed.moveRight = true;
            if (keysPressed['arrowup'] || keysPressed['keyw']) actionsPressed.moveUp = true;
            if (keysPressed['arrowdown'] || keysPressed['keys']) actionsPressed.moveDown = true;
            if (keysPressed['space']) actionsPressed.jump = true;
            if (keysPressed['keyx']) actionsPressed.attack = true;

            actionsPressed.jumpAction = actionsPressed.jump;
            actionsPressed.attackAction = actionsPressed.attack;
            actionsPressed.runAction = actionsPressed.run;

            const controllablePlayers = gameObjects.filter(obj => 
                !obj.isUI && obj.behaviors?.some(b => b.name === 'PlatformerCharacter' || b.name === 'TopDownRPGMovement')
            );
            const currentControlledId = selectedPlayerId !== null && controllablePlayers.some(p => p.id === selectedPlayerId)
                ? selectedPlayerId
                : controllablePlayers[0]?.id;

            gameObjects.forEach(obj => {
                if (obj.isProjectile) {
                    obj.x += (obj.vx || 0) * deltaTime;
                    obj.y += (obj.vy || 0) * deltaTime;
                    
                    if (obj.projectileLifetime !== undefined) {
                        obj.projectileLifetime -= deltaTime;
                        if (obj.projectileLifetime <= 0) {
                            setTimeout(() => {
                                gameObjects = gameObjects.filter(o => o.id !== obj.id);
                            }, 0);
                        }
                    }

                    // Check collisions with non-projectile objects
                    const projBox = getCollisionBox(obj);
                    for (const other of gameObjects) {
                        if (other.id !== obj.id && !other.isProjectile && !other.name.includes('Proyectil') && !other.behaviors?.some(b => b.name === 'Boss')) {
                            if (isColliding(projBox, getCollisionBox(other))) {
                                if (other.stats) {
                                    other.stats.hp = Math.max(0, (other.stats.hp || 100) - 10);
                                }
                                setTimeout(() => {
                                    gameObjects = gameObjects.filter(o => o.id !== obj.id);
                                }, 0);
                                break;
                            }
                        }
                    }
                    return; // Skip standard behavior / scripting for temporary bullet objects
                }

                // Process scripts for all objects, including UI
                obj.scripts?.forEach(s => {
                    const sId = s.id || s.trigger;
                    if (s.trigger === 'OnUpdate' || s.trigger === 'Always') {
                        executeActionsSequential(s.actions, obj, false, 0, false, undefined, \`obj-\${obj.id}-script-\${sId}\`);
                    } else if (!['OnStart', 'OnClick', 'OnCollisionWith', 'OnTimerElapsed'].includes(s.trigger)) {
                        const mockCondition = {
                            trigger: s.trigger,
                            object: obj.name,
                            params: s.params,
                            target: s.params?.targetObjectName
                        };
                        if (checkCondition(mockCondition, obj)) {
                            executeActionsSequential(s.actions, obj, false, 0, false, undefined, \`obj-\${obj.id}-script-\${sId}\`);
                        }
                    }
                });

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
                    const value = gameVariables[variableName] ?? 0;
                    obj.text = String(format).replace('{value}', String(value));
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

                    const playerObj = gameObjects.find(o => 
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
                                name: obj.name + '_Proyectil',
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

                            gameObjects.push(bossProjectile);
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

                if (obj.isUI) {
                    obj.x += (obj.vx || 0) * deltaTime;
                    obj.y += (obj.vy || 0) * deltaTime;
                    return;
                }

                const isCurrentControlled = obj.id === currentControlledId;

                const platformer = obj.behaviors?.find(b => b.name === 'PlatformerCharacter');
                if (platformer && isCurrentControlled) {
                    let { speed, jumpForce } = platformer.properties;
                    if (actionsPressed.run) {
                        speed *= 2;
                    }
                    
                    // Check ladder and climber behavior
                    const climber = obj.behaviors?.find(b => b.name === 'LadderClimber');
                    const ladders = gameObjects.filter(o => o.behaviors?.some(b => b.name === 'Ladder'));
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
                    } else if (climber) {
                        const climbUpInput = actionsPressed.moveUp || (actionsPressed.moveVerticalIntensity && actionsPressed.moveVerticalIntensity < -0.3);
                        const climbDownInput = actionsPressed.moveDown || (actionsPressed.moveVerticalIntensity && actionsPressed.moveVerticalIntensity > 0.3);
                        if (climbUpInput || climbDownInput) {
                            obj.isClimbing = true;
                        }
                    }

                    if (obj.isClimbing && climber) {
                        const climbSpeed = climber.properties?.speed ?? 100;
                        obj.vx = (actionsPressed.moveHorizontalIntensity || 0) * speed;
                        if ((obj.vx || 0) > 0) obj.direction = 'right';
                        if ((obj.vx || 0) < 0) obj.direction = 'left';

                        const climbUpInput = actionsPressed.moveUp || (actionsPressed.moveVerticalIntensity && actionsPressed.moveVerticalIntensity < -0.3);
                        const climbDownInput = actionsPressed.moveDown || (actionsPressed.moveVerticalIntensity && actionsPressed.moveVerticalIntensity > 0.3);
                        if (climbUpInput) {
                            obj.vy = -climbSpeed;
                        } else if (climbDownInput) {
                            obj.vy = climbSpeed;
                        } else {
                            obj.vy = 0; // Hanger
                        }

                        if (actionsPressed.jumpAction) {
                            obj.isClimbing = false;
                            obj.vy = -jumpForce;
                        }
                    } else {
                        obj.vx = (actionsPressed.moveHorizontalIntensity || 0) * speed;
                        if ((obj.vx || 0) > 0) obj.direction = 'right';
                        if ((obj.vx || 0) < 0) obj.direction = 'left';

                        if (actionsPressed.jumpAction && obj.grounded) {
                            obj.vy = -jumpForce;
                            obj.grounded = false;
                        }
                    }
                    if (actionsPressed.attackAction) {
                        frameAttacks.push({ name: obj.name, id: obj.id });
                    }
                }
                const rpgMovement = obj.behaviors?.find(b => b.name === 'TopDownRPGMovement');
                if (rpgMovement) {
                    let { speed } = rpgMovement.properties;
                    if (actionsPressed.run) {
                        speed *= 2;
                    }
                    
                    if (isCurrentControlled) {
                        if (joystickState.active) {
                            const maxDistance = joystickSize / 2;
                            const intensity = joystickState.distance / maxDistance;
                            const angleRad = joystickState.angle * Math.PI / 180;
                            obj.vx = speed * intensity * Math.cos(angleRad);
                            obj.vy = speed * intensity * Math.sin(angleRad);
                            if (Math.abs(joystickState.angle) > 90) {
                                obj.direction = 'left';
                            } else {
                                obj.direction = 'right';
                            }
                        } else {
                            obj.vx = 0; obj.vy = 0;
                            if (actionsPressed.moveLeft) { obj.vx = -speed; obj.direction = 'left'; }
                            if (actionsPressed.moveRight) { obj.vx = speed; obj.direction = 'right'; }
                            if (actionsPressed.moveUp) obj.vy = -speed;
                            if (actionsPressed.moveDown) obj.vy = speed;
                            
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

                        const isAttackingNow = actionsPressed.attackAction || frameAttacks.some(a => a.id === obj.id);
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
                                const currentAnim = activeAnimations.get(obj.id);
                                if (!currentAnim || currentAnim.animation.id !== matchingAttackAnim.id) {
                                    const animCopy = JSON.parse(JSON.stringify(matchingAttackAnim));
                                    animCopy.loop = false;
                                    activeAnimations.set(obj.id, {
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
                                    const currentAnim = activeAnimations.get(obj.id);
                                    if (!currentAnim || currentAnim.animation.id !== matchingJumpAnim.id) {
                                        const animCopy = JSON.parse(JSON.stringify(matchingJumpAnim));
                                        animCopy.loop = true;
                                        activeAnimations.set(obj.id, {
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
                                    const currentAnim = activeAnimations.get(obj.id);
                                    if (!currentAnim || currentAnim.animation.id !== matchingWalkAnim.id) {
                                        const animCopy = JSON.parse(JSON.stringify(matchingWalkAnim));
                                        animCopy.loop = true;
                                        activeAnimations.set(obj.id, {
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
                                    const currentAnim = activeAnimations.get(obj.id);
                                    if (!currentAnim || currentAnim.animation.id !== matchingIdleAnim.id) {
                                        const animCopy = JSON.parse(JSON.stringify(matchingIdleAnim));
                                        animCopy.loop = true;
                                        activeAnimations.set(obj.id, {
                                            animation: animCopy,
                                            startTime: nowTime,
                                        });
                                    }
                                } else {
                                    const currentAnim = activeAnimations.get(obj.id);
                                    if (currentAnim && currentAnim.animation.loop) {
                                        activeAnimations.delete(obj.id);
                                        const originalObject = currentScene.gameObjects.find(o => o.id === obj.id);
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
                    } else {
                        const currentAnim = activeAnimations.get(obj.id);
                        if (currentAnim && currentAnim.animation.loop) {
                            activeAnimations.delete(obj.id);
                            const originalObject = currentScene.gameObjects.find(o => o.id === obj.id);
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

                const physics = obj.behaviors?.find(b => ['Physics', 'PlatformerCharacter', 'Boss'].includes(b.name || ''));
                if (rpgMovement) {
                    obj.x += (obj.vx || 0) * deltaTime;
                    let currentAbsPos = getObjectAbsolutePosition(obj.id, objectsById);
                    let objWithAbsPosH = {...obj, ...currentAbsPos};
                    for (const solidShape of staticCollisionShapes) {
                        if (obj.id !== solidShape.owner.id && isColliding(getCollisionBox(objWithAbsPosH), solidShape)) {
                             frameCollisions.push({ obj1Name: obj.name, obj2Name: solidShape.owner.name, type: 'OnHorizontalCollision', obj1Id: obj.id, obj2Id: solidShape.owner.id });
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
                             frameCollisions.push({ obj1Name: obj.name, obj2Name: solidShape.owner.name, type: 'OnVerticalCollision', obj1Id: obj.id, obj2Id: solidShape.owner.id });
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
                    obj.x += (obj.vx || 0) * deltaTime;
                    
                    let currentAbsPos = getObjectAbsolutePosition(obj.id, objectsById);
                    let objWithAbsPos = {...obj, ...currentAbsPos};

                    for (const solidShape of staticCollisionShapes) {
                        if (obj.id !== solidShape.owner.id) {
                            const horizontalBox = getCollisionBox(objWithAbsPos);
                            const shrinkAmountY = 3; 
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
                                    frameCollisions.push({ obj1Name: obj.name, obj2Name: solidShape.owner.name, type: 'OnHorizontalCollision', obj1Id: obj.id, obj2Id: solidShape.owner.id });
                                    const objCenterX = horizontalBox.x + horizontalBox.width / 2;
                                    const solidCenterX = solidShape.x + solidShape.width / 2;
                                    if (objCenterX < solidCenterX) {
                                        obj.x = solidShape.x - horizontalBox.width - (currentAbsPos.x - obj.x);
                                    } else {
                                        obj.x = solidShape.x + solidShape.width - (currentAbsPos.x - obj.x);
                                    }
                                    obj.vx = 0;
                                    
                                    currentAbsPos = getObjectAbsolutePosition(obj.id, objectsById);
                                    objWithAbsPos = {...obj, ...currentAbsPos};
                                }
                            }
                        }
                    }

                    obj.grounded = false;
                    const gravity = (obj.isClimbing || obj.parentId) ? 0 : Number(physics.properties?.gravity !== undefined ? physics.properties.gravity : 500);
                    if (!obj.isClimbing && !obj.parentId) {
                        obj.vy = (obj.vy || 0) + gravity * deltaTime;
                    }
                    obj.y += (obj.vy || 0) * deltaTime;
                    
                    currentAbsPos = getObjectAbsolutePosition(obj.id, objectsById);
                    objWithAbsPos = {...obj, ...currentAbsPos};

                    for (const solidShape of staticCollisionShapes) {
                        if (obj.id !== solidShape.owner.id) {
                            const verticalBox = getCollisionBox(objWithAbsPos);
                            
                            // Check for rotated ramp slope first!
                            if (solidShape.owner.rotation) {
                                const surfaceY = getRotatedSurfaceY(verticalBox.x, verticalBox.width, solidShape.owner);
                                if (surfaceY !== null) {
                                    const playerBottom = verticalBox.y + verticalBox.height;
                                    if ((obj.vy || 0) >= 0 && playerBottom >= surfaceY - 12 && playerBottom <= surfaceY + 16) {
                                        frameCollisions.push({ obj1Name: obj.name, obj2Name: solidShape.owner.name, type: 'OnVerticalCollision', obj1Id: obj.id, obj2Id: solidShape.owner.id });
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

                            const shrinkAmountX = 3;
                            const adjustedBoxV = {
                                ...verticalBox,
                                x: verticalBox.x + shrinkAmountX,
                                width: Math.max(1, verticalBox.width - 2 * shrinkAmountX)
                            };

                            if (isColliding(adjustedBoxV, solidShape)) {
                                frameCollisions.push({ obj1Name: obj.name, obj2Name: solidShape.owner.name, type: 'OnVerticalCollision', obj1Id: obj.id, obj2Id: solidShape.owner.id });
                                if ((obj.vy || 0) > 0) {
                                    obj.y = solidShape.y - verticalBox.height - (currentAbsPos.y - obj.y);
                                    obj.grounded = true;
                                    obj.vy = 0;
                                    
                                    const platformObj = objectsById.get(solidShape.owner.id);
                                    if (platformObj && platformObj.platformVx) {
                                        obj.x += platformObj.platformVx * deltaTime;
                                    }
                                } else if ((obj.vy || 0) < 0) {
                                    obj.y = solidShape.y + solidShape.height - (currentAbsPos.y - obj.y);
                                    obj.vy = 0;
                                }
                                currentAbsPos = getObjectAbsolutePosition(obj.id, objectsById);
                                objWithAbsPos = {...obj, ...currentAbsPos};
                            }
                        }
                    }
                } else {
                    obj.x += (obj.vx || 0) * deltaTime;
                    obj.y += (obj.vy || 0) * deltaTime;
                }
            });

            const collidables = gameObjects.map(o => ({...o, ...getObjectAbsolutePosition(o.id, objectsById)})).filter(o => !o.isUI && (o.isTouchable ?? true));
            for (let i = 0; i < collidables.length; i++) for (let j = i + 1; j < collidables.length; j++) {
                if (isColliding(getCollisionBox(collidables[i]), getCollisionBox(collidables[j]))) {
                    frameCollisions.push({ obj1Name: collidables[i].name, obj2Name: collidables[j].name, type: 'OnCollisionWith', obj1Id: collidables[i].id, obj2Id: collidables[j].id });
                    const o1 = gameObjects.find(o => o.id === collidables[i].id);
                    const o2 = gameObjects.find(o => o.id === collidables[j].id);
                    const targetsDict = {
                        [o1.name]: [o1],
                        [o2.name]: [o2]
                    };
                    o1?.scripts?.forEach(s => {
                        const sId = s.id || s.trigger;
                        if (s.trigger === 'OnCollisionWith' && (!s.params?.targetObjectName || s.params.targetObjectName === o2?.name)) {
                            executeActionsSequential(s.actions, o1, false, deltaTime, false, targetsDict, \`obj-\${o1.id}-script-\${sId}\`);
                        }
                    });
                    o2?.scripts?.forEach(s => {
                        const sId = s.id || s.trigger;
                        if (s.trigger === 'OnCollisionWith' && (!s.params?.targetObjectName || s.params.targetObjectName === o1?.name)) {
                            executeActionsSequential(s.actions, o2, false, deltaTime, false, targetsDict, \`obj-\${o2.id}-script-\${sId}\`);
                        }
                    });
                }
            }
            
            gameObjects.forEach(obj => {
                obj.scripts?.forEach(script => {
                    const scriptId = script.id || script.trigger;
                    if (script.trigger === 'OnUpdate' || script.trigger === 'Always') {
                        executeActionsSequential(script.actions, obj, true, deltaTime, false, undefined, \`obj-\${obj.id}-script-\${scriptId}\`);
                    } else if (!['OnStart', 'OnClick', 'OnCollisionWith', 'OnTimerElapsed', 'OnDialogueEnd'].includes(script.trigger)) {
                        const mockCond = { trigger: script.trigger, object: obj.name, params: script.params, target: script.params?.targetObjectName };
                        if (checkCondition(mockCond, obj)) {
                            executeActionsSequential(script.actions, obj, true, deltaTime, false, undefined, \`obj-\${obj.id}-script-\${scriptId}\`);
                        }
                    }
                });

                if (obj.tweens) {
                    obj.tweens = obj.tweens.filter(tween => {
                        const elapsed = now - tween.startTime;
                        const progress = Math.min(1, elapsed / tween.duration);
                        
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
            });

            // Check for interactables near player
            const playerObjForInteract = gameObjects.find(o => o.behaviors && o.behaviors.some(b => b.name === 'PlatformerCharacter' || b.name === 'TopDownRPGMovement'));
            let currentActiveInteractable = null;
            
            if (playerObjForInteract) {
                const interactables = gameObjects.filter(o => o.behaviors && o.behaviors.some(b => b.name === 'Interactable'));
                let minDistance = Infinity;
                for (const item of interactables) {
                    const dx = item.x - playerObjForInteract.x;
                    const dy = item.y - playerObjForInteract.y;
                    const dist = Math.hypot(dx, dy);
                    const interactBehav = item.behaviors.find(b => b.name === 'Interactable');
                    const radius = Number((interactBehav.properties && interactBehav.properties.radius) || 60);
                    
                    if (dist <= radius && dist < minDistance) {
                        minDistance = dist;
                        currentActiveInteractable = {
                            id: item.id,
                            name: item.name,
                            prompt: String((interactBehav.properties && interactBehav.properties.prompt) || 'Interactuar [E]')
                        };
                    }
                }
            }
            activeInteractable = currentActiveInteractable;

            // Update interaction prompt overlay in the DOM if needed
            let interactOverlay = document.getElementById('engine-interact-overlay');
            let interactBtn = document.getElementById('engine-interact-btn');
            const uiContainerForInteract = document.getElementById('ui-container');
            
            if (activeInteractable && uiContainerForInteract) {
                if (!interactOverlay) {
                    interactOverlay = document.createElement('div');
                    interactOverlay.id = 'engine-interact-overlay';
                    interactOverlay.style.position = 'absolute';
                    interactOverlay.style.bottom = '25%';
                    interactOverlay.style.left = '50%';
                    interactOverlay.style.transform = 'translateX(-50%)';
                    interactOverlay.style.backgroundColor = 'rgba(15, 23, 42, 0.9)';
                    interactOverlay.style.border = '1px solid rgba(129, 140, 248, 0.8)';
                    interactOverlay.style.color = '#e0e7ff';
                    interactOverlay.style.padding = '8px 16px';
                    interactOverlay.style.borderRadius = '9999px';
                    interactOverlay.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.5)';
                    interactOverlay.style.fontSize = '12px';
                    interactOverlay.style.fontWeight = 'bold';
                    interactOverlay.style.display = 'flex';
                    interactOverlay.style.alignItems = 'center';
                    interactOverlay.style.gap = '8px';
                    interactOverlay.style.zIndex = '99999';
                    interactOverlay.style.pointerEvents = 'auto';
                    interactOverlay.style.cursor = 'pointer';
                    
                    const eBadge = document.createElement('span');
                    eBadge.innerText = 'E';
                    eBadge.style.backgroundColor = '#6366f1';
                    eBadge.style.color = 'white';
                    eBadge.style.borderRadius = '50%';
                    eBadge.style.width = '20px';
                    eBadge.style.height = '20px';
                    eBadge.style.display = 'flex';
                    eBadge.style.alignItems = 'center';
                    eBadge.style.justifyContent = 'center';
                    eBadge.style.fontFamily = 'monospace';
                    
                    const labelSpan = document.createElement('span');
                    labelSpan.id = 'engine-interact-label';
                    
                    interactOverlay.appendChild(eBadge);
                    interactOverlay.appendChild(labelSpan);
                    
                    interactOverlay.addEventListener('click', () => {
                        if (activeInteractable) {
                            frameInteractions.push({
                                id: activeInteractable.id,
                                name: activeInteractable.name
                            });
                        }
                    });
                    
                    uiContainerForInteract.appendChild(interactOverlay);
                }
                
                const label = document.getElementById('engine-interact-label');
                if (label) label.innerText = activeInteractable.prompt;
                interactOverlay.style.display = 'flex';
                
                // Also mobile/arcade big touch button
                if (!interactBtn) {
                    interactBtn = document.createElement('button');
                    interactBtn.id = 'engine-interact-btn';
                    interactBtn.style.position = 'absolute';
                    interactBtn.style.bottom = '40px';
                    
                    const joyPos = window.projectData.joystick?.position || 'left';
                    interactBtn.style[joyPos === 'right' ? 'left' : 'right'] = '45px';
                    interactBtn.style.width = '72px';
                    interactBtn.style.height = '72px';
                    interactBtn.style.borderRadius = '50%';
                    interactBtn.style.backgroundColor = 'rgba(99, 102, 241, 0.85)';
                    interactBtn.style.border = '3px solid rgba(255, 255, 255, 0.5)';
                    interactBtn.style.color = 'white';
                    interactBtn.style.fontWeight = 'bold';
                    interactBtn.style.fontSize = '11px';
                    interactBtn.style.display = 'flex';
                    interactBtn.style.flexDirection = 'column';
                    interactBtn.style.alignItems = 'center';
                    interactBtn.style.justifyContent = 'center';
                    interactBtn.style.gap = '2px';
                    interactBtn.style.cursor = 'pointer';
                    interactBtn.style.userSelect = 'none';
                    interactBtn.style.pointerEvents = 'auto';
                    interactBtn.style.zIndex = '99999';
                    
                    const iconSpan = document.createElement('span');
                    iconSpan.innerText = '⚡';
                    iconSpan.style.fontSize = '14px';
                    
                    const textSpan = document.createElement('span');
                    textSpan.innerText = 'INTERACT';
                    
                    interactBtn.appendChild(iconSpan);
                    interactBtn.appendChild(textSpan);
                    
                    interactBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (activeInteractable) {
                            frameInteractions.push({
                                id: activeInteractable.id,
                                name: activeInteractable.name
                            });
                        }
                    });
                    
                    uiContainerForInteract.appendChild(interactBtn);
                }
                
                // Reposition if joystick settings changed
                const joyPos = window.projectData.joystick?.position || 'left';
                interactBtn.style.left = joyPos === 'right' ? '45px' : 'auto';
                interactBtn.style.right = joyPos === 'right' ? 'auto' : '45px';
                interactBtn.style.display = 'flex';
            } else {
                if (interactOverlay) interactOverlay.style.display = 'none';
                if (interactBtn) interactBtn.style.display = 'none';
            }

            evaluateEvents(deltaTime);
            frameKeyPresses = [];
            frameCollisions = []; frameClicks = []; frameInteractions = []; frameTimerEvents = []; frameAttacks = []; frameDialogueEnd = false;

            activeAnimations.forEach((activeAnim, objId) => {
                const obj = gameObjects.find(o => o.id === objId);
                if (!obj) { activeAnimations.delete(objId); return; }
                
                const totalDuration = activeAnim.animation.frames.reduce((sum, f) => sum + f.duration, 0);
                if (totalDuration <= 0) {
                    activeAnimations.delete(objId);
                    return;
                }

                const elapsed = now - activeAnim.startTime;
                
                if (elapsed >= totalDuration) {
                    if (activeAnim.animation.loop) { 
                        activeAnim.startTime = now; 
                    } else { 
                        activeAnimations.delete(objId); 
                        const originalObject = currentScene.gameObjects.find(o => o.id === objId);
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
                    
                    const lerp = (a, b, t) => a + (b - a) * t;
                    const shouldInterpolate = activeAnim.animation.loop || currentFrameIndex < activeAnim.animation.frames.length - 1;
                    
                    obj.animOffsetX = shouldInterpolate ? lerp(currentFrame.x ?? 0, nextFrame.x ?? currentFrame.x ?? 0, t) : (currentFrame.x ?? 0);
                    obj.animOffsetY = shouldInterpolate ? lerp(currentFrame.y ?? 0, nextFrame.y ?? currentFrame.y ?? 0, t) : (currentFrame.y ?? 0);
                    obj.animRotation = shouldInterpolate ? lerp(currentFrame.rotation ?? 0, nextFrame.rotation ?? currentFrame.rotation ?? 0, t) : (currentFrame.rotation ?? 0);
                    obj.animScaleX = shouldInterpolate ? lerp(currentFrame.scaleX ?? 1, nextFrame.scaleX ?? currentFrame.scaleX ?? 1, t) : (currentFrame.scaleX ?? 1);
                    obj.animScaleY = shouldInterpolate ? lerp(currentFrame.scaleY ?? 1, nextFrame.scaleY ?? currentFrame.scaleY ?? 1, t) : (currentFrame.scaleY ?? 1);
                }
            });
            
            gameObjects.forEach(obj => {
                if (obj.attackEndTime !== undefined && Date.now() < obj.attackEndTime) {
                    const remaining = obj.attackEndTime - Date.now();
                    const progress = Math.max(0, Math.min(1, remaining / 150));
                    const swingAngle = 45 * progress;
                    obj.animRotation = (obj.direction === 'left' ? -swingAngle : swingAngle);
                }
            });
            
            
            const followCameraBehavior = gameObjects.find(o => o.behaviors?.some(b => b.name === 'FollowCamera'));
            const followTarget = followCameraBehavior;
            
            if (followTarget) {
                const absPos = getObjectAbsolutePosition(followTarget.id, objectsById);
                const followTargetWithAbsPos = {...followTarget, ...absPos};
                const collisionBox = getCollisionBox(followTargetWithAbsPos);
                
                const idealCamX = collisionBox.x + collisionBox.width / 2;
                const idealCamY = collisionBox.y + collisionBox.height / 2;
            
                if (currentScene?.cameraBounds?.enabled) {
                    const bounds = currentScene.cameraBounds;
                    const zoomedWidth = canvas.width / camera.zoom;
                    const zoomedHeight = canvas.height / camera.zoom;
                    
                    if (bounds.width < zoomedWidth) {
                        camera.x = bounds.x + bounds.width / 2;
                    } else {
                        const minCamX = bounds.x + zoomedWidth / 2;
                        const maxCamX = bounds.x + bounds.width - zoomedWidth / 2;
                        camera.x = Math.max(minCamX, Math.min(idealCamX, maxCamX));
                    }
                    
                    if (bounds.height < zoomedHeight) {
                        camera.y = bounds.y + bounds.height / 2;
                    } else {
                        const minCamY = bounds.y + zoomedHeight / 2;
                        const maxCamY = bounds.y + bounds.height - zoomedHeight / 2;
                        camera.y = Math.max(minCamY, Math.min(idealCamY, maxCamY));
                    }

                } else {
                    camera.x = idealCamX;
                    camera.y = idealCamY;
                }
            } else {
                camera.x = canvas.width / 2;
                camera.y = canvas.height / 2;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.fillStyle = runtimeBackgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(camera.zoom, camera.zoom);
            ctx.translate(-camera.x, -camera.y);
            
            const allDrawable = gameObjects.map(o => {
                const absPos = getObjectAbsolutePosition(o.id, objectsById);
                return { ...o, absX: absPos.x, absY: absPos.y };
            });
            allDrawable.filter(o => !o.isUI).sort((a,b) => a.zIndex-b.zIndex).forEach(obj => renderObject(ctx, obj));
            ctx.restore();
            allDrawable.filter(o => o.isUI).sort((a,b) => a.zIndex-b.zIndex).forEach(obj => renderObject(ctx, obj, true));

            frameCollisions = [];
            frameClicks = [];
            frameInteractions = [];
            frameJoystickEvents = [];
            frameTimerEvents = [];
            frameAttacks = [];
            frameKeyPresses = [];
            frameButtonDown = [];
            frameButtonUp = [];
            frameTriggerDown = [];
            frameTriggerUp = [];
            frameConsoleCommands = [];
            framePlayerJoined = false;
            framePlayerLeft = false;
            frameMatchFound = false;
            frameReceiveNetworkMessage = false;
            frameDialogueEnd = false;

            animationFrameId = requestAnimationFrame(gameLoop);
        };
        
        function renderObject(context, obj, isUI = false) {
            const tilemapBehavior = obj.behaviors?.find(b => b.name === 'Tilemap');
            if (tilemapBehavior && obj.imageUrl) {
                const img = imageCache.get(obj.imageUrl);
                if (img && img.complete) {
                    const { tileSize = 32, collisionData = '' } = tilemapBehavior.properties || {};
                    const rows = String(collisionData).split('\\n');
                    rows.forEach((row, y) => {
                        for (let x = 0; x < row.length; x++) {
                            if (row[x] !== ' ' && row[x] !== '0') {
                                context.drawImage(img, (obj.absX || obj.x) + x * tileSize, (obj.absY || obj.y) + y * tileSize, tileSize, tileSize);
                            }
                        }
                    });
                }
                return;
            }

            context.save();
            if (obj.visible === false) { context.restore(); return; }
            context.globalAlpha = obj.opacity ?? 1;

            const centerX = isUI ? (obj.absX || obj.x) + obj.width/2 : (obj.absX || obj.x) + obj.width/2;
            const centerY = isUI ? (obj.absY || obj.y) + obj.height/2 : (obj.absY || obj.y) + obj.height/2;
            context.translate(centerX + (obj.animOffsetX || 0), centerY + (obj.animOffsetY || 0));
            context.rotate(((obj.rotation || 0) + (obj.animRotation || 0)) * Math.PI / 180);
            const scaleX = (obj.scaleX ?? 1) * (obj.animScaleX ?? 1) * (obj.direction === 'left' ? -1 : 1);
            const scaleY = (obj.scaleY ?? 1) * (obj.animScaleY ?? 1) * (obj.flipY ? -1 : 1);
            context.scale(scaleX, scaleY);
            const drawX = -obj.width/2, drawY = -obj.height/2;

            if (obj.isHealthBar) {
                let targetObj = gameObjects.find(o => o.name === obj.healthBarTarget);
                if (!targetObj && obj.healthBarTarget) {
                    targetObj = gameObjects.find(o => o.name.toLowerCase().includes(obj.healthBarTarget.toLowerCase()));
                }
                if (!targetObj) {
                    targetObj = gameObjects.find(o => o.name.toLowerCase().includes('jugador') || o.name.toLowerCase().includes('player'));
                }
                if (!targetObj) {
                    targetObj = gameObjects.find(o => o.stats && typeof o.stats.hp === 'number');
                }

                const hp = targetObj?.stats?.hp ?? 100;
                const maxHp = targetObj?.stats?.maxHp ?? 100;
                const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));

                let barColor = '#10b981'; // green-500
                if (hpPercent < 25) {
                    barColor = '#ef4444'; // red-500
                } else if (hpPercent < 50) {
                    barColor = '#f59e0b'; // amber-500
                }

                // Draw background box
                context.fillStyle = 'rgba(15, 23, 42, 0.85)';
                context.fillRect(drawX, drawY, obj.width, obj.height);
                
                // Draw border
                context.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                context.lineWidth = 1;
                context.strokeRect(drawX, drawY, obj.width, obj.height);

                // Calculate inner dimensions
                const margin = 6;
                const contentWidth = obj.width - (margin * 2);

                // Draw Name Text (left-aligned)
                context.fillStyle = 'white';
                context.font = 'bold 11px sans-serif';
                context.textAlign = 'left';
                context.textBaseline = 'top';
                const nameStr = '❤️ ' + (targetObj ? targetObj.name : (obj.healthBarTarget || 'Jugador'));
                context.fillText(nameStr, drawX + margin, drawY + margin);

                // Draw Stats Text (right-aligned)
                context.fillStyle = '#cbd5e1';
                context.font = 'bold 11px monospace';
                context.textAlign = 'right';
                const statsStr = Math.round(hp) + '/' + maxHp;
                context.fillText(statsStr, drawX + obj.width - margin, drawY + margin);

                // Draw health bar container
                const barY = drawY + 22;
                const barHeight = 8;
                context.fillStyle = '#020617';
                context.fillRect(drawX + margin, barY, contentWidth, barHeight);

                // Draw filled health bar
                context.fillStyle = barColor;
                context.fillRect(drawX + margin, barY, contentWidth * (hpPercent / 100), barHeight);

                context.restore();
                return;
            }

            if (obj.videoUrl) {
                const video = videoCache.get(obj.videoUrl);
                if (video) {
                    if (video.paused && (obj.videoAutoplay ?? true)) video.play().catch(()=>{});
                    video.loop = obj.videoLoop !== false;
                    video.muted = obj.videoMuted !== false;
                    try { context.drawImage(video, drawX, drawY, obj.width, obj.height); } catch (e) {}
                }
            } else if (obj.imageUrl) {
                const img = imageCache.get(obj.imageUrl);
                if (img?.complete) {
                    const imgRatio = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
                    const boxRatio = obj.width / obj.height;
                    let drawW = obj.width;
                    let drawH = obj.height;
                    let offsetX = 0;
                    let offsetY = 0;
                    
                    if (imgRatio > boxRatio) {
                        drawH = obj.width / imgRatio;
                        offsetY = (obj.height - drawH) / 2;
                    } else {
                        drawW = obj.height * imgRatio;
                        offsetX = (obj.width - drawW) / 2;
                    }
                    context.drawImage(img, drawX + offsetX, drawY + offsetY, drawW, drawH);
                }
            } else if (obj.color !== 'transparent') {
                context.fillStyle = obj.color;
                context.fillRect(drawX, drawY, obj.width, obj.height);
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
                
                context.fillStyle = 'rgba(0,0,0,0.6)';
                context.fillRect(barX, barY, barWidth, barHeight);
                context.fillStyle = hpPercent > 0.5 ? '#22c55e' : (hpPercent > 0.25 ? '#eab308' : '#ef4444');
                context.fillRect(barX, barY, barWidth * hpPercent, barHeight);
            }

            if (obj.text) {
                if (scaleX < 0) context.scale(-1, 1);
                context.fillStyle = obj.textColor || (isUI ? 'white' : (obj.color === 'transparent' ? 'white' : 'black'));
                context.font = "bold " + (obj.fontSize || 16) + "px sans-serif";
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                let newText = obj.text;
                for (const key in gameVariables) newText = newText.replace(new RegExp('\\{' + key + '\\}', 'g'), String(gameVariables[key]));
                if (obj.variables) {
                    obj.variables.forEach(v => {
                        newText = newText.replace(new RegExp('\\{' + v.name + '\\}', 'g'), String(v.value));
                    });
                }
                context.fillText(newText, 0, 0);
            }
            context.restore();
        }

        function loadSceneByName(sceneName, savedState = null) {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            const sceneToLoad = allScenes.find(s => s.name === sceneName);
            if (!sceneToLoad) return;
            if (backgroundMusicPlayer) backgroundMusicPlayer.pause();

            lastTime = 0;
            currentScene = sceneToLoad;
            
            if (savedState) {
                gameObjects = savedState.gameObjects;
                gameVariables = savedState.gameVariables;
                camera = savedState.camera;
                runtimeBackgroundColor = sceneToLoad.backgroundColor;
            } else {
                runtimeBackgroundColor = currentScene.backgroundColor;
                camera.zoom = currentScene.defaultZoom || 1;
                gameObjects = JSON.parse(JSON.stringify(currentScene.gameObjects.map(o => {
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
                    return { ...o, vx: 0, vy: 0, grounded: false, stats };
                })));
                
                // Ensure global variables are initialized if not already present
                (window.projectData.globalVariables || []).forEach(v => {
                    if (gameVariables[v.name] === undefined) gameVariables[v.name] = v.value;
                });

                if(currentScene.backgroundMusicId) {
                    const musicAsset = assets.find(a => a.id === currentScene.backgroundMusicId);
                    if(musicAsset) {
                        const cachedAudio = audioCache.get(musicAsset.url);
                        if (cachedAudio) {
                            backgroundMusicPlayer = cachedAudio.cloneNode();
                            backgroundMusicPlayer.loop = true;
                            backgroundMusicPlayer.play().catch(()=>{});
                            currentBackgroundMusicId = musicAsset.id;
                        }
                    }
                }
                currentScene.events.forEach(e => {
                    const hasOnStart = e.conditions.some(c => c.trigger === 'OnStart');
                    if (hasOnStart) {
                        const otherConditionsMet = e.conditions.filter(c => c.trigger !== 'OnStart').every(c => checkCondition(c, null, null));
                        if (otherConditionsMet) {
                            executeActionsSequential(e.actions, null, false, 0, false, undefined, \`event-\${e.id}\`);
                        }
                    }
                });
                gameObjects.forEach(o => o.scripts?.forEach(s => {
                    if (s.trigger === 'OnStart') {
                        const sId = s.id || s.trigger;
                        executeActionsSequential(s.actions, o, false, 0, false, undefined, \`obj-\${o.id}-script-\${sId}\`);
                    }
                }));
            }
            activeAnimations.clear();
            timers.clear();
            intervals.clear();
            if (dialogueElement) dialogueElement.remove();
            dialogueElement = null;
            setupUI();
            animationFrameId = requestAnimationFrame(gameLoop);
        }
        
        async function startGame(data) {
            canvas.width = data.gameWidth || 1024;
            canvas.height = data.gameHeight || 768;
            allScenes = data.scenes; 
            assets = data.assets; 
            animations = data.animations;
            globalObjects = data.globalObjects || [];
            
            const assetPromises = assets.map(asset => new Promise((resolve) => {
                const timeoutId = setTimeout(() => {
                    console.warn('Asset load timed out: ' + asset.url);
                    resolve();
                }, 1500); // 1.5s timeout per asset to prevent any hang!

                if (asset.type === 'image') {
                    const img = new Image();
                    img.onload = () => { 
                        imageCache.set(asset.url, img); 
                        clearTimeout(timeoutId);
                        resolve(); 
                    };
                    img.onerror = () => { 
                        console.error('Failed to load image: ' + asset.url);
                        clearTimeout(timeoutId);
                        resolve(); 
                    };
                    img.src = asset.url;
                    
                    // Animated GIF support: mount to DOM secretly so browser animates it!
                    if (asset.url.toLowerCase().includes('.gif')) {
                        img.style.position = 'fixed';
                        img.style.left = '-9999px';
                        img.style.top = '0';
                        img.style.width = '1px';
                        img.style.height = '1px';
                        img.style.opacity = '0';
                        img.style.pointerEvents = 'none';
                        document.body.appendChild(img);
                    }
                } else if (asset.type === 'audio') {
                    const audio = new Audio();
                    audio.preload = 'auto';
                    audio.oncanplaythrough = () => { 
                        audioCache.set(asset.url, audio); 
                        clearTimeout(timeoutId);
                        resolve(); 
                    };
                    audio.onerror = () => { 
                        console.error('Failed to load audio: ' + asset.url);
                        clearTimeout(timeoutId);
                        resolve(); 
                    };
                    audio.src = asset.url;
                } else if (asset.type === 'video') {
                    const video = document.createElement('video');
                    video.preload = 'auto';
                    video.oncanplaythrough = () => {
                        video.muted = true; video.playsInline = true;
                        videoCache.set(asset.url, video);
                        clearTimeout(timeoutId);
                        resolve();
                    };
                    video.onerror = () => { 
                        console.error('Failed to load video: ' + asset.url);
                        clearTimeout(timeoutId);
                        resolve(); 
                    };
                    video.src = asset.url; 
                    video.load();
                } else {
                    clearTimeout(timeoutId);
                    resolve();
                }
            }));

            await Promise.allSettled(assetPromises);
            
            const preservedVars = { ...gameVariables };
            (data.globalVariables || []).forEach(v => {
                if (preservedVars[v.name] === undefined) preservedVars[v.name] = v.value;
            });
            gameVariables = preservedVars;
            
            const startingScene = data.scenes.find(s => s.id === data.activeSceneId);
            if(startingScene) {
                loadSceneByName(startingScene.name);
            }
        }

        let frameKeyPresses = [];
        let consoleActive = false;
        
        const showConsole = () => {
            consoleActive = true;
            setupConsoleUI();
        };

        const setupConsoleUI = () => {
             let consoleUI = document.getElementById('engine-console');
             if (!consoleUI) {
                 consoleUI = document.createElement('div');
                 consoleUI.id = 'engine-console';
                 consoleUI.style.position = 'fixed';
                 consoleUI.style.bottom = '20px';
                 consoleUI.style.left = '50%';
                 consoleUI.style.transform = 'translateX(-50%)';
                 consoleUI.style.width = '80%';
                 consoleUI.style.maxWidth = '600px';
                 consoleUI.style.backgroundColor = 'rgba(0,0,0,0.85)';
                 consoleUI.style.padding = '10px';
                 consoleUI.style.borderRadius = '8px';
                 consoleUI.style.zIndex = '2000000';
                 consoleUI.innerHTML = '<input id="console-input" type="text" style="width:100%; background:transparent; border:none; color:white; outline:none; font-family:monospace; font-size:16px;" placeholder="Ingresa comando...">';
                 document.body.appendChild(consoleUI);
                 
                 const input = consoleUI.querySelector('input');
                 input.addEventListener('keydown', (e) => {
                     if (e.key === 'Enter') {
                         const cmd = input.value.trim();
                         if (cmd) frameConsoleCommands.push(cmd);
                         input.value = '';
                         consoleActive = false;
                         consoleUI.style.display = 'none';
                     } else if (e.key === 'Escape') {
                         consoleActive = false;
                         consoleUI.style.display = 'none';
                     }
                     e.stopPropagation();
                 });
             }
             consoleUI.style.display = 'block';
             setTimeout(() => consoleUI.querySelector('input').focus(), 10);
        };

        window.addEventListener('keydown', (e) => { 
            if (e.key === 'Tab') {
                e.preventDefault();
                if (consoleActive) {
                    consoleActive = false;
                    document.getElementById('engine-console').style.display = 'none';
                } else {
                    showConsole();
                }
                return;
            }
            if (consoleActive) return;

            const key = e.key.toLowerCase();
            const code = e.code.toLowerCase();
            if (key === 'e' && activeInteractable) {
                frameInteractions.push({
                    id: activeInteractable.id,
                    name: activeInteractable.name
                });
            }
            if (!keysPressed[key] && !keysPressed[code]) {
                frameKeyPresses.push(key);
                frameKeyPresses.push(code);
            }
            keysPressed[code] = true; 
            keysPressed[key] = true;
        });
        window.addEventListener('keyup', (e) => { 
            keysPressed[e.code.toLowerCase()] = false; 
            keysPressed[e.key.toLowerCase()] = false;
        });
        
        const handlePointerDown = (e) => {
            if (!window.audioContext) {
                try { window.audioContext = new (window.AudioContext || window.webkitAudioContext)(); } catch(err) {}
            }
            if (window.audioContext?.state === 'suspended') window.audioContext.resume();

            if (dialogueElement) { dialogueElement.remove(); dialogueElement = null; frameDialogueEnd = true; return; }

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX, mouseY = (e.clientY - rect.top) * scaleY;
            const objectsById = new Map(gameObjects.map(o => [o.id, o]));
            const worldMouseX = (mouseX / camera.zoom) + camera.x - (canvas.width / (2 * camera.zoom));
            const worldMouseY = (mouseY / camera.zoom) + camera.y - (canvas.height / (2 * camera.zoom));

            const clickedObject = [...gameObjects].sort((a,b)=>b.zIndex-a.zIndex).find(obj => {
                const absPos = getObjectAbsolutePosition(obj.id, objectsById);
                const collisionBox = getCollisionBox({...obj, ...absPos});
                if (obj.isUI) {
                    return mouseX >= absPos.x && mouseX <= absPos.x + obj.width &&
                           mouseY >= absPos.y && mouseY <= absPos.y + obj.height;
                }
                return worldMouseX >= collisionBox.x && worldMouseX <= collisionBox.x + collisionBox.width &&
                       worldMouseY >= collisionBox.y && worldMouseY <= collisionBox.y + collisionBox.height;
            });

            if (clickedObject) {
                frameClicks.push({ name: clickedObject.name, id: clickedObject.id });
                clickedObject.scripts?.forEach(s => {
                    if (s.trigger === 'OnClick') {
                        const sId = s.id || s.trigger;
                        executeActionsSequential(s.actions, clickedObject, true, 0, false, undefined, \`obj-\${clickedObject.id}-script-\${sId}\`);
                    }
                });
                
                if (clickedObject.isDraggable) {
                    const absPos = getObjectAbsolutePosition(clickedObject.id, objectsById);
                    dragging = {
                        objectId: clickedObject.id,
                        isUI: !!clickedObject.isUI,
                        offsetX: (clickedObject.isUI ? mouseX : worldMouseX) - (clickedObject.parentId ? clickedObject.x : absPos.x),
                        offsetY: (clickedObject.isUI ? mouseY : worldMouseY) - (clickedObject.parentId ? clickedObject.y : absPos.y)
                    };
                }
            }
        };

        const handlePointerMove = (e) => {
            if (!dragging) return;
            const targetObj = gameObjects.find(o => o.id === dragging.objectId);
            if (!targetObj) { dragging = null; return; }

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX, mouseY = (e.clientY - rect.top) * scaleY;
            const worldMouseX = (mouseX / camera.zoom) + camera.x - (canvas.width / (2 * camera.zoom));
            const worldMouseY = (mouseY / camera.zoom) + camera.y - (canvas.height / (2 * camera.zoom));

            let newX = dragging.isUI ? mouseX - dragging.offsetX : worldMouseX - dragging.offsetX;
            let newY = dragging.isUI ? mouseY - dragging.offsetY : worldMouseY - dragging.offsetY;

            if (targetObj.dragMinX != null) newX = Math.max(targetObj.dragMinX, newX);
            if (targetObj.dragMaxX != null) newX = Math.min(targetObj.dragMaxX, newX);
            if (targetObj.dragMinY != null) newY = Math.max(targetObj.dragMinY, newY);
            if (targetObj.dragMaxY != null) newY = Math.min(targetObj.dragMaxY, newY);

            if (!targetObj.dragXLocked) targetObj.x = newX;
            if (!targetObj.dragYLocked) targetObj.y = newY;
        };

        const handlePointerUp = () => { dragging = null; };

        canvas.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        
        function setupUI() {
            const uiContainer = document.getElementById('ui-container');
            if (!uiContainer) return;
            uiContainer.innerHTML = '';
            
            const uiControls = gameObjects.filter(o => o.isUI);
            
            const scaleX = uiContainer.clientWidth / (window.projectData.gameWidth || 1024);
            const scaleY = uiContainer.clientHeight / (window.projectData.gameHeight || 768);

            uiControls.forEach(obj => {
                const button = document.createElement('button');
                
                button.style.position = 'absolute';
                button.style.left = (obj.x * scaleX) + 'px';
                button.style.top = (obj.y * scaleY) + 'px';
                button.style.width = (obj.width * scaleX) + 'px';
                button.style.height = (obj.height * scaleY) + 'px';
                button.style.background = obj.imageUrl ? \`url(\${obj.imageUrl})\` : obj.color;
                button.style.backgroundSize = 'contain';
                button.style.backgroundRepeat = 'no-repeat';
                button.style.backgroundPosition = 'center';
                button.style.border = '2px solid rgba(255,255,255,0.3)';
                button.style.borderRadius = '8px';
                button.dataset.action = obj.controlAction || 'none';
                uiContainer.appendChild(button);

                if (obj.controlAction && obj.controlAction !== 'none') {
                    const handlePress = e => { e.preventDefault(); actionsPressed[obj.controlAction] = true; actionsPressed[obj.controlAction + '_ui'] = true; };
                    const handleRelease = e => { e.preventDefault(); actionsPressed[obj.controlAction] = false; actionsPressed[obj.controlAction + '_ui'] = false; };

                    button.addEventListener('mousedown', handlePress);
                    button.addEventListener('mouseup', handleRelease);
                    button.addEventListener('mouseleave', handleRelease);
                    button.addEventListener('touchstart', handlePress, { passive: false });
                    button.addEventListener('touchend', handleRelease, { passive: false });
                }

                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    obj.scripts?.forEach(s => {
                        if (s.trigger === 'OnClick') {
                            const sId = s.id || s.trigger;
                            executeActionsSequential(s.actions, obj, false, 0, false, undefined, \`obj-\${obj.id}-script-\${sId}\`);
                        }
                    });
                });
            });
            
            if (window.projectData.joystick?.enabled) {
                joystickSize = window.projectData.joystick.size || 120;
                const joystickBase = document.createElement('div');
                const joystickHandle = document.createElement('div');
                const handleSize = joystickSize / 2.4;
                
                joystickBase.style.position = 'absolute';
                joystickBase.style.bottom = '40px';
                joystickBase.style[window.projectData.joystick.position || 'left'] = '40px';
                joystickBase.style.width = joystickSize + 'px';
                joystickBase.style.height = joystickSize + 'px';
                joystickBase.style.backgroundColor = window.projectData.joystick.backgroundImageUrl ? 'transparent' : 'rgba(255, 255, 255, ' + (window.projectData.joystick.opacity ?? 0.1) + ')';
                if (window.projectData.joystick.backgroundImageUrl) {
                    joystickBase.style.backgroundImage = 'url(' + window.projectData.joystick.backgroundImageUrl + ')';
                    joystickBase.style.backgroundSize = 'cover';
                    joystickBase.style.backgroundPosition = 'center';
                }
                joystickBase.style.borderRadius = '50%';
                joystickBase.style.pointerEvents = 'auto';
                joystickBase.style.userSelect = 'none';

                joystickHandle.style.position = 'absolute';
                joystickHandle.style.width = handleSize + 'px';
                joystickHandle.style.height = handleSize + 'px';
                joystickHandle.style.backgroundColor = window.projectData.joystick.handleImageUrl ? 'transparent' : 'rgba(255, 255, 255, 0.3)';
                if (window.projectData.joystick.handleImageUrl) {
                    joystickHandle.style.backgroundImage = 'url(' + window.projectData.joystick.handleImageUrl + ')';
                    joystickHandle.style.backgroundSize = 'cover';
                    joystickHandle.style.backgroundPosition = 'center';
                }
                joystickHandle.style.borderRadius = '50%';
                joystickHandle.style.left = 'calc(50% - ' + (handleSize / 2) + 'px)';
                joystickHandle.style.top = 'calc(50% - ' + (handleSize / 2) + 'px)';
                joystickHandle.style.transition = 'transform 50ms linear';

                joystickBase.appendChild(joystickHandle);
                uiContainer.appendChild(joystickBase);
                
                const updateJoystickVisuals = () => {
                    if (joystickState.active) {
                        const x = joystickState.distance * Math.cos(joystickState.angle * Math.PI / 180);
                        const y = joystickState.distance * Math.sin(joystickState.angle * Math.PI / 180);
                        joystickHandle.style.transform = \`translate(\${x}px, \${y}px)\`;
                    } else {
                        joystickHandle.style.transform = 'translate(0, 0)';
                    }
                };

                const updateJoystickState = (touch) => {
                    const rect = joystickBase.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const dx = touch.clientX - centerX;
                    const dy = touch.clientY - centerY;
                    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                    const distance = Math.min(joystickSize / 2, Math.hypot(dx, dy));
                    joystickState = { active: true, angle, distance };
                    updateJoystickVisuals();
                };

                joystickBase.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    const touch = e.changedTouches[0];
                    if (touch) {
                        joystickTouchId = touch.identifier;
                        updateJoystickState(touch);
                    }
                }, { passive: false });

                window.addEventListener('touchmove', (e) => {
                    if (joystickTouchId !== null) {
                        for (let i = 0; i < e.changedTouches.length; i++) {
                            const touch = e.changedTouches[i];
                            if (touch.identifier === joystickTouchId) {
                                e.preventDefault();
                                updateJoystickState(touch);
                                return;
                            }
                        }
                    }
                }, { passive: false });

                window.addEventListener('touchend', (e) => {
                    if (joystickTouchId !== null) {
                         for (let i = 0; i < e.changedTouches.length; i++) {
                            const touch = e.changedTouches[i];
                            if (touch.identifier === joystickTouchId) {
                                e.preventDefault();
                                joystickState = { active: false, angle: 0, distance: 0 };
                                joystickTouchId = null;
                                updateJoystickVisuals();
                                return;
                            }
                        }
                    }
                }, { passive: false });
            }
        }

        window.addEventListener('resize', () => {
             const gameContainer = document.getElementById('game-container');
             const uiContainer = document.getElementById('ui-container');
             const w = gameContainer.clientWidth;
             const h = gameContainer.clientHeight;
             const ratio = (window.projectData.gameWidth || 1024) / (window.projectData.gameHeight || 768);
             
             let newCanvasWidth, newCanvasHeight;
             if (w / h > ratio) {
                newCanvasHeight = h;
                newCanvasWidth = h * ratio;
             } else {
                newCanvasWidth = w;
                newCanvasHeight = w / ratio;
             }
             canvas.style.height = newCanvasHeight + 'px';
             canvas.style.width = newCanvasWidth + 'px';
             uiContainer.style.height = newCanvasHeight + 'px';
             uiContainer.style.width = newCanvasWidth + 'px';
             setupUI();
        });
        
        document.addEventListener('DOMContentLoaded', () => {
            const overlay = document.createElement('div');
            overlay.id = 'start-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0'; overlay.style.left = '0'; overlay.style.width = '100%'; overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
            overlay.style.display = 'flex'; overlay.style.flexDirection = 'column';
            overlay.style.justifyContent = 'center'; overlay.style.alignItems = 'center';
            overlay.style.zIndex = '1000000';
            overlay.style.cursor = 'pointer';
            overlay.innerHTML = '<h1 style="color:white; margin-bottom: 20px;">Return 2D Game</h1><button style="padding: 15px 30px; font-size: 20px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer;">JUGAR</button>';
            document.body.appendChild(overlay);

            overlay.addEventListener('click', () => {
                interactionRequired = false;
                overlay.remove();
                if (!window.audioContext) {
                    try { window.audioContext = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
                }
                if (window.audioContext?.state === 'suspended') window.audioContext.resume();
                
                // Resume background music if any
                if (backgroundMusicPlayer && backgroundMusicPlayer.paused) {
                    backgroundMusicPlayer.play().catch(() => {});
                }

                startGame(window.projectData);
                window.dispatchEvent(new Event('resize'));
            });
        });
    `;

    const imageRenderingStyle = projectData.hdRendering !== false ? 'auto' : 'pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Return 2D Game</title>
    <style>
        body, html { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; background-color: #000; display: flex; justify-content: center; align-items: center; font-family: sans-serif; color: white; }
        #game-container { position: relative; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
        canvas { display: block; image-rendering: ${imageRenderingStyle}; max-width: 100%; max-height: 100%; }
        #ui-container { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
        #ui-container button, #ui-container div { pointer-events: auto; }
    </style>
</head>
<body>
    <div id="game-container">
        <canvas id="gameCanvas"></canvas>
        <div id="ui-container"></div>
    </div>
    <script>
        window.projectData = ${JSON.stringify(projectData || null).replace(/<\/script>/g, '<\\/script>')};
        ${gameEngineScript}
    </script>
</body>
</html>`;
};
