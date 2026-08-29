// ─────────────────────────────────────────────────────────────────────────────
//  HomeScreen v6 — Fase 1
//  Hero emocional · AlertCard Airbnb · Paleta reducida
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, Animated, Pressable, Image, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient }    from 'expo-linear-gradient';
import { Asset }             from 'expo-asset';
import {
  Bell, Search, Heart, Home as HomeIcon,
  AlertTriangle, ChevronRight, MapPin,
} from 'lucide-react-native';

import { useAuth }              from '../context/AuthContext';
import { MOCK_PETS }           from '../data/mockData';
import { getAlertasNearby, suscribirAlertas } from '../services/alertasService';
import { getMisMascotas }      from '../services/mascotasService';
import { supabase }            from '../lib/supabase';
import { C }                   from '../theme/colors';
import { R, S, SH }  from '../theme/spacing';
import { T }         from '../theme/typography';
import GlassCard     from '../components/GlassCard';
import AlertCard     from '../components/AlertCard';
import BannerCarousel from '../components/BannerCarousel';
import MadyButton    from '../components/MadyButton';
import OrganicBackdrop from '../components/OrganicBackdrop';
import { useIsDesktop } from '../hooks/useIsDesktop';

// ── Assets hero carousel ─────────────────────────────────────────────────────
const HERO_SLIDES = [
  require('../../assets/mady-perrita-1.jpg'),
  require('../../assets/mady-perrita-2.jpg'),
];
const HERO_INTERVAL = 10000;   // 10 s por foto
const HERO_FADE_MS  = 800;     // 800 ms crossfade

// ── Mock data ─────────────────────────────────────────────────────────────────
const NEARBY = [
  { id:'n1', name:'Mady',   type:'lost',     zone:'Barrio Centro',  time:'2 h',    dist:'0.8 km',
    photo:'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=600&q=90' },
  { id:'n2', name:'Canelo', type:'found',    zone:'Margen Sur',     time:'30 min', dist:'1.2 km',
    photo:'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=90' },
  { id:'n3', name:'Nieve',  type:'adoption', zone:'Chacra XI',      time:'1 día',  dist:'2.4 km',
    photo:'https://images.unsplash.com/photo-1583511655826-05700d52f4d9?w=600&q=90' },
  { id:'n4', name:'Bruno',  type:'lost',     zone:'Villa del Mar',  time:'5 h',    dist:'3.1 km',
    photo:'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&q=90' },
];

const ACTIVITY = [
  { id:'a1', avatar:'https://i.pravatar.cc/80?img=47', text:'María encontró un perrito', sub:'Margen Sur · 20 min', dot: C.found  },
  { id:'a2', avatar:'https://i.pravatar.cc/80?img=12', text:'Lucas reportó a "Café"',    sub:'Centro · 45 min',    dot: C.lost   },
  { id:'a3', avatar:'https://i.pravatar.cc/80?img=33', text:'Refugio Patagonia busca tránsito', sub:'Hace 1 h',    dot: C.teal   },
  { id:'a4', avatar:'https://i.pravatar.cc/80?img=22', text:'Ana vio a Mady en Chacra II', sub:'Hace 3 h',         dot: C.teal   },
];

function formatTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 60) return `${diff} min`;
  if (diff < 1440) return `${Math.floor(diff / 60)} h`;
  return `${Math.floor(diff / 1440)} días`;
}

