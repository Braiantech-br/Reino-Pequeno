// Loads the game's simulation (no screen) into Node for automated tests.
// require('./load.js')(seed) -> object with every top-level name of the simulation files (read live through getters).
const fs = require('fs');
const SRC = __dirname + '/../src/';
const SIM = ['core', 'ai', 'modes', 'life', 'trade', 'towns', 'diplo', 'army', 'scout', 'econ', 'tactics', 'learn'];
const RESERVED = new Set('break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof new return super switch this throw try typeof var void while with yield let static enum await implements package protected interface private public null true false undefined NaN Infinity'.split(' '));
module.exports = function (seed) {
  let a = (seed || 1) >>> 0;
  Math.random = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const code = SIM.filter(f => fs.existsSync(SRC + f + '.js')).map(f => fs.readFileSync(SRC + f + '.js', 'utf8')).join('\n');
  const names = new Set();
  for (const line of code.split('\n')) {
    let m = line.match(/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/); if (m) names.add(m[1]);
    if (/^(const|let|var)\s/.test(line)) {
      // every NAME= at the top level of the declaration line
      let depth = 0, cur = '', parts = [];
      for (const ch of line.replace(/^(const|let|var)\s+/, '')) { if ('([{'.includes(ch)) depth++; else if (')]}'.includes(ch)) depth--; if (depth === 0 && (ch === ',' || ch === ';')) { parts.push(cur); cur = ''; } else cur += ch; }
      parts.push(cur);
      for (const p of parts) { const n = p.match(/^\s*(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)\s*=/); if (n) names.add(n[1]); }
    }
  }
  const list = [...names].filter(n => !RESERVED.has(n));
  const body = code + '\nreturn {' + list.map(n => `get ${n}(){return ${n}}`).join(',') + '};';
  return new Function(body)();
};
