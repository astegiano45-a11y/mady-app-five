// ─────────────────────────────────────────────────────────────────────────────
//  LocationPicker (web) — mapa chico con un pin que se arrastra, o se mueve
//  tocando el mapa. Etapa 4 de docs/plan-avistamientos.md: "¿Dónde se perdió?".
//
//  value:    { lat, lng } elegido (o null)
//  center:   { lat, lng } dónde arrancar si todavía no hay value
//  onChange: ({ lat, lng }) => void
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { loadLeaflet } from './leafletLoader.web';

const PIN_HTML =
  '<div style="display:flex;flex-direction:column;align-items:center">' +
  '<div style="width:34px;height:34px;border-radius:50%;background:#111827;border:3px solid #fff;' +
  'box-shadow:0 3px 10px rgba(0,0,0,.35);color:#fff;font-size:16px;line-height:28px;text-align:center">⚑</div>' +
  '<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;' +
  'border-top:9px solid #111827;margin-top:-1px"></div></div>';

export default function LocationPicker({ value, center, onChange, height = 220, style }) {
  const divRef    = useRef(null);
  const mapRef    = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Crear el mapa una sola vez
  useEffect(() => {
    let alive = true;
    (async () => {
      const L = await loadLeaflet();
      if (!alive || !divRef.current || !L) return;
      const start = value || center || { lat: -53.7873, lng: -67.7100 };
      const map = L.map(divRef.current, { attributionControl: false, zoomControl: true })
        .setView([start.lat, start.lng], value ? 16 : 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      const icon = L.divIcon({ html: PIN_HTML, className: '', iconSize: [34, 44], iconAnchor: [17, 44] });
      const marker = L.marker([start.lat, start.lng], {
        icon, draggable: true, autoPan: true, title: 'Dónde se perdió (arrastrá para mover)',
      }).addTo(map);

      const emit = (ll) => onChangeRef.current?.({ lat: ll.lat, lng: ll.lng });
      marker.on('dragend', () => emit(marker.getLatLng()));
      map.on('click', (e) => { marker.setLatLng(e.latlng); emit(e.latlng); });

      mapRef.current = map;
      markerRef.current = marker;
      // El contenedor puede haberse medido después del primer render
      setTimeout(() => map.invalidateSize(), 0);
    })().catch((err) => console.warn('LocationPicker init error:', err));

    return () => {
      alive = false;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // value cambió desde afuera (ej. "Usar mi ubicación"): mover pin y centrar
  useEffect(() => {
    const map = mapRef.current, marker = markerRef.current;
    if (!map || !marker || !value) return;
    const cur = marker.getLatLng();
    if (Math.abs(cur.lat - value.lat) > 1e-7 || Math.abs(cur.lng - value.lng) > 1e-7) {
      marker.setLatLng([value.lat, value.lng]);
      map.setView([value.lat, value.lng], Math.max(map.getZoom(), 16));
    }
  }, [value?.lat, value?.lng]);

  // Sin punto elegido todavía: seguir al centro sugerido (ej. la zona elegida)
  useEffect(() => {
    const map = mapRef.current, marker = markerRef.current;
    if (!map || !marker || value || !center) return;
    marker.setLatLng([center.lat, center.lng]);
    map.setView([center.lat, center.lng], 15);
  }, [center?.lat, center?.lng]);

  return (
    <View style={[s.wrap, { height }, style]}>
      <div ref={divRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: '#EEF2F7' },
});