// ── Acciones rápidas — solo teal / coral / verde / rojo ──────────────────────
const ACTIONS = [
  { key:'lost',   label:'Perdidos',    Icon: Search,        bg: C.lostBg,    color: C.lost,  screen:'Mapa'       },
  { key:'found',  label:'Encontrados', Icon: Heart,         bg: C.foundBg,   color: C.found, screen:'Encontrados'},
  { key:'adopt',  label:'Adopción',    Icon: HomeIcon,      bg: C.tealLight, color: C.teal,  screen:'Adopcion'   },
  { key:'report', label:'Reportero',   Icon: AlertTriangle, bg: C.coralLight,color: C.coral, screen:'Reportar'   },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Sub-componentes
// ─────────────────────────────────────────────────────────────────────────────

function QuickAction({ item, onPress, isDesktop }) {
  const scale = useRef(new Animated.Value(1)).current;
  const { Icon } = item;
  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 80 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 80 }).start()}
      onPress={onPress}
      style={{ flex: 1, flexBasis: 0 }}
    >
      <Animated.View
        style={[qa.card, isDesktop && qa.cardDesktop, { backgroundColor: item.bg, borderColor: item.color + '40', transform: [{ scale }] }]}
      >
        <View style={[qa.iconWrap, isDesktop && qa.iconWrapDesktop, { backgroundColor: item.color + '20' }]}>
          <Icon size={20} color={item.color} strokeWidth={1.75} />
        </View>
        <Text style={[qa.label, isDesktop && qa.labelDesktop, { color: item.color }]}>{item.label}</Text>
      </Animated.View>
    </Pressable>
  );
}
const qa = StyleSheet.create({
  // Compactas a propósito (ver imagen de referencia): círculo de ícono chico,
  // padding mínimo, sin aire de sobra arriba/abajo del ícono + texto.
  // Contorno tenue en el color de la categoría — mismo tratamiento que las
  // cards de stats (cohesión) y hace que "Adopción" no se funda con el panel.
  card:    { alignItems:'center', paddingVertical: S[10], paddingHorizontal: S[8], borderRadius: R.xl, gap: S[6], borderWidth: 1 },
  iconWrap:{ width:40, height:40, borderRadius: R.lg, alignItems:'center', justifyContent:'center' },
  label:   { fontSize: 11, fontWeight:'700', textAlign:'center' },
  // Desktop: mismo tamaño compacto que mobile — solo el cap de ancho de
  // actionsGridDesktop evita que queden franjas finitas.
  cardDesktop:     { paddingVertical: S[10], paddingHorizontal: S[10], gap: S[6] },
  iconWrapDesktop: { width: 40, height: 40, borderRadius: R.lg },
  labelDesktop:    { fontSize: 12 },
});

function ActivityRow({ item, onPress }) {
  return (
    <TouchableOpacity style={ar.row} onPress={onPress} activeOpacity={0.8}>
      <View style={ar.avatarWrap}>
        <Image source={{ uri: item.avatar }} style={ar.avatar} />
        <View style={[ar.dot, { backgroundColor: item.dot }]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ar.text} numberOfLines={1}>{item.text}</Text>
        <Text style={ar.sub}>{item.sub}</Text>
      </View>
      <ChevronRight size={15} color={C.inkMuted} strokeWidth={1.75} />
    </TouchableOpacity>
  );
}
const ar = StyleSheet.create({
  row:       { flexDirection:'row', alignItems:'center', gap: S[12], paddingVertical: S[13],
               borderBottomWidth:1, borderBottomColor: C.borderLight },
  avatarWrap:{ position:'relative' },
  avatar:    { width:40, height:40, borderRadius:20 },
  dot:       { position:'absolute', bottom:0, right:0, width:11, height:11, borderRadius:6,
               borderWidth:2, borderColor: C.white },
  text:      { fontSize: T.sm, fontWeight:'600', color: C.ink, marginBottom:2 },
  sub:       { fontSize: T.xs, color: C.inkMuted },
});

function MyPetRow({ pet, onPress }) {
  const ST = {
    home:  { label:'En casa',    color: C.found  },
    lost:  { label:'Perdido',    color: C.lost   },
    found: { label:'Encontrado', color: C.teal   },
  };
  const st = ST[pet.status] || ST.home;
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue:0.97, useNativeDriver:true, speed:80 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue:1,   useNativeDriver:true, speed:80 }).start()}
      onPress={onPress}
    >
      <Animated.View style={[ps.row, { transform:[{ scale }] }]}>
        <View style={[ps.avatar, { backgroundColor: st.color + '15' }]}>
          {pet.photo_url
            ? <Image source={{ uri: pet.photo_url }} style={{ width: 44, height: 44, borderRadius: 22 }} resizeMode="cover" />
            : <Text style={{ fontSize: 24 }}>{pet.emoji || '🐾'}</Text>
          }
          <View style={[ps.dot, { backgroundColor: st.color }]} />
        </View>
        <View style={{ flex:1 }}>
          <Text style={ps.name}>{pet.name}</Text>
          <Text style={ps.breed}>{pet.breed} · {pet.age}</Text>
        </View>
        <View style={[ps.pill, { backgroundColor: st.color + '14', borderColor: st.color + '38' }]}>
          <Text style={[ps.pillTxt, { color: st.color }]}>{st.label}</Text>
        </View>
        <ChevronRight size={15} color={C.inkMuted} strokeWidth={1.75} />
      </Animated.View>
    </Pressable>
  );
}
const ps = StyleSheet.create({
  row:   { flexDirection:'row', alignItems:'center', gap: S[12], backgroundColor: C.white,
           borderRadius: R.xl, padding: S[14], marginBottom: S[8], borderWidth:1, borderColor: C.border, ...SH.xs },
  avatar:{ width:48, height:48, borderRadius: R.lg, alignItems:'center', justifyContent:'center', position:'relative' },
  dot:   { position:'absolute', bottom:1, right:1, width:10, height:10, borderRadius: R.full, borderWidth:2, borderColor: C.white },
  name:  { fontSize: T.sm, fontWeight:'700', color: C.ink },
  breed: { fontSize: T.xs, color: C.inkMuted, marginTop:2 },
  pill:  { paddingHorizontal: S[10], paddingVertical:3, borderRadius: R.full, borderWidth:1 },
  pillTxt:{ fontSize:10, fontWeight:'700' },
});

