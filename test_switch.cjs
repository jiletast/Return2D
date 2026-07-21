const fs = require('fs');
const acorn = require('acorn');
const code = fs.readFileSync('test_out2.js', 'utf8');

// find the start of the switch block
const switchStart = code.lastIndexOf('switch (cond.trigger)', 41900);
console.log('switch start:', switchStart);
const snippet = 'function foo(cond) { ' + code.substring(switchStart, switchStart + 5000) + ' }';
try {
  acorn.parse(snippet, { ecmaVersion: 2020 });
  console.log("Parsed snippet successfully!");
} catch (e) {
  console.log("Error in snippet:", e.pos);
  console.log(snippet.substring(e.pos - 50, e.pos + 50));
}
