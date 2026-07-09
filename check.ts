import fs from 'fs';
import { generateGameHTML } from './services/exportService';

const mockData = {
    scenes: [], assets: [], animations: [], globalObjects: [], hdRendering: true
};

try {
    const html = generateGameHTML(mockData as any);
    const scriptMatch = html.match(/<script>\s*window.projectData[\s\S]*?;([\s\S]*?)<\/script>/);
    if (scriptMatch) {
        fs.writeFileSync('temp_script.js', scriptMatch[1]);
        console.log('Extracted script.');
    }
} catch (e) {
    console.error(e);
}