function SectionHead({ title, action, onAction }) {
  return (
    <View style={sx.head}>
      <Text style={sx.title}>{title}</Text>
      {onAction && <TouchableOpacity onPress={onAction}><Text style={sx.action}>{action || 'Ver todo →'}</Text></TouchableOpacity>}
    </View>
  );
}
const sx = StyleSheet.create({
  head:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: S[14] },
  title: { fontSize: T.base, fontWeight:'700', color: C.ink },
  action:{ fontSize: T.xs, fontWeight:'700', color: C.teal },
});

// ─────────────────────────────────────────────────────────────────────────────
//  HeroImageLayer — una capa de foto del hero
//
//  El <Image> de React Native (también en web) solo soporta resizeMode
//  (cover/contain/…), no un punto de foco/posición como el object-position
//  de CSS — cualquier estilo objectPosition que se le pase se ignora en
//  silencio y siempre recorta centrado 50/50. Por eso "el perro se veía
//  cortado" pasara lo que pasara con esos estilos.
//  En web se resuelve con un <View> con backgroundImage/backgroundPosition
//  propios (bypassea el <Image>), así se puede subir el foco de recorte y
//  dejar de cortarle la cabeza/orejas al perro. En nativo no hace falta:
//  ahí sí se usa el <Image> normal (el recorte real ocurre solo en desktop
//  web, donde la card es mucho más panorámica que la foto original).
// ─────────────────────────────────────────────────────────────────────────────
function HeroImageLayer({ source, opacity }) {
  if (Platform.OS === 'web') {
    const uri = Asset.fromModule(source)?.uri;
    return (
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            opacity,
            backgroundImage: `url(${uri})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 10%',
            backgroundRepeat: 'no-repeat',
          },
        ]}
      />
    );
  }
  return (
    <Animated.Image
      source={source}
      style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%', opacity }]}
      resizeMode="cover"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  HeroCarousel — Crossfade automático entre HERO_SLIDES
//  Texto fijo · solo la foto cambia · 10s · fade 800ms
// ─────────────────────────────────────────────────────────────────────────────
function HeroCarousel({ onPressAlerts, onPressReport, isDesktop }) {
  // Dos capas de imagen: la que "sale" (fadeOut) y la que "entra" (fadeIn)
  const [topIdx, setTopIdx]   = useState(0);           // imagen visible ahora
  const [nextIdx, setNextIdx] = useState(1);           // imagen que va a entrar
  const topOpacity  = useRef(new Animated.Value(1)).current;
  const nextOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      // Crossfade: la capa "next" sube a 1 mientras "top" baja a 0
      Animated.parallel([
        Animated.timing(nextOpacity, {
          toValue: 1,
          duration: HERO_FADE_MS,
          useNativeDriver: true,
        }),
        Animated.timing(topOpacity, {
          toValue: 0,
          duration: HERO_FADE_MS,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Al terminar: la capa "next" se convierte en "top"
        const newTop  = nextIdx;
        const newNext = (nextIdx + 1) % HERO_SLIDES.length;
        setTopIdx(newTop);
        setNextIdx(newNext);
        // Resetea opacidades sin animación para el siguiente ciclo
        topOpacity.setValue(1);
        nextOpacity.setValue(0);
      });
    }, HERO_INTERVAL);

    return () => clearInterval(timer);
  }, [nextIdx]);   // se reinicia cuando cambia nextIdx

  return (
    <TouchableOpacity
      style={[s.heroCard, isDesktop ? s.heroCardDesktop : s.heroCardMobile]}
      onPress={onPressAlerts}
      activeOpacity={0.97}
    >
      {/* ── Capa TOP (foto actual) ────────────────────────────────────────── */}
      <HeroImageLayer source={HERO_SLIDES[topIdx]} opacity={topOpacity} />

      {/* ── Capa NEXT (foto entrante) ─────────────────────────────────────── */}
      <HeroImageLayer source={HERO_SLIDES[nextIdx]} opacity={nextOpacity} />

      {/* ── Degradé teal — siempre encima de las fotos ───────────────────── */}
      <LinearGradient
        colors={[
          'transparent',
          'rgba(8,154,151,0.28)',
          'rgba(4,100,98,0.70)',
          'rgba(2,68,66,0.91)',
        ]}
        locations={[0.20, 0.52, 0.78, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* ── Badge EN VIVO ─────────────────────────────────────────────────── */}
      <View style={s.liveBadge} pointerEvents="none">
        <View style={s.liveDot} />
        <Text style={s.liveTxt}>EN VIVO</Text>
      </View>

      {/* ── Contenido (siempre fijo) ──────────────────────────────────────── */}
      <View style={s.heroBody} pointerEvents="box-none">
        <Text style={s.heroEyebrow}>Río Grande · Tierra del Fuego</Text>
        <Text style={s.heroTitle}>Mady está{'\n'}cerca tuyo.</Text>
        <Text style={s.heroSub}>2 alertas activas en tu zona</Text>

        <View style={s.heroRow}>
          <TouchableOpacity style={s.heroCTA} onPress={onPressAlerts}>
            <Text style={s.heroCTATxt}>Ver alertas →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.heroSecondary} onPress={onPressReport}>
            <Text style={s.heroSecondaryTxt}>Reportar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const insets    = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const { currentUser } = useAuth();
  const firstName = (currentUser?.user_metadata?.name || currentUser?.name || 'Amigo').split(' ')[0];

  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(28)).current;

  const [alertas,   setAlertas]   = useState(NEARBY);
  const [mascotas,  setMascotas]  = useState(MOCK_PETS);
  const [actividad, setActividad] = useState(ACTIVITY);
  const [loadingDB, setLoadingDB] = useState(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue:1, duration:580, useNativeDriver:true }),
      Animated.timing(slide, { toValue:0, duration:500, useNativeDriver:true }),
    ]).start();

    // Cargar datos reales
    (async () => {
      try {
        const [dbAlertas, dbMascotas] = await Promise.all([
          getAlertasNearby(),
          getMisMascotas(),
        ]);
        if (dbAlertas.length > 0) {
          setAlertas(dbAlertas.map(a => ({
            id: a.id, name: a.name, type: a.type,
            zone: a.zone, time: formatTime(a.created_at),
            dist: '', photo: a.photo_url,
          })));
        }
        if (dbMascotas.length > 0) setMascotas(dbMascotas);

        // Actividad real: últimos posts de comunidad
        const { data: posts } = await supabase
          .from('posts').select('id, content, category, created_at, user_id').order('created_at', { ascending: false }).limit(5);
        if (posts && posts.length > 0) {
          const userIds = [...new Set(posts.map(p => p.user_id))];
          const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url').in('id', userIds);
          const pm = {};
          if (profiles) profiles.forEach(p => { pm[p.id] = p; });
          const CAT_DOT = { general: C.teal, cuidado: C.found, salud: '#A78BFA', humor: C.coral, historia: C.found };
          setActividad(posts.map(p => ({
            id: p.id,
            postId: p.id,
            avatar: pm[p.user_id]?.avatar_url || `https://i.pravatar.cc/80?u=${p.user_id}`,
            text: (pm[p.user_id]?.name || 'Usuario') + ' publicó en comunidad',
            sub: (p.content || '').slice(0, 50) + ((p.content?.length > 50) ? '...' : ''),
            dot: CAT_DOT[p.category] || C.teal,
            type: 'post',
          })));
        }
      } catch {}
      setLoadingDB(false);
    })();

    // Realtime: nuevas alertas aparecen automáticamente
    const channel = suscribirAlertas(() => getAlertasNearby().then(d => {
      if (d.length > 0) setAlertas(d.map(a => ({
        id: a.id, name: a.name, type: a.type,
        zone: a.zone, time: formatTime(a.created_at),
        dist: '', photo: a.photo_url,
      })));
    }));
    return () => channel.unsubscribe();
  }, []);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const nav = (s) => () => navigation.navigate(s);

  return (
    <View style={s.screen}>
      <OrganicBackdrop />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* ═══════════════════════════════════════════════════ HEADER ══ */}
        {/* Degradé teal → sunset (paleta bandera Tierra del Fuego), en vez del
            header blanco liso que había antes.
            Va DENTRO del ScrollView a propósito: es contenido normal, se va
            hacia arriba y desaparece al scrollear (no queda fijo/sticky). */}
        <Animated.View style={{ opacity: fade }}>
          <LinearGradient
            colors={[C.teal, C.sunset]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[s.header, { paddingTop: insets.top + 14 }]}
          >
            <View style={{ gap: 2 }}>
              <Text style={s.greeting}>{greeting} 👋</Text>
              <Text style={s.name}>{firstName}</Text>
              <Text style={s.nameSub}>¿Cómo estás hoy?</Text>
            </View>
            <TouchableOpacity style={s.bellBtn} onPress={nav('Notificaciones')}>
              <Bell size={20} color={C.white} strokeWidth={1.75} />
              <View style={s.bellDot} />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* ══ SECCIÓN HERO — hero + categorías + stats agrupados sobre un
             panel turquesa muy claro, para que se lean como UNA composición
             y no como piezas sueltas flotando sobre el gris de la página. ══ */}
        <View style={[s.heroGroup, isDesktop && s.heroGroupDesktop]}>

          {/* ─────────────────────────────────────────────────── HERO ── */}
          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
            <HeroCarousel onPressAlerts={nav('Mapa')} onPressReport={nav('Reportar')} isDesktop={isDesktop} />
          </Animated.View>

          {/* ───────────────────────────────────────────── ACCIONES ── */}
          <Animated.View style={[s.groupRow, isDesktop && s.groupRowDesktop, { opacity: fade }]}>
            <View style={[s.actionsGrid, isDesktop && s.actionsGridDesktop]}>
              {ACTIONS.map((item) => (
                <QuickAction key={item.key} item={item} onPress={nav(item.screen)} isDesktop={isDesktop} />
              ))}
            </View>
          </Animated.View>

          {/* ───────────────────────────────────────────────── STATS ── */}
          {/* Contornos en turquesa / naranja (los colores del header y el
              hero), no celeste/verde/naranja sueltos. */}
          <Animated.View style={[{ opacity: fade }, s.statsRow, isDesktop && s.statsRowDesktop]}>
            {[
              { val: mascotas.length,  lbl:'Mis mascotas', color: C.teal     },
              { val: '12',             lbl:'Alertas hoy',  color: C.sunset   },
              { val: '3',              lbl:'Encontradas',  color: C.tealDeep },
            ].map((st) => (
              <View key={st.lbl} style={[s.statCard, isDesktop && s.statCardDesktop, { borderColor: st.color }]}>
                <Text style={[s.statVal, isDesktop && s.statValDesktop, { color: st.color }]}>{st.val}</Text>
                <Text style={[s.statLbl, isDesktop && s.statLblDesktop]}>{st.lbl}</Text>
              </View>
            ))}
          </Animated.View>

        </View>

        {/* ═══════════════════════════════════════ CERCA DE TI ══ */}
        <View style={s.section}>
          <SectionHead title="Cerca de ti" onAction={nav('Mapa')} />
        </View>
        {isDesktop ? (
          // Desktop: grilla que envuelve (wrap) — se ven todas las tarjetas
          // completas, ninguna queda cortada en el borde de la ventana.
          <View style={s.alertsGridDesktop}>
            {alertas.map((item) => (
              <AlertCard key={item.id} item={item} onPress={() => navigation.navigate('MascotaDetalle', { id: item.id })} />
            ))}
          </View>
        ) : (
          <FlatList
            horizontal
            data={alertas}
            keyExtractor={(i) => i.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: S[20], paddingBottom: S[4] }}
            renderItem={({ item }) => (
              <AlertCard item={item} onPress={() => navigation.navigate('MascotaDetalle', { id: item.id })} />
            )}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          />
        )}

        {/* ═══════════════════════════════════ BANNERS (ads) ══ */}
        <Animated.View style={{ opacity: fade }}>
          <BannerCarousel isDesktop={isDesktop} />
        </Animated.View>

        {/* ══════════════════════════════════════ MIS MASCOTAS ══ */}
        <View style={s.section}>
          <SectionHead title="Mis mascotas" action="＋ Agregar" onAction={nav('AgregarMascota')} />
          {mascotas.length === 0
            ? <EmptyPets onPress={nav('AgregarMascota')} />
            : mascotas.map((p) => (
                <MyPetRow key={p.id} pet={p}
                  onPress={() => navigation.navigate('PerfilMascota', { pet: p })} />
              ))
          }
        </View>

        {/* ══════════════════════════════════ ACTIVIDAD RECIENTE ══ */}
        <View style={s.section}>
          <SectionHead title="Actividad reciente" onAction={nav('Comunidad')} />
          <GlassCard padding={S[16]} shadow="sm" radius={R.xl}>
            {actividad.map((item) => (
              <ActivityRow key={item.id} item={item} onPress={nav('Comunidad')} />
            ))}
          </GlassCard>
        </View>

      </ScrollView>
    </View>
  );
}

