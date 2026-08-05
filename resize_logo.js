// ─────────────────────────────────────────────────────────────────────────────
//  resize_logo.js — Copia mady_logo.png a todos los assets requeridos por Expo
//  Uso: node resize_logo.js
//  Requiere: node >= 18  (o instala sharp: npm i sharp)
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');

const SRC    = path.join(__dirname, 'assets', 'mady_logo.png');
const ASSETS = path.join(__dirname, 'assets');

if (!fs.existsSync(SRC)) {
  console.error('❌  No encontré assets/mady_logo.png');
  console.error('    Guarda la imagen del logo en esa ruta y vuelve a correr.');
  process.exit(1);
}

// ── Intentar con sharp (si está instalado) ────────────────────────────────────
async function withSharp() {
  let sharp;
  try { sharp = require('sharp'); } catch { return false; }

  const SIZES = [
    { name: 'icon.png',          w: 1024, h: 1024, bg: { r:255,g:255,b:255,alpha:1 } },
    { name: 'adaptive-icon.png', w: 1024, h: 1024, bg: { r:255,g:255,b:255,alpha:1 } },
    { name: 'splash.png',        w: 1284, h: 2778, bg: { r:255,g:255,b:255,alpha:1 } },
    { name: 'favicon.png',       w:   48, h:   48, bg: { r:255,g:255,b:255,alpha:1 } },
  ];

  for (const s of SIZES) {
    const fit = s.name === 'splash.png' ? 'contain' : 'cover';
    await sharp(SRC)
      .resize(s.w, s.h, { fit, background: s.bg })
      .png()
      .toFile(path.join(ASSETS, s.name));
    console.log(`  ✓  ${s.name}  (${s.w}×${s.h})`);
  }
  return true;
}

// ── Fallback: copiar el original a todos los targets (sin redimensionar) ───────
function withCopy() {
  const TARGETS = ['icon.png', 'adaptive-icon.png', 'favicon.png', 'splash.png'];
  for (const t of TARGETS) {
    fs.copyFileSync(SRC, path.join(ASSETS, t));
    console.log(`  ✓  ${t}  (copia directa — instala sharp para redimensionar)`);
  }
}

(async () => {
  console.log('🐾  Instalando logo Mady...\n');
  const ok = await withSharp();
  if (!ok) {
    console.log('ℹ️   sharp no encontrado → copiando sin redimensionar');
    console.log('    Para tamaños exactos: npm install sharp && node resize_logo.js\n');
    withCopy();
  }
  console.log('\n✅  Listo. Recarga la app: npx expo start --web --clear');
})();
