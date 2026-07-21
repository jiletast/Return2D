import { generateGameHTML } from './services/exportService';
import * as fs from 'fs';
const mockData = {
    settings: {
        width: 800,
        height: 600,
        backgroundColor: '#000',
        name: 'test'
    },
    scenes: [],
    assets: [],
    animations: [],
    globalObjects: []
};
const html = generateGameHTML(mockData as any);
fs.writeFileSync('test_out.html', html);
