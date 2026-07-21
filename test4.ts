import { generateGameHTML } from './services/exportService';
const mockData = {
    settings: { width: 800, height: 600, backgroundColor: '#000', name: 'test' },
    scenes: [], assets: [], animations: [], globalObjects: []
};
const html = generateGameHTML(mockData as any);
const jsParts = html.split('<script>');
const gameCode = jsParts[jsParts.length - 1].split('</script>')[0];
const sub = gameCode.substring(41800, 41900);
console.log(sub);
