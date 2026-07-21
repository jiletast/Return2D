const fs = require('fs');
const acorn = require('acorn');
const code = fs.readFileSync('test_out2.js', 'utf8');

const switchStart = code.lastIndexOf('switch (cond.trigger)', 41900);
// let's grab until "case 'CompareStat':"
const switchEnd = code.indexOf("case 'CompareStat':", switchStart) + 2000;
const snippet = 'function foo(cond) { ' + code.substring(switchStart, switchEnd) + ' }';
try {
  acorn.parse(snippet, { ecmaVersion: 2020 });
  console.log("Parsed snippet successfully!");
} catch (e) {
  console.log("Error in snippet:", e.pos);
  console.log(snippet.substring(e.pos - 50, e.pos + 50));
}
