import { generateGameHTML } from './services/exportService';
import * as fs from 'fs';
const mockData = {
    settings: { width: 800, height: 600, backgroundColor: '#000', name: 'test' },
    scenes: [], assets: [], animations: [], globalObjects: []
};
const html = generateGameHTML(mockData as any);
const jsParts = html.split('<script>');
// the last part is our game code
const gameCode = jsParts[jsParts.length - 1].split('</script>')[0];
fs.writeFileSync('test_out2.js', gameCode);
