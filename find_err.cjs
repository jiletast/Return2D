const fs = require('fs');
const acorn = require('acorn');
const code = fs.readFileSync('test_out2.js', 'utf8');

// The code is one huge string.
// If acorn points to 41900, let's check code from 0 to 43000
try {
  acorn.parse(code, { ecmaVersion: 2020 });
} catch (e) {
  console.log("Error at:", e.pos);
  // let's print 50 chars before and after e.pos
  console.log(code.substring(e.pos - 50, e.pos + 50));
}
