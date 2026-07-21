const fs = require('fs');
const acorn = require('acorn');
const html = fs.readFileSync('test_out.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const code = scriptMatch[1];
try {
    acorn.parse(code, { ecmaVersion: 2020 });
    console.log("Acorn: parsed successfully!");
} catch (e) {
    console.log("Acorn error details:");
    console.log(e);
    console.log("---- SURROUNDING CODE ----");
    console.log(code.substring(e.pos - 150, e.pos + 150));
    console.log("--------------------------");
}
