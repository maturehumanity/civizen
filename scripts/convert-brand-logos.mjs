/**
 * Convert approved Civizen logo PNGs (primary lockup + icon-only) into
 * transparent brand assets under public/brand/.
 *
 * Sources:
 *   docs/04-operations/dev/brand-source/civizen-icon-source.png
 *   docs/04-operations/dev/brand-source/civizen-lockup-source.png
 *
 * Usage: node scripts/convert-brand-logos.mjs
 * Then:  npm run icons:generate
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_ICON = path.join(ROOT, 'docs/04-operations/dev/brand-source/civizen-icon-source.png');
const SRC_LOCK = path.join(ROOT, 'docs/04-operations/dev/brand-source/civizen-lockup-source.png');
const OUT = path.join(ROOT, 'public/brand');

function svgWrap(dataUrl, w, h, label = 'Civizen') {
  const b64 = dataUrl.split(',')[1];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img" aria-label="${label}">\n  <title>${label}</title>\n  <image href="data:image/png;base64,${b64}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>\n</svg>\n`;
}

async function writeDataUrl(filePath, dataUrl) {
  await fs.writeFile(filePath, Buffer.from(dataUrl.split(',')[1], 'base64'));
}

const browser = await chromium.launch();
const page = await browser.newPage();

async function transparentSquare(srcPath, size = 1024, whiteThresh = 246) {
  const b64 = (await fs.readFile(srcPath)).toString('base64');
  return page.evaluate(async ({ b64, size, whiteThresh }) => {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = `data:image/png;base64,${b64}`;
    });
    const c0 = document.createElement('canvas');
    c0.width = img.naturalWidth;
    c0.height = img.naturalHeight;
    const x0 = c0.getContext('2d');
    x0.drawImage(img, 0, 0);
    const d0 = x0.getImageData(0, 0, c0.width, c0.height);
    let minX = c0.width;
    let minY = c0.height;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < c0.height; y++) {
      for (let x = 0; x < c0.width; x++) {
        const i = (y * c0.width + x) * 4;
        const r = d0.data[i];
        const g = d0.data[i + 1];
        const b = d0.data[i + 2];
        const a = d0.data[i + 3];
        if (a > 10 && !(r > whiteThresh && g > whiteThresh && b > whiteThresh)) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const side = Math.max(bw, bh);
    const cx = Math.floor((minX + maxX) / 2);
    const cy = Math.floor((minY + maxY) / 2);
    let sx = Math.floor(cx - side / 2);
    let sy = Math.floor(cy - side / 2);
    sx = Math.max(0, Math.min(sx, c0.width - side));
    sy = Math.max(0, Math.min(sy, c0.height - side));
    const actualSide = Math.min(side, c0.width - sx, c0.height - sy);
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, actualSide, actualSide, 0, 0, size, size);
    const id = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < id.data.length; i += 4) {
      const r = id.data[i];
      const g = id.data[i + 1];
      const b = id.data[i + 2];
      if (r > whiteThresh && g > whiteThresh && b > whiteThresh) id.data[i + 3] = 0;
    }
    ctx.putImageData(id, 0, 0);
    return c.toDataURL('image/png');
  }, { b64, size, whiteThresh });
}

async function transparentLockup(srcPath, maxW = 1600, whiteThresh = 246) {
  const b64 = (await fs.readFile(srcPath)).toString('base64');
  return page.evaluate(async ({ b64, maxW, whiteThresh }) => {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = `data:image/png;base64,${b64}`;
    });
    const c0 = document.createElement('canvas');
    c0.width = img.naturalWidth;
    c0.height = img.naturalHeight;
    const x0 = c0.getContext('2d');
    x0.drawImage(img, 0, 0);
    const d0 = x0.getImageData(0, 0, c0.width, c0.height);
    let minX = c0.width;
    let minY = c0.height;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < c0.height; y++) {
      for (let x = 0; x < c0.width; x++) {
        const i = (y * c0.width + x) * 4;
        const r = d0.data[i];
        const g = d0.data[i + 1];
        const b = d0.data[i + 2];
        const a = d0.data[i + 3];
        if (a > 10 && !(r > whiteThresh && g > whiteThresh && b > whiteThresh)) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    const pad = 4;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(c0.width - 1, maxX + pad);
    maxY = Math.min(c0.height - 1, maxY + pad);
    const tw = maxX - minX + 1;
    const th = maxY - minY + 1;
    const scale = Math.min(4, maxW / tw);
    const w = Math.round(tw * scale);
    const h = Math.round(th * scale);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, minX, minY, tw, th, 0, 0, w, h);
    const id = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < id.data.length; i += 4) {
      const r = id.data[i];
      const g = id.data[i + 1];
      const b = id.data[i + 2];
      if (r > whiteThresh && g > whiteThresh && b > whiteThresh) id.data[i + 3] = 0;
    }
    ctx.putImageData(id, 0, 0);
    return { dataUrl: c.toDataURL('image/png'), w, h };
  }, { b64, maxW, whiteThresh });
}

async function liftForDark(dataUrl) {
  return page.evaluate(async (dataUrl) => {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < id.data.length; i += 4) {
      if (id.data[i + 3] < 8) continue;
      const r = id.data[i];
      const g = id.data[i + 1];
      const b = id.data[i + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const isPaleBlueGray = lum > 175 && b >= r - 5 && Math.abs(r - g) < 35;
      if (isPaleBlueGray) {
        id.data[i] = Math.min(255, Math.round(r * 0.35 + 155));
        id.data[i + 1] = Math.min(255, Math.round(g * 0.35 + 175));
        id.data[i + 2] = Math.min(255, Math.round(b * 0.25 + 205));
        id.data[i + 3] = Math.min(255, Math.round(id.data[i + 3] * 0.95 + 20));
      }
    }
    ctx.putImageData(id, 0, 0);
    return c.toDataURL('image/png');
  }, dataUrl);
}

async function makeTile(dataUrl, bg, inset = 0.14) {
  return page.evaluate(async ({ dataUrl, bg, inset }) => {
    const size = 1024;
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    const r = size * 0.22;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(size, 0, size, size, r);
    ctx.arcTo(size, size, 0, size, r);
    ctx.arcTo(0, size, 0, 0, r);
    ctx.arcTo(0, 0, size, 0, r);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, size, size);
    for (const [s, col] of bg) g.addColorStop(s, col);
    ctx.fillStyle = g;
    ctx.fill();
    const m = size * inset;
    ctx.drawImage(img, m, m, size - 2 * m, size - 2 * m);
    return c.toDataURL('image/png');
  }, { dataUrl, bg, inset });
}

async function resize(dataUrl, size) {
  return page.evaluate(async ({ dataUrl, size }) => {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, size, size);
    return c.toDataURL('image/png');
  }, { dataUrl, size });
}

await fs.mkdir(OUT, { recursive: true });

const mark = await transparentSquare(SRC_ICON, 1024);
const markDark = await liftForDark(mark);
const lock = await transparentLockup(SRC_LOCK, 1600);
const lockDark = await liftForDark(lock.dataUrl);
const tileDark = await makeTile(markDark, [
  [0, '#0B1F3A'],
  [0.55, '#0A1628'],
  [1, '#071018'],
]);
const tileLight = await makeTile(mark, [
  [0, '#F8FAFC'],
  [1, '#EEF6F5'],
]);
const mark256 = await resize(mark, 256);
const markDark256 = await resize(markDark, 256);

// Keep masters in brand-source (not public/) to avoid huge web deploys.
const SRC_OUT = path.join(ROOT, 'docs/04-operations/dev/brand-source');
await fs.mkdir(SRC_OUT, { recursive: true });
await writeDataUrl(path.join(SRC_OUT, 'master-mark.png'), mark);
await writeDataUrl(path.join(SRC_OUT, 'master-mark-dark.png'), markDark);

const lockWeb = await page.evaluate(async (dataUrl) => {
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const maxW = 800;
  const scale = Math.min(1, maxW / img.naturalWidth);
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  return { dataUrl: c.toDataURL('image/png'), w, h };
}, lock.dataUrl);
const lockDarkWeb = await page.evaluate(async ({ dataUrl, w, h }) => {
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/png');
}, { dataUrl: lockDark, w: lockWeb.w, h: lockWeb.h });

const tileDark512 = await resize(tileDark, 512);
const tileLight512 = await resize(tileLight, 512);

await writeDataUrl(path.join(OUT, 'civizen-mark-256.png'), mark256);
await writeDataUrl(path.join(OUT, 'civizen-mark-dark-256.png'), markDark256);
await writeDataUrl(path.join(OUT, 'civizen-lockup.png'), lockWeb.dataUrl);
await writeDataUrl(path.join(OUT, 'civizen-lockup-dark.png'), lockDarkWeb);
await writeDataUrl(path.join(OUT, 'civizen-icon-full.png'), tileDark512);
await writeDataUrl(path.join(OUT, 'civizen-icon-light.png'), tileLight512);

await fs.writeFile(path.join(OUT, 'civizen-mark.svg'), svgWrap(mark256, 256, 256), 'utf8');
await fs.writeFile(path.join(OUT, 'civizen-mark-dark.svg'), svgWrap(markDark256, 256, 256), 'utf8');
await fs.writeFile(path.join(OUT, 'civizen-lockup.svg'), svgWrap(lockWeb.dataUrl, lockWeb.w, lockWeb.h), 'utf8');
await fs.writeFile(path.join(OUT, 'civizen-lockup-dark.svg'), svgWrap(lockDarkWeb, lockWeb.w, lockWeb.h), 'utf8');
await fs.writeFile(path.join(OUT, 'civizen-icon-full.svg'), svgWrap(tileDark512, 512, 512), 'utf8');
await fs.writeFile(path.join(OUT, 'civizen-icon-light.svg'), svgWrap(tileLight512, 512, 512), 'utf8');
await fs.copyFile(path.join(OUT, 'civizen-icon-full.svg'), path.join(ROOT, 'public/favicon.svg'));

await browser.close();
console.log('Brand assets converted from approved PNG sources.');
