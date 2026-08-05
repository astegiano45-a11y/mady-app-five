/**
 * Genera los assets PNG de Mady App usando solo APIs nativas de Node.js (Canvas via @napi-rs/canvas).
 * Si no tienes canvas, usa el fallback SVG→PNG con sharp o genera SVG directamente.
 *
 * Uso: node generate_assets.js
 */

const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, 'assets');

// Colores en hex
const C = {
  cream:      '#F5F0E8',
  creamLight: '#FAF7F2',
  gold:       '#C9A84C',
  goldLight:  '#E2C97E',
  goldDark:   '#A67C35',
  black:      '#1A1A1A',
};

// ── SVG helpers ────────────────────────────────────────────────────────────────

function svgIcon(size = 1024) {
  const cx = size / 2, cy = size / 2;
  const r  = size * 0.36;
  const ri = r * 0.76;
  const fs = r * 0.70;
  const cornerR = size * 0.22;
  const pad = size * 0.04;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%"   stop-color="${C.creamLight}"/>
      <stop offset="100%" stop-color="${C.cream}"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.22"/>
    </filter>
  </defs>

  <!-- Fondo redondeado crema -->
  <rect x="${pad}" y="${pad}" width="${size - pad*2}" height="${size - pad*2}"
        rx="${cornerR}" ry="${cornerR}" fill="url(#bgGrad)"/>

  <!-- Grupo ícono (centrado un poco arriba) -->
  <g transform="translate(${cx}, ${cy - size*0.06})">
    <!-- Sombra círculo dorado -->
    <circle cx="0" cy="10" r="${r + 6}" fill="rgba(0,0,0,0.15)"/>
    <!-- Círculo dorado exterior -->
    <circle cx="0" cy="0" r="${r}" fill="${C.gold}" filter="url(#shadow)"/>
    <!-- Círculo crema interior -->
    <circle cx="0" cy="0" r="${ri}" fill="${C.cream}"/>
    <!-- Letra M -->
    <text x="0" y="${fs * 0.36}"
          font-family="Georgia, serif" font-size="${fs}" font-weight="700"
          font-style="italic" fill="${C.gold}" text-anchor="middle"
          dominant-baseline="middle">M</text>
    <!-- Puntos decorativos -->
    <circle cx="-14" cy="${r + 16}" r="5"  fill="${C.goldLight}" opacity="0.7"/>
    <circle cx="0"   cy="${r + 16}" r="7"  fill="${C.gold}"/>
    <circle cx="14"  cy="${r + 16}" r="5"  fill="${C.goldLight}" opacity="0.7"/>
  </g>

  <!-- Texto MADY -->
  <text x="${cx}" y="${cy + size * 0.40}"
        font-family="Georgia, serif" font-size="${size * 0.13}" font-weight="800"
        fill="${C.black}" text-anchor="middle" letter-spacing="${size * 0.016}">MADY</text>
</svg>`;
}

function svgSplash(w = 1284, h = 2778) {
  const cx = w / 2, cy = h / 2;
  const r  = Math.min(w, h) * 0.16;
  const ri = r * 0.76;
  const fs = r * 0.70;
  const iconCY = cy - h * 0.06;
  const titleY = cy + h * 0.14;
  const divY   = titleY + w * 0.20;
  const tagY   = divY + h * 0.055;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%"   stop-color="${C.creamLight}"/>
      <stop offset="100%" stop-color="#EDE8DC"/>
    </linearGradient>
    <filter id="sh">
      <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#000" flood-opacity="0.18"/>
    </filter>
  </defs>

  <!-- Fondo -->
  <rect width="${w}" height="${h}" fill="url(#bg)"/>

  <!-- Esquinas decorativas -->
  <!-- TL -->
  <line x1="0" y1="0" x2="${w*0.1}" y2="0"   stroke="${C.gold}" stroke-width="4" opacity="0.3"/>
  <line x1="0" y1="0" x2="0"   y2="${h*0.045}" stroke="${C.gold}" stroke-width="4" opacity="0.3"/>
  <!-- TR -->
  <line x1="${w}" y1="0" x2="${w - w*0.1}" y2="0"   stroke="${C.gold}" stroke-width="4" opacity="0.3"/>
  <line x1="${w}" y1="0" x2="${w}" y2="${h*0.045}" stroke="${C.gold}" stroke-width="4" opacity="0.3"/>
  <!-- BL -->
  <line x1="0" y1="${h}" x2="${w*0.1}" y2="${h}"   stroke="${C.gold}" stroke-width="4" opacity="0.3"/>
  <line x1="0" y1="${h}" x2="0" y2="${h - h*0.045}" stroke="${C.gold}" stroke-width="4" opacity="0.3"/>
  <!-- BR -->
  <line x1="${w}" y1="${h}" x2="${w - w*0.1}" y2="${h}"   stroke="${C.gold}" stroke-width="4" opacity="0.3"/>
  <line x1="${w}" y1="${h}" x2="${w}" y2="${h - h*0.045}" stroke="${C.gold}" stroke-width="4" opacity="0.3"/>

  <!-- Ícono -->
  <g transform="translate(${cx}, ${iconCY})">
    <circle cx="0" cy="12" r="${r + 8}" fill="rgba(0,0,0,0.10)"/>
    <circle cx="0" cy="0"  r="${r}"     fill="${C.gold}" filter="url(#sh)"/>
    <circle cx="0" cy="0"  r="${ri}"    fill="${C.cream}"/>
    <text x="0" y="${fs * 0.36}"
          font-family="Georgia, serif" font-size="${fs}" font-weight="700"
          font-style="italic" fill="${C.gold}" text-anchor="middle"
          dominant-baseline="middle">M</text>
    <circle cx="-${r*0.12}" cy="${r + r*0.14}" r="${r*0.05}"  fill="${C.goldLight}" opacity="0.7"/>
    <circle cx="0"          cy="${r + r*0.14}" r="${r*0.065}" fill="${C.gold}"/>
    <circle cx="${r*0.12}"  cy="${r + r*0.14}" r="${r*0.05}"  fill="${C.goldLight}" opacity="0.7"/>
  </g>

  <!-- Título MADY -->
  <text x="${cx}" y="${titleY}"
        font-family="Georgia, serif" font-size="${w * 0.16}" font-weight="800"
        fill="${C.black}" text-anchor="middle" letter-spacing="${w * 0.016}">MADY</text>

  <!-- Divisor dorado -->
  <line x1="${cx - w*0.28}" y1="${divY}" x2="${cx + w*0.28}" y2="${divY}"
        stroke="${C.gold}" stroke-width="2" opacity="0.8"/>
  <polygon points="${cx},${divY-12} ${cx+10},${divY} ${cx},${divY+12} ${cx-10},${divY}"
           fill="${C.gold}"/>

  <!-- Tagline -->
  <text x="${cx}" y="${tagY}"
        font-family="Georgia, serif" font-size="${w * 0.052}" font-style="italic"
        fill="${C.goldDark}" text-anchor="middle" letter-spacing="${w*0.004}">Elegancia que te define</text>

  <!-- Subtítulo -->
  <text x="${cx}" y="${tagY + h*0.038}"
        font-family="Arial, sans-serif" font-size="${w * 0.034}"
        fill="${C.black}" text-anchor="middle" opacity="0.45" letter-spacing="${w*0.006}">TU ESTILO · TU ESENCIA</text>

  <!-- Footer -->
  <text x="${cx}" y="${h - h*0.04}"
        font-family="Arial, sans-serif" font-size="${w * 0.030}"
        fill="${C.goldDark}" text-anchor="middle" opacity="0.55" letter-spacing="${w*0.005}">madyapp.com</text>
</svg>`;
}

