// ─────────────────────────────────────────────────────────────────────────────
//  LocationPicker (iOS/Android) — misma interfaz que LocationPicker.web.js,
//  con Leaflet dentro de un WebView. Etapa 4 de docs/plan-avistamientos.md.
//
//  value:    { lat, lng } elegido (o null)
//  center:   { lat, lng } dónde arrancar si todavía no hay value
//  onChange: ({ lat, lng }) => void
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

function buildHtml(start, zoom) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>*{margin:0;padding:0}html,body,#map{width:100%;height:100%}</style>
</head><body><div id="map"></div><script>
  var map = L.map('map', { attributionControl:false }).setView([${start.lat}, ${start.lng}], ${zoom});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  var icon = L.divIcon({ className:'', iconSize:[34,44], iconAnchor:[17,44], html:
    '<div style="display:flex;flex-direction:column;align-items:center"><div style="width:34px;height:34px;border-radius:50%;background:#111827;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.35);color:#fff;font-size:16px;line-height:28px;text-align:center">⚑</div><div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid #111827;margin-top:-1px"></div></div>' });
  var marker = L.marker([${start.lat}, ${start.lng}], { icon: icon, draggable: true, autoPan: true }).addTo(map);
  function emit(ll){ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ action:'pick', lat: ll.lat, lng: ll.lng })); }
  marker.on('dragend', function(){ emit(marker.getLatLng()); });
  map.on('click', function(e){ marker.setLatLng(e.latlng); emit(e.latlng); });
  window.__setPoint = function(lat, lng, zoom){ marker.setLatLng([lat, lng]); map.setView([lat, lng], zoom || Math.max(map.getZoom(), 16)); };
</script></body></html>`;
}

export default function LocationPicker({ value, center, onChange, height = 220, style }) {
  const webviewRef = useRef(null);
  // El HTML se arma una sola vez: los cambios posteriores se inyectan
  const html = useMemo(() => {
    const start = value || center || { lat: -53.7873, lng: -67.7100 };
    return buildHtml(start, value ? 16 : 15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inject = useCallback((p, zoom) => {
    webviewRef.current?.injectJavaScript(`window.__setPoint && window.__setPoint(${p.lat}, ${p.lng}, ${zoom || 0}); true;`);
  }, []);

  useEffect(() => { if (value) inject(value); }, [value?.lat, value?.lng, inject]);
  useEffect(() => { if (!value && center) inject(center, 15); }, [center?.lat, center?.lng, inject]);

  const onMessage = useCallback((e) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.action === 'pick') onChange?.({ lat: msg.lat, lng: msg.lng });
    } catch {}
  }, [onChange]);

  const WebView = require('react-native-webview').WebView;
  return (
    <View style={[s.wrap, { height }, style]}>
      <WebView
        ref={webviewRef}
        source={{ html }}
        onMessage={onMessage}
        javaScriptEnabled
        originWhitelist={['*']}
        style={{ flex: 1, backgroundColor: '#EEF2F7' }}
        // Que arrastrar el pin no haga scroll de la pantalla
        nestedScrollEnabled
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: '#EEF2F7' },
});
