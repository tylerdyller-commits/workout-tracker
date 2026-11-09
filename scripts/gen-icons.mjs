// Generates the app icons (a dark dumbbell on the orange accent) as PNGs in
// public/. No dependencies: rasterizes a few rounded rectangles and encodes the
// PNG with Node's zlib. Run with `npm run icons`.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0xff, 0x6a, 0x3d];
const FG = [0x0e, 0x0f, 0x11];

// Dumbbell shapes in a unit square: [x0, y0, x1, y1, cornerRadius]
const SHAPES = [
  [0.24, 0.465, 0.76, 0.535, 0.02], // bar
  [0.28, 0.3, 0.36, 0.7, 0.03], // inner plates
  [0.64, 0.3, 0.72, 0.7, 0.03],
  [0.2, 0.37, 0.27, 0.63, 0.025], // outer plates
  [0.73, 0.37, 0.8, 0.63, 0.025],
];

function inRoundRect(x, y, [x0, y0, x1, y1, r]) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function render(size, scale) {
  const SS = 4; // supersampling for anti-aliasing
  const rgb = Buffer.alloc(size * size * 3);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          // map to unit square, then shrink around the center by `scale`
          const u = ((px + (sx + 0.5) / SS) / size - 0.5) / scale + 0.5;
          const v = ((py + (sy + 0.5) / SS) / size - 0.5) / scale + 0.5;
          if (SHAPES.some((s) => inRoundRect(u, v, s))) hits++;
        }
      }
      const a = hits / (SS * SS);
      const o = (py * size + px) * 3;
      for (let c = 0; c < 3; c++) rgb[o + c] = Math.round(BG[c] * (1 - a) + FG[c] * a);
    }
  }
  return rgb;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(size, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outputs = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.75], // keep inside the maskable safe zone
  ['apple-touch-icon.png', 180, 1],
];
for (const [name, size, scale] of outputs) {
  writeFileSync(
    new URL(`../public/${name}`, import.meta.url),
    encodePng(size, render(size, scale)),
  );
  console.log(`wrote public/${name}`);
}
