import { generateGameHTML } from './services/exportService';
import { JSDOM } from 'jsdom';
const mockData = {
    settings: { width: 800, height: 600, backgroundColor: '#000', name: 'test' },
    scenes: [{ name: 'Scene 1', objects: [], isOnline: false }],
    assets: [], animations: [], globalObjects: []
};
const html = generateGameHTML(mockData as any);
const dom = new JSDOM(html, { runScripts: "dangerously" });
dom.window.addEventListener('error', (e) => {
    console.error("DOM ERROR:", e.error);
});
console.log("JSDOM initialized.");
