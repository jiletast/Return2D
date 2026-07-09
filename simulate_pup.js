"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
const exportService_js_1 = require("./services/exportService.js");
const fs_1 = __importDefault(require("fs"));
const mockProjectData = {
    scenes: [{
            id: 'scene-1',
            name: 'Scene 1',
            backgroundColor: '#000000',
            gravityY: 1000,
            gameObjects: [{
                    id: 1, name: 'obj1', x: 0, y: 0, width: 10, height: 10,
                    behaviors: [{ name: 'TopDownRPGMovement', properties: { speed: 10 } }]
                }],
            events: []
        }],
    activeSceneId: 'scene-1',
    assets: [],
    animations: [],
    globalObjects: [],
    globalVariables: [],
    hdRendering: true
};
const htmlCode = (0, exportService_js_1.generateGameHTML)(mockProjectData);
fs_1.default.writeFileSync('temp_index.html', htmlCode);
(async () => {
    const browser = await puppeteer_1.default.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    await page.goto(`file://${process.cwd()}/temp_index.html`);
    await new Promise(r => setTimeout(r, 1000));
    // Check if canvas exists
    const canvasExists = await page.evaluate(() => !!document.querySelector('canvas'));
    console.log('Canvas exists?', canvasExists);
    await browser.close();
})();
