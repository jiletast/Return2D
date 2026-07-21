const fs = require('fs');
const acorn = require('acorn');
const code = fs.readFileSync('test_out2.js', 'utf8');

const funcStart = code.lastIndexOf('const checkCondition =', 41900);
let braceCount = 0;
let funcEnd = -1;
let started = false;
for(let i = funcStart; i < code.length; i++) {
  if(code[i] === '{') { braceCount++; started = true; }
  if(code[i] === '}') { braceCount--; }
  if(started && braceCount === 0) { funcEnd = i + 1; break; }
}
const snippet = code.substring(funcStart, funcEnd);
try {
  acorn.parse(snippet, { ecmaVersion: 2020 });
  console.log("Parsed snippet successfully!");
} catch (e) {
  console.log("Error in snippet:", e.pos);
  console.log(snippet.substring(e.pos - 50, e.pos + 50));
}
