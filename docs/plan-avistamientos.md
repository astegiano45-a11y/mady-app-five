# Plan: avistamientos y recorrido en el mapa

La función principal de Mady es la siguiente. Cuando se pierde una mascota, el dueño marca
dónde se perdió. Cada persona que la ve saca una foto desde la app, y ese avistamiento se
guarda con la ubicación GPS exacta y la hora. En el mapa, al tocar la mascota, se ven todos
sus avistamientos unidos por una línea en orden de tiempo, con el último destacado.

La prueba en vivo del 9/11/2026 (alerta "PRUEBA – borrar", ya eliminada) mostró qué falta.
Este plan lo resuelve en etapas, con **un PR por etapa**. Cada rama sale de la anterior, así
que se revisan y se mergean en orden.

> **Migraciones SQL:** este repo no aplica las migraciones solo. Cada etapa que toca la base
> trae su archivo en `supabase/`, y hay que ejecutarlo en el SQL Editor de Supabase **antes** de
> publicar esa etapa. El código de cada etapa tolera que la migración todavía no esté aplicada,
> salvo donde se indica lo contrario.

---

## Etapa 1: hora corrida y texto del lugar del avistamiento

**Problema**
- `sightings.created_at` es `timestamp` **sin** zona horaria. Supabase guarda la hora UTC, pero
  el navegador la lee como hora local (UTC−3). Por eso un avistamiento nuevo dice "recién"
  durante 3 horas, y después muestra 3 horas menos de las reales. Medido: −180 min.
- El texto de cada avistamiento es siempre `Visto cerca de <zona de la alerta>`. Usa la zona
  que eligió el dueño, no el lugar donde realmente la vieron.

**Solución**
- Migración `supabase/sightings_timestamptz.sql`: pasa `created_at` a `timestamptz`, tomando
  como UTC los valores existentes. Verificado: un avistamiento cargado a las 01:55:19 UTC quedó
  guardado como `01:55:19`.
- En el cliente, `parseDbDate()` trata como UTC las fechas que vienen sin zona. Así la hora se
  muestra bien desde el primer deploy, incluso antes de correr la migración, y también con los
  datos viejos.
- El texto del lugar se calcula **al mostrarlo**, a partir del lat/lng del avistamiento: la zona
  más cercana y la distancia al punto donde se perdió (por ejemplo, "Cerca de Chacra II · a 1,2 km
  de donde se perdió"). Así se corrigen también los avistamientos viejos.
- Los avistamientos nuevos ya no guardan el texto inventado en `description`. Ese campo queda
  para una nota de quien la vio (por ejemplo, "iba hacia la costanera").

**Cómo se prueba**
- `node scripts/check-sightings-utils.mjs` verifica las fechas con y sin zona, la zona más
  cercana y las distancias.
- En la web, un avistamiento recién cargado dice "recién", y a los minutos "hace N min", sin el
  desfase de 3 horas.

---

## Etapa 2: foto con cámara en "Lo vi aquí"

**Problema:** "Lo vi aquí" guarda solo la ubicación. No hay ninguna foto, y `sightings` no tiene
columna para guardarla.

**Solución**
- Migración: `sightings.photo_url text`.
- "Lo vi aquí" abre la cámara (`expo-image-picker` → `launchCameraAsync`; en la web abre la
  cámara del celular, o el selector de archivos en la computadora). Antes de guardar se muestra
  una vista previa con la opción de agregar una nota.
- El GPS se toma **en el momento de la foto**, no cuando la persona aprieta "Enviar".
- La foto se sube a `mascotas/avistamientos/<alerta_id>/<timestamp>.jpg`, el mismo bucket que ya
  usan los reportes.
- La foto es obligatoria. Si alguien no da permiso de cámara, puede elegir una foto de la galería.
- En la lista de avistamientos de la tarjeta se ve una miniatura de cada foto.

**Requiere la migración antes de publicar.** Sin la columna, el insert falla.

---

## Etapa 3: avistamientos en el mapa unidos por una línea

**Problema:** el mapa no dibuja los avistamientos. Solo existen como texto en la tarjeta.

**Solución**
- `LeafletMap` (web y nativo) recibe un recorrido (`track`): el punto donde se perdió, más los
  avistamientos ordenados por hora, **del más viejo al más nuevo**.
- El recorrido se dibuja con una polilínea, con los avistamientos intermedios como puntos chicos
  numerados.
- El **último avistamiento** se destaca: marcador grande con su foto, un anillo animado y la
  etiqueta "Último avistamiento · hace X". Al tocar un punto se ve su foto, la hora y el lugar.
- Al seleccionar una mascota, el mapa se ajusta para mostrar todo el recorrido, y al cerrar la
  tarjeta se limpia.
- Se respeta "reducir movimiento": sin anillo animado.

---

## Etapa 4: marcar en el mapa dónde se perdió

**Problema:** la alerta guarda el GPS de donde está el dueño **al reportar**, que puede ser su
casa y no el lugar donde se perdió.

**Solución**
- En "Perdí mi mascota" se agrega el paso "¿Dónde se perdió?": un mapa con un pin que se puede
  arrastrar (o tocar el mapa para moverlo). Arranca en la ubicación actual, o en el centro de la
  zona elegida.
- Se guarda ese punto en `alertas.lat/lng`. La zona se sugiere sola según el punto, y se puede
  cambiar.
- Este punto es el inicio del recorrido de la etapa 3.

---

## Etapa 5: la alerta nueva aparece sin recargar

**Problema:** el mapa carga las alertas una sola vez, al montarse. Una alerta recién reportada no
aparece hasta recargar la página, aunque la pantalla de éxito diga "ya aparece en el mapa en
tiempo real".

**Solución**
- Volver a cargar las alertas cada vez que la pantalla del mapa toma foco.
- Suscripción en tiempo real a los cambios de `alertas` (`suscribirAlertas()` ya existe en
  `alertasService.js` y nadie la usa). Las altas se agregan, y las resueltas salen del mapa.
- Lo mismo para `sightings` de la mascota seleccionada: un avistamiento nuevo extiende la línea
  sin recargar.
- Migración: agregar `alertas` y `sightings` a la publicación `supabase_realtime`, si no están.

---

## Después: zona de búsqueda

Con los últimos avistamientos, dibujar un área probable (por ejemplo, un círculo o polígono
alrededor de los últimos 2 o 3 puntos, que crece con el tiempo desde el último avistamiento),
para que los vecinos sepan dónde buscar. Se diseña cuando las etapas 1 a 5 estén en producción.

---

## Pendientes fuera de estas etapas

- El nombre de la ubicación del encabezado del mapa dice "Ubicación desconocida" en la web
  (`reverseGeocode` de expo-location no funciona en el navegador).
- Para llegar a "Lo vi aquí" hacen falta dos toques: el globo del pin y después la tarjeta.
- En la computadora, la tarjeta tapa casi todo el mapa, y el botón "+ Reportar" queda encima.
- El GPS se pide con `Accuracy.Balanced` (unos 100 m). Para avistamientos convendría `High`
  (se evalúa en la etapa 2).
