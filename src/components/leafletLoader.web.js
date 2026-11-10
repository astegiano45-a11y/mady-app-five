// Carga Leaflet (CSS + JS desde cdnjs) una sola vez por página.
// Lo usan LeafletMap.web.js y LocationPicker.web.js.

export const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
export const LEAFLET_JS  = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';

export function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (window.L) { resolve(); return; }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = src; s.async = false;
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

export function loadStyle(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = href;
  document.head.appendChild(l);
}

export async function loadLeaflet() {
  loadStyle(LEAFLET_CSS);
  await loadScript(LEAFLET_JS);
  return window.L;
}
