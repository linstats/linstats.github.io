import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const dataUrl = (name, base = root) => {
  const mime = { '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' }[path.extname(name)];
  if (!mime) throw new Error(`Unsupported asset: ${name}`);
  return `data:${mime};base64,${fs.readFileSync(path.resolve(base, name)).toString('base64')}`;
};
let html = read('index.html');
const scripts = [];
html = html.replace(/<script defer src="([^"]+)"><\/script>/g, (_, source) => {
  scripts.push(read(source.split('?')[0]).replace(/<\/script/gi, '<\\/script'));
  return '';
});
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, source) => {
  const name = source.split('?')[0];
  const css = read(name).replace(/url\(([^)]+)\)/g, (_, asset) => {
    const name = asset.replace(/["']/g, '').trim();
    if (name.startsWith('data:') || name.startsWith('#')) return `url(${asset})`;
    return `url("${dataUrl(name, path.dirname(path.join(root, source.split('?')[0])))}")`;
  });
  return `<style>${css}</style>`;
});
html = html.replace(/(<(?:img|link)\b[^>]*\b(?:src|href)=")assets\/([^"?]+)(")/g,
  (_, before, name, after) => `${before}${dataUrl(`assets/${name}`)}${after}`);
// Inline scripts run after the document exists, preserving the original defer order.
html = html.replace('</body>', scripts.map(script => `<script>${script}</script>`).join('\n') + '</body>');
const output = path.join(root, 'dsa3361-tutorial-4-standalone.html');
fs.writeFileSync(output, html);
if (/<(?:script|img)\b[^>]*\bsrc="(?!data:)|<link\b[^>]*\bhref="(?!data:)/i.test(html)) {
  throw new Error('Standalone output still contains external assets');
}
console.log(`Built ${output} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`);
