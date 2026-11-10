// ─────────────────────────────────────────────────────────────────────────────
//  mapTrackScript — dibuja el recorrido de avistamientos en un mapa Leaflet
//  (etapa 3, docs/plan-avistamientos.md).
//
//  Es un STRING de JavaScript (ES5) porque lo usan las dos versiones del mapa:
//   - LeafletMap.web.js lo ejecuta una vez en la página (installTrackScript).
//   - LeafletMap.js (iOS/Android) lo embebe en el HTML del WebView.
//  En nativo no se puede pasar una función compilada: Hermes no conserva el
//  código fuente, así que Function.prototype.toString() no sirve.
//
//  Define window.__madyTrack = { css, draw(L, map, track, opts) }.
//  draw() devuelve un L.layerGroup ya agregado al mapa (para poder sacarlo).
//  track: salida de buildTrack() en src/utils/track.js.
//
//  Todo texto que viene de la base (nombre, nota, lugar) se escapa: la nota la
//  escribe cualquier persona y va dentro del HTML del popup.
// ─────────────────────────────────────────────────────────────────────────────

const CSS = `
.mady-trk-dot{width:24px;height:24px;border-radius:50%;background:#fff;border:3px solid #DC2626;
  color:#B91C1C;font:800 11px/18px -apple-system,BlinkMacSystemFont,sans-serif;text-align:center;
  box-shadow:0 2px 6px rgba(0,0,0,.3)}
.mady-trk-lost{width:26px;height:26px;border-radius:50%;background:#111827;border:3px solid #fff;
  color:#fff;font-size:13px;line-height:20px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.35)}
.mady-trk-last{position:relative;width:60px;height:60px}
.mady-trk-last .ring{position:absolute;inset:-8px;border-radius:50%;border:3px solid #DC2626;
  animation:madyPulse 1.6s ease-out infinite}
.mady-trk-last .face{position:absolute;inset:0;border-radius:50%;overflow:hidden;background:#DC2626;
  border:4px solid #fff;box-shadow:0 4px 14px rgba(220,38,38,.55);display:flex;align-items:center;
  justify-content:center;font-size:26px}
.mady-trk-last .face img{width:100%;height:100%;object-fit:cover}
@keyframes madyPulse{0%{transform:scale(.85);opacity:.9}100%{transform:scale(1.35);opacity:0}}
@media (prefers-reduced-motion: reduce){.mady-trk-last .ring{animation:none;opacity:.6}}
.mady-trk-tip{background:#DC2626;color:#fff;border:none;border-radius:999px;padding:4px 10px;
  font:700 12px -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.mady-trk-tip:before{display:none}
.mady-trk-pop{min-width:190px;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
.mady-trk-pop img{display:block;width:100%;max-height:160px;object-fit:cover;border-radius:8px;margin-bottom:8px}
.mady-trk-pop b{display:block;font-size:13px;color:#111827;margin-bottom:2px}
.mady-trk-pop .t{font-size:12px;color:#6B7280}
.mady-trk-pop .n{font-size:12px;color:#374151;font-style:italic;margin-top:4px}
`;

export const TRACK_SCRIPT = `
(function(){
  if (window.__madyTrack) return;
  function esc(s){ return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function safeUrl(u){ return (typeof u === 'string' && /^https:\\/\\//.test(u)) ? esc(u) : null; }

  function popupHtml(p, petName){
    var img = safeUrl(p.photo);
    var title = p.isLast ? 'Último avistamiento' : ('Avistamiento ' + p.n);
    return '<div class="mady-trk-pop">' +
      (img ? '<img src="' + img + '" alt="Foto del avistamiento de ' + esc(petName) + '">' : '') +
      '<b>' + esc(title) + ' · ' + esc(p.timeLabel) + '</b>' +
      '<div class="t">' + esc(p.placeLabel) + '</div>' +
      (p.note ? '<div class="n">“' + esc(p.note) + '”</div>' : '') +
      '</div>';
  }

  function draw(L, map, track, opts){
    opts = opts || {};
    var group = L.layerGroup().addTo(map);
    if (!track || !track.points || !track.points.length) return group;
    var pts = track.points;
    var latlngs = pts.map(function(p){ return [p.lat, p.lng]; });

    if (latlngs.length > 1) {
      // Halo blanco debajo para que la línea se lea sobre cualquier fondo
      L.polyline(latlngs, { color:'#fff', weight:8, opacity:.9, interactive:false }).addTo(group);
      L.polyline(latlngs, { color:'#DC2626', weight:4, opacity:.9, dashArray: null, interactive:false }).addTo(group);
    }

    pts.forEach(function(p){
      var icon, z = 500;
      if (p.kind === 'lost') {
        icon = L.divIcon({ className:'', html:'<div class="mady-trk-lost" title="Dónde se perdió">⚑</div>',
          iconSize:[26,26], iconAnchor:[13,13] });
        L.marker([p.lat,p.lng], { icon:icon, zIndexOffset:z, keyboard:false })
          .bindTooltip(esc(p.label), { direction:'top', offset:[0,-12] })
          .addTo(group);
        return;
      }
      if (p.isLast) {
        var img = safeUrl(p.photo);
        icon = L.divIcon({ className:'',
          html:'<div class="mady-trk-last"><div class="ring"></div><div class="face">' +
               (img ? '<img src="' + img + '" alt="">' : '👀') + '</div></div>',
          iconSize:[60,60], iconAnchor:[30,30] });
        z = 2000;
      } else {
        icon = L.divIcon({ className:'', html:'<div class="mady-trk-dot">' + esc(p.n) + '</div>',
          iconSize:[24,24], iconAnchor:[12,12] });
        z = 1000 + p.n;
      }
      var m = L.marker([p.lat,p.lng], { icon:icon, zIndexOffset:z,
        title: (p.isLast ? 'Último avistamiento' : 'Avistamiento ' + p.n) + ', ' + p.timeLabel })
        .bindPopup(popupHtml(p, track.petName), { maxWidth: 240 })
        .addTo(group);
      if (p.isLast) {
        m.bindTooltip('Último avistamiento · ' + esc(p.timeLabel),
          { permanent:true, direction:'top', offset:[0,-34], className:'mady-trk-tip' });
      }
    });

    // Mostrar todo el recorrido. opts.padding: [arriba, derecha, abajo, izquierda]
    // en px, para que no quede tapado por la tarjeta de la mascota.
    var pad = opts.padding || [40,40,40,40];
    if (latlngs.length === 1) {
      map.setView(latlngs[0], Math.max(map.getZoom(), 15));
    } else {
      map.fitBounds(L.latLngBounds(latlngs), {
        paddingTopLeft: [pad[3], pad[0]], paddingBottomRight: [pad[1], pad[2]], maxZoom: 17,
      });
    }
    return group;
  }

  window.__madyTrack = { css: ${JSON.stringify(CSS)}, draw: draw };
})();
`;

export const TRACK_CSS = CSS;
