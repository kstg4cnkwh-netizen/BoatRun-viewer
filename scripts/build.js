const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const OUT_DIR = 'dist';
const SKIP = new Set(['.git', '.github', 'node_modules', 'dist', 'scripts', 'package.json', 'package-lock.json']);

const OBF_OPTIONS = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  splitStrings: true,
  splitStringsChunkLength: 10,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  numbersToExpressions: true
};

function obfuscate(code) {
  return JavaScriptObfuscator.obfuscate(code, OBF_OPTIONS).getObfuscatedCode();
}

const SCRIPT_RE = /<script((?:[^>]*))>([\s\S]*?)<\/script>/gi;

function processHtml(content) {
  return content.replace(SCRIPT_RE, (full, attrs, code) => {
    if (/\bsrc\s*=/i.test(attrs)) return full;
    if (!code.trim()) return full;
    return `<script${attrs}>${obfuscate(code)}</script>`;
  });
}

function walk(srcDir, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const srcPath = path.join(srcDir, entry.name);
    const outPath = path.join(outDir, entry.name);
    if (entry.isDirectory()) {
      walk(srcPath, outPath);
    } else if (entry.name.toLowerCase().endsWith('.html')) {
      const html = fs.readFileSync(srcPath, 'utf8');
      fs.writeFileSync(outPath, processHtml(html));
    } else if (entry.name.toLowerCase().endsWith('.js')) {
      const js = fs.readFileSync(srcPath, 'utf8');
      fs.writeFileSync(outPath, obfuscate(js));
    } else {
      fs.copyFileSync(srcPath, outPath);
    }
  }
}

walk('.', OUT_DIR);
console.log('Build done -> ' + OUT_DIR);
