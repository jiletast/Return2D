import { generateGameHTML } from './services/exportService';
import * as esprima from 'esprima';
const mockData = {
    settings: { width: 800, height: 600, backgroundColor: '#000', name: 'test' },
    scenes: [], assets: [], animations: [], globalObjects: []
};
const html = generateGameHTML(mockData as any);
const jsParts = html.split('<script>');
const gameCode = jsParts[jsParts.length - 1].split('</script>')[0];
try {
    esprima.parseScript(gameCode, { loc: true });
} catch (e: any) {
    console.log(e.lineNumber);
    console.log(e.index);
    console.log(e.description);
    console.log('CODE AT ERROR:', gameCode.substring(e.index - 50, e.index + 50));
}
