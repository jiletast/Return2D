const fs = require('fs');
const code = fs.readFileSync('test_out2.js', 'utf8');
let q = null;
let escapes = false;
let startIdx = -1;
for(let i=0; i<code.length; i++) {
    if (escapes) { escapes = false; continue; }
    if (code[i] === '\\') { escapes = true; continue; }
    if (q === null) {
        if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
            q = code[i];
            startIdx = i;
        }
    } else if (code[i] === q) {
        q = null;
    }
}
console.log('Unclosed quote:', q, 'at index:', startIdx);
console.log(code.substring(startIdx - 50, startIdx + 50));
