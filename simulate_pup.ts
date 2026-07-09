import puppeteer from 'puppeteer';
import { generateGameHTML } from './services/exportService.js';
import fs from 'fs';

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

const htmlCode = generateGameHTML(mockProjectData as any);
fs.writeFileSync('temp_index.html', htmlCode);

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', (err as Error).message));
    
    await page.goto(`file://${process.cwd()}/temp_index.html`);
    await new Promise(r => setTimeout(r, 1000));
    
    // Check if canvas exists
    const canvasExists = await page.evaluate(() => !!document.querySelector('canvas'));
    console.log('Canvas exists?', canvasExists);
    
    await browser.close();
})();