// ── EmptyPets ─────────────────────────────────────────────────────────────────
function EmptyPets({ onPress }) {
  return (
    <TouchableOpacity style={ep.wrap} onPress={onPress} activeOpacity={0.85}>
      <View style={ep.icon}>
        <MapPin size={26} color={C.teal} strokeWidth={1.5} />
      </View>
      <Text style={ep.title}>Registrá tu primera mascota</Text>
      <Text style={ep.sub}>Protegela con Mady</Text>
      <MadyButton label="Comenzar →" onPress={onPress} variant="secondary" size="sm" fullWidth={false} />
    </TouchableOpacity>
  );
}
const ep = StyleSheet.create({
  wrap: { alignItems:'center', backgroundColor: C.white, borderRadius: R.xl, padding: S[32],
          borderWidth:2, borderColor: C.teal+'25', borderStyle:'dashed', gap: S[8] },
  icon: { width:60, height:60, borderRadius: R.full, backgroundColor: C.tealLight, alignItems:'center', justifyContent:'center' },
  title:{ fontSize: T.base, fontWeight:'700', color: C.ink },
  sub:  { fontSize: T.xs, color: C.inkMuted, marginBottom: S[8] },
});

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex:1, backgroundColor: C.cloud },

  // Header
  header:   { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start',
              paddingHorizontal: S[20], paddingBottom: S[16] },
  greeting: { fontSize:11, color: 'rgba(255,255,255,0.85)', fontWeight:'700', letterSpacing:0.6, textTransform:'uppercase' },
  name:     { fontSize:26, fontWeight:'900', color: C.white, lineHeight:30 },
  nameSub:  { fontSize: T.xs, color: 'rgba(255,255,255,0.75)' },
  bellBtn:  { width:44, height:44, borderRadius: R.lg, backgroundColor: 'rgba(255,255,255,0.20)',
              alignItems:'center', justifyContent:'center',
              borderWidth:1, borderColor: 'rgba(255,255,255,0.25)', position:'relative' },
  bellDot:  { position:'absolute', top:9, right:9, width:8, height:8,
              borderRadius: R.full, backgroundColor: C.coral, borderWidth:2, borderColor: C.white },

  // Panel que agrupa hero + categorías + stats en una sola sección visual.
  // Turquesa muy claro (derivado de la marca) — distinto del gris de la
  // página y también del cyan de la card "Adopción" para que esa no se
  // funda con el fondo.
  heroGroup: {
    backgroundColor: '#E7F4F3',
    marginHorizontal: S[12],
    marginTop: S[12],
    borderRadius: 32,
    paddingHorizontal: S[10],
    paddingTop: S[10],
    paddingBottom: S[14],
  },
  heroGroupDesktop: { maxWidth: 920, alignSelf: 'center', width: '100%' },
  // Fila de categorías dentro del panel. En mobile un gutter chico extra;
  // en desktop CERO — así hero, categorías y stats comparten exactamente el
  // mismo ancho y márgenes (solo el padding del panel), alineados en columna.
  groupRow:        { marginTop: S[10], paddingHorizontal: S[4] },
  groupRowDesktop: { paddingHorizontal: 0 },

  // Hero — MÁS ALTO para impacto visual
  heroCard: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: C.tealDeep,
    shadowOffset: { width:0, height:10 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 14,
  },
  // Mobile: altura fija (ancho de pantalla real, ratio fijo por diseño ~1.3:1)
  heroCardMobile: { height: 290 },
  // Desktop: llena el ancho del panel (heroGroupDesktop lo acota) para que
  // hero + categorías + stats tengan todos el mismo ancho y se lean como un
  // bloque. `aspectRatio` fijo → el encuadre de "cover" no cambia con el ancho.
  heroCardDesktop: {
    width: '100%',
    aspectRatio: 2.15,
  },

  // Live badge
  liveBadge:    { position:'absolute', top: S[16], left: S[16],
                  flexDirection:'row', alignItems:'center', gap:6,
                  backgroundColor:'rgba(0,0,0,0.30)',
                  paddingHorizontal: S[10], paddingVertical:5, borderRadius: R.full },
  liveDot:      { width:7, height:7, borderRadius: R.full, backgroundColor:'#4ADE80' },
  liveTxt:      { fontSize:9, fontWeight:'800', color: C.white, letterSpacing:2 },

  // Hero body
  heroBody:     { position:'absolute', bottom:0, left:0, right:0, padding: S[20] },
  heroEyebrow:  { fontSize:10, fontWeight:'700', color:'rgba(255,255,255,0.65)',
                  letterSpacing:1.2, textTransform:'uppercase', marginBottom: S[6] },
  heroTitle:    { fontSize:28, fontWeight:'900', color: C.white, lineHeight:33, marginBottom: S[8],
                  textShadowColor:'rgba(0,0,0,0.25)', textShadowOffset:{width:0,height:1}, textShadowRadius:8 },
  heroSub:      { fontSize:13, color:'rgba(255,255,255,0.78)', marginBottom: S[16] },

  heroRow:      { flexDirection:'row', gap: S[10] },
  heroCTA:      { backgroundColor: C.coral, paddingHorizontal: S[20], paddingVertical: S[11],
                  borderRadius: R.full,
                  shadowColor: C.coralDeep, shadowOffset:{width:0,height:4},
                  shadowOpacity:0.45, shadowRadius:12, elevation:8 },
  heroCTATxt:   { fontSize:13, fontWeight:'800', color: C.white },
  heroSecondary:{ backgroundColor:'rgba(255,255,255,0.18)', borderWidth:1,
                  borderColor:'rgba(255,255,255,0.40)',
                  paddingHorizontal: S[20], paddingVertical: S[11], borderRadius: R.full },
  heroSecondaryTxt: { fontSize:13, fontWeight:'700', color: C.white },

  // Acciones
  section:     { paddingHorizontal: S[20], marginTop: S[20] },
  // Desktop: grilla que envuelve en vez de scroll horizontal — nada se corta
  alertsGridDesktop: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, paddingHorizontal: S[20], paddingBottom: S[4],
  },
  actionsGrid: { flexDirection:'row', gap: S[8] },
  // Desktop: llena el ancho del panel (mismo ancho que el hero y los stats).
  actionsGridDesktop: { width: '100%', gap: S[12] },

  // Stats — dentro del panel. Mobile: gutter chico. Desktop: cero (alineado
  // con hero y categorías, ver groupRowDesktop).
  statsRow:    { flexDirection:'row', gap: S[8], paddingHorizontal: S[4], marginTop: S[8] },
  statsRowDesktop: { width: '100%', gap: S[12], paddingHorizontal: 0 },
  // Contorno completo en el color del stat (ver imagen de referencia). En
  // RN-web el borderWidth sí respeta el border-radius, así que no hace falta
  // el truco de la franja absoluta. Card baja: número y etiqueta pegados.
  statCard:    { flex:1, flexBasis:0, backgroundColor: C.white, borderRadius: R.lg,
                 paddingVertical: S[10], paddingHorizontal: S[8], alignItems:'center',
                 borderWidth: 1.5, ...SH.xs },
  statCardDesktop: { paddingVertical: S[10] },
  statVal:     { fontSize:22, fontWeight:'900', lineHeight:24 },
  statValDesktop: { fontSize:24, lineHeight:26 },
  statLbl:     { fontSize:10, color: C.inkMuted, marginTop:1, fontWeight:'500', textAlign:'center' },
  statLblDesktop: { fontSize:11, marginTop: 1 },
});
