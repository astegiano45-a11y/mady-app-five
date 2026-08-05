// Genera favicon.png y icon.png mínimos usando solo Node.js built-ins (zlib + Buffer)
// Sin dependencias externas.
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const t   = Buffer.from(type, 'ascii');
  const len = u32be(data.length);
  const crc = u32be(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

/**
 * Genera un PNG cuadrado de color sólido.
 * @param {number} size  – píxeles (ej. 48)
 * @param {number[]} rgb – [r, g, b]
 * @param {number[]} letterRgb – color letra "M" (opcional, null = sin letra)
 */
function makeSolidPNG(size, rgb, bg) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8]  = 8;  // bit depth
  ihdr[9]  = 2;  // color type = RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Raw image rows: filter byte + RGB per pixel
  const row = Buffer.alloc(1 + size * 3);
  row[0] = 0; // filter none
  for (let x = 0; x < size; x++) {
    row[1 + x * 3]     = rgb[0];
    row[1 + x * 3 + 1] = rgb[1];
    row[1 + x * 3 + 2] = rgb[2];
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  const idat = zlib.deflateSync(raw, { level: 9 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const ASSETS = path.join(__dirname, 'assets');

// favicon.png — 48×48 índigo
fs.writeFileSync(path.join(ASSETS, 'favicon.png'), makeSolidPNG(48, [91, 79, 255]));
console.log('✓ assets/favicon.png  (48×48 índigo)');

// icon.png — 1024×1024 índigo
fs.writeFileSync(path.join(ASSETS, 'icon.png'), makeSolidPNG(1024, [91, 79, 255]));
console.log('✓ assets/icon.png  (1024×1024)');

// adaptive-icon.png — 1024×1024 blanco
fs.writeFileSync(path.join(ASSETS, 'adaptive-icon.png'), makeSolidPNG(1024, [255, 255, 255]));
console.log('✓ assets/adaptive-icon.png  (1024×1024)');

// splash.png — 1284×2778 blanco
fs.writeFileSync(path.join(ASSETS, 'splash.png'), makeSolidPNG(1284, [255, 255, 255]));
console.log('✓ assets/splash.png  (1284×2778)');

console.log('\n✅ PNG assets generados correctamente');
