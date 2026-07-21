const fs = require('fs');
const { runInNewContext } = require('vm');
const code = fs.readFileSync('test_out2.js', 'utf8');
try {
  runInNewContext(code, {});
} catch (e) {
  console.log(e.stack);
}