function svgFavicon(size = 48) {
  const r  = size / 2;
  const ri = r * 0.76;
  const fs = r * 0.70;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${r}" cy="${r}" r="${r}"  fill="${C.gold}"/>
  <circle cx="${r}" cy="${r}" r="${ri}" fill="${C.cream}"/>
  <text x="${r}" y="${r + fs*0.38}"
        font-family="Georgia, serif" font-size="${fs}" font-weight="700"
        font-style="italic" fill="${C.gold}" text-anchor="middle"
        dominant-baseline="middle">M</text>
</svg>`;
}

// ── Escribir archivos ──────────────────────────────────────────────────────────

const files = [
  { name: 'icon.svg',          content: svgIcon(1024),       note: '1024×1024' },
  { name: 'adaptive-icon.svg', content: svgIcon(1024),       note: '1024×1024' },
  { name: 'splash.svg',        content: svgSplash(1284,2778), note: '1284×2778' },
  { name: 'favicon.svg',       content: svgFavicon(48),       note: '48×48' },
];

files.forEach(({ name, content, note }) => {
  fs.writeFileSync(path.join(ASSETS, name), content, 'utf8');
  console.log(`  ✓ assets/${name}  (${note})`);
});

console.log('\n✅ SVGs generados. Expo los puede usar directamente.');
console.log('   Para convertir a PNG, instala: npm i -g sharp-cli');
console.log('   o usa: npx expo-optimize (convierte automáticamente)');
