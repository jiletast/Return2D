const fs = require('fs');
const acorn = require('acorn');
const code = fs.readFileSync('test_out2.js', 'utf8');
try {
  acorn.parse(code.substring(0, 41740), { ecmaVersion: 2020 });
} catch(e) {
  console.log(e);
}
