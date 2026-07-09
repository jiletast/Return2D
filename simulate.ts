import fs from 'fs';
import { JSDOM } from 'jsdom';
import { generateGameHTML } from './services/exportService.js';

const mockProjectData = {
    scenes: [{
        id: 'scene-1',
        name: 'Scene 1',
        backgroundColor: '#000000',
        gravityY: 1000,
        gameObjects: [],
        events: []
    }],
    activeSceneId: 'scene-1',
    assets: [],
    animations: [],
    globalObjects: [],
    globalVariables: [],
    hdRendering: true
};

const htmlCode = generateGameHTML(mockProjectData as any).replace('const ctx = canvas.getContext(\'2d\');', 'const ctx = canvas.getContext(\'2d\') || { setTransform: ()=>{}, clearRect: ()=>{}, save: ()=>{}, restore: ()=>{}, beginPath: ()=>{}, rect: ()=>{}, fill: ()=>{}, drawImage: ()=>{}, arc: ()=>{}, fillText: ()=>{}, measureText: ()=>({width:10}), stroke:()=>{}, fillRect:()=>{}, translate: ()=>{}, scale: ()=>{}, rotate: ()=>{} };');

const dom = new JSDOM(htmlCode, { runScripts: "dangerously" });
const window = dom.window;

window.onerror = function(message, source, lineno, colno, error) {
    console.error("JSDOM Error:", message, lineno, error);
};

window.console.log = function(...args) {
    console.log("JSDOM LOG:", ...args);
};

window.console.error = function(...args) {
    console.error("JSDOM ERROR:", ...args);
};

window.requestAnimationFrame = function(callback) {
    return setTimeout(callback, 16);
};

window.cancelAnimationFrame = function(id) {
    clearTimeout(id);
};

// Simulate DOMContentLoaded
setTimeout(() => {
    // Click the start button
    const overlay = window.document.getElementById('start-overlay');
    if (overlay) {
        overlay.click();
    }
}, 500);

