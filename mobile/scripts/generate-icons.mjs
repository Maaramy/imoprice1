#!/usr/bin/env node
/**
 * Génère les icônes PNG de l'application (aucune dépendance externe :
 * zlib est intégré à Node).
 *
 * Sorties dans mobile/assets/ :
 *  - icon.png              1024×1024 (icône principale, fond dégradé bleu)
 *  - adaptive-icon.png     1024×1024 (avant-plan transparent Android)
 *  - adaptive-icon-bg.png  1024×1024 (fond #1e40af)
 *  - splash-icon.png       1024×1024 (icône blanche pour le splash)
 *  - favicon.png           64×64
 *
 * Usage : node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
mkdirSync(OUT, { recursive: true });

/* ── Encodage PNG minimal ── */
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ── Rendu (supersampling 3× pour des bords lisses) ── */
const SS = 3;

function render(size, painter) {
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          const c = painter(u, v);
          r += c[0]; g += c[1]; b += c[2]; a += c[3];
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      px[i] = Math.round(r / n);
      px[i + 1] = Math.round(g / n);
      px[i + 2] = Math.round(b / n);
      px[i + 3] = Math.round(a / n);
    }
  }
  return px;
}

/* ── Formes géométriques (maison + pièce de monnaie) ── */
function inRoundedRect(u, v, x0, y0, x1, y1, r) {
  if (u < x0 || u > x1 || v < y0 || v > y1) return false;
  const cx = Math.max(x0 + r, Math.min(u, x1 - r));
  const cy = Math.max(y0 + r, Math.min(v, y1 - r));
  const dx = u - cx, dy = v - cy;
  return dx * dx + dy * dy <= r * r || (u >= x0 + r && u <= x1 - r) || (v >= y0 + r && v <= y1 - r);
}

/** Maison : toit triangulaire + corps + porte + cheminée. */
function houseShape(u, v, cx, cy, s) {
  const roofA = { x: cx - s * 0.62, y: cy - s * 0.34 };
  const roofB = { x: cx, y: cy - s * 0.72 };
  const roofC = { x: cx + s * 0.62, y: cy - s * 0.34 };
  // Triangle du toit (barycentrique)
  const d1 = (u - roofC.x) * (roofA.y - roofC.y) - (roofA.x - roofC.x) * (v - roofC.y);
  const d2 = (u - roofA.x) * (roofB.y - roofA.y) - (roofB.x - roofA.x) * (v - roofA.y);
  const d3 = (u - roofB.x) * (roofC.y - roofB.y) - (roofC.x - roofB.x) * (v - roofB.y);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  const inRoof = !(hasNeg && hasPos);
  const inBody = inRoundedRect(u, v, cx - s * 0.46, cy - s * 0.3, cx + s * 0.46, cy + s * 0.62, s * 0.06);
  const inDoor = inRoundedRect(u, v, cx - s * 0.13, cy + s * 0.02, cx + s * 0.13, cy + s * 0.62, s * 0.05);
  return { inRoof, inBody, inDoor };
}

/** Billet/pièce : cercle simple. */
function inCircle(u, v, cx, cy, r) {
  const dx = u - cx, dy = v - cy;
  return dx * dx + dy * dy <= r * r;
}

/* 1) Icone principale : dégradé bleu, coins arrondis, maison blanche. */
const iconGradient = (u, v) => {
  const t = Math.min(Math.max(v, 0), 1);
  const r = 59 + (30 - 59) * t, g = 130 + (16 - 130) * t, b = 246 + (64 - 246) * t; // #3b82f6 → #1e40af
  return [r, g, b, 255];
};

function paintIcon(u, v) {
  const corner = 0.16;
  if (!inRoundedRect(u, v, 0, 0, 1, 1, corner)) return [0, 0, 0, 0];
  const bg = iconGradient(u, v);
  const h = houseShape(u, v, 0.5, 0.54, 0.5);
  if (h.inRoof) return [255, 255, 255, 255];
  if (h.inBody && !h.inDoor) return [255, 255, 255, 255];
  if (h.inDoor) return bg; // porte découpée dans la couleur de fond
  return bg;
}

/* 2) Adaptive icon : maison sur fond transparent (zone sûre centrale). */
function paintAdaptive(u, v) {
  const h = houseShape(u, v, 0.5, 0.5, 0.34);
  if (h.inRoof) return [255, 255, 255, 255];
  if (h.inBody && !h.inDoor) return [255, 255, 255, 255];
  return [0, 0, 0, 0];
}

/* 3) Splash icon : maison + pièce blanche (transparent autour). */
function paintSplash(u, v) {
  const h = houseShape(u, v, 0.44, 0.52, 0.34);
  if (h.inRoof) return [255, 255, 255, 255];
  if (h.inBody && !h.inDoor) return [255, 255, 255, 255];
  if (inCircle(u, v, 0.78, 0.3, 0.09)) return [255, 255, 255, 255];
  return [0, 0, 0, 0];
}

/* 4) Fond adaptatif : bleu uni. */
function paintBg(u, v) {
  return [30, 64, 175, 255];
}

const files = [
  ["icon.png", 1024, paintIcon],
  ["adaptive-icon.png", 1024, paintAdaptive],
  ["adaptive-icon-bg.png", 1024, paintBg],
  ["splash-icon.png", 1024, paintSplash],
  ["favicon.png", 64, paintIcon],
];

for (const [name, size, painter] of files) {
  const px = render(size, painter);
  writeFileSync(join(OUT, name), encodePng(size, size, px));
  console.log(`✓ ${name} (${size}×${size})`);
}
console.log("Icônes générées dans mobile/assets/");
