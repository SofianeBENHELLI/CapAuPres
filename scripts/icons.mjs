// Génère les icônes PNG à partir de app/icons/icon.svg (nécessite Playwright).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
import { readFileSync } from 'node:fs';
const svg = readFileSync(new URL('../app/icons/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch();
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>body{margin:0}</style>${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}`);
  await page.screenshot({ path: new URL(`../app/icons/icon-${size}.png`, import.meta.url).pathname, omitBackground: true });
}
await browser.close();
