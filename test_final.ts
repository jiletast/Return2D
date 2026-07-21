import { generateGameHTML } from './services/exportService';
import * as fs from 'fs';
const mockData = {
    settings: { width: 800, height: 600, backgroundColor: '#000', name: 'test' },
    scenes: [{ name: 'Scene 1', objects: [], isOnline: false }],
    assets: [], animations: [], globalObjects: []
};
const html = generateGameHTML(mockData as any);
const jsParts = html.split('<script>');
const gameCode = jsParts[jsParts.length - 1].split('</script>')[0];
fs.writeFileSync('test_final_out.cjs', gameCode);
console.log("Written test_final_out.cjs");
