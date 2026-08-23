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
import MadyButton    from '../components/MadyButton';
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
        style={[qa.card, isDesktop && qa.cardDesktop, { backgroundColor: item.bg, transform: [{ scale }] }]}
      >
        <View style={[qa.iconWrap, isDesktop && qa.iconWrapDesktop, { backgroundColor: item.color + '20' }]}>
          <Icon size={isDesktop ? 26 : 20} color={item.color} strokeWidth={1.75} />
        </View>
        <Text style={[qa.label, isDesktop && qa.labelDesktop, { color: item.color }]}>{item.label}</Text>
      </Animated.View>
    </Pressable>
  );
}
const qa = StyleSheet.create({
  card:    { alignItems:'center', padding: S[14], borderRadius: R.xl, gap: S[8] },
  iconWrap:{ width:42, height:42, borderRadius: R.lg, alignItems:'center', justifyContent:'center' },
  label:   { fontSize: 11, fontWeight:'700', textAlign:'center' },
  // Desktop: antes las 4 cards quedaban carriles finitos (mucho ancho por
  // columna, altura chica y fija por el contenido) — más padding vertical
  // e ícono más grande para una proporción más cuadrada/compacta.
  cardDesktop:     { paddingVertical: S[28], paddingHorizontal: S[16], gap: S[12] },
  iconWrapDesktop: { width: 56, height: 56, borderRadius: R.xl },
  labelDesktop:    { fontSize: 13 },
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

      {/* ═══════════════════════════════════════════════════ HEADER ══ */}
      <Animated.View style={[s.header, { paddingTop: insets.top + 14, opacity: fade }]}>
        <View style={{ gap: 2 }}>
          <Text style={s.greeting}>{greeting} 👋</Text>
          <Text style={s.name}>{firstName}</Text>
          <Text style={s.nameSub}>¿Cómo estás hoy?</Text>
        </View>
        <TouchableOpacity style={s.bellBtn} onPress={nav('Notificaciones')}>
          <Bell size={20} color={C.inkMid} strokeWidth={1.75} />
          <View style={s.bellDot} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* ═══════════════════════════════════════════════════ HERO ══ */}
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
          <HeroCarousel onPressAlerts={nav('Mapa')} onPressReport={nav('Reportar')} isDesktop={isDesktop} />
        </Animated.View>

        {/* ═══════════════════════════════════════════ ACCIONES ══ */}
        <Animated.View style={[s.section, { opacity: fade }]}>
          <View style={[s.actionsGrid, isDesktop && s.actionsGridDesktop]}>
            {ACTIONS.map((item) => (
              <QuickAction key={item.key} item={item} onPress={nav(item.screen)} isDesktop={isDesktop} />
            ))}
          </View>
        </Animated.View>

        {/* ═══════════════════════════════════════════════ STATS ══ */}
        <Animated.View style={[{ opacity: fade }, s.statsRow, isDesktop && s.statsRowDesktop]}>
          {[
            { val: mascotas.length,  lbl:'Mis mascotas', color: C.teal  },
            { val: '12',             lbl:'Alertas hoy',  color: C.coral },
            { val: '3',              lbl:'Encontradas',  color: C.found },
          ].map((st) => (
            <View key={st.lbl} style={[s.statCard, isDesktop && s.statCardDesktop]}>
              <View style={[s.statAccent, { backgroundColor: st.color }]} />
              <Text style={[s.statVal, isDesktop && s.statValDesktop, { color: st.color }]}>{st.val}</Text>
              <Text style={[s.statLbl, isDesktop && s.statLblDesktop]}>{st.lbl}</Text>
            </View>
          ))}
        </Animated.View>

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
              paddingHorizontal: S[20], paddingBottom: S[16],
              backgroundColor: C.white, borderBottomWidth:1, borderBottomColor: C.borderLight },
  greeting: { fontSize:11, color: C.teal, fontWeight:'700', letterSpacing:0.6, textTransform:'uppercase' },
  name:     { fontSize:26, fontWeight:'900', color: C.ink, lineHeight:30 },
  nameSub:  { fontSize: T.xs, color: C.inkMuted },
  bellBtn:  { width:44, height:44, borderRadius: R.lg, backgroundColor: C.cloud,
              alignItems:'center', justifyContent:'center',
              borderWidth:1, borderColor: C.border, position:'relative' },
  bellDot:  { position:'absolute', top:9, right:9, width:8, height:8,
              borderRadius: R.full, backgroundColor: C.coral, borderWidth:2, borderColor: C.white },

  // Hero — MÁS ALTO para impacto visual
  heroCard: {
    marginHorizontal: S[20], marginTop: S[20], marginBottom: S[4],
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
  // Desktop (>900px): antes tenía "height" fijo con "maxWidth" — por debajo
  // del cap el ancho variaba con la ventana pero la altura no, así que el
  // aspect-ratio (y por lo tanto el encuadre/zoom de "cover") cambiaba con
  // cada ancho: a 900px se veía distinto que a 1150px. Con `aspectRatio` fijo
  // el encuadre es EXACTAMENTE el mismo sea cual sea el ancho de pantalla;
  // `maxWidth` solo limita qué tan grande puede llegar a ser la card.
  heroCardDesktop: {
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
    aspectRatio: 2.05,
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
  // Desktop: cap de ancho — si no, con 4 columnas en un container de hasta
  // ~1360px cada card queda una franja finita (ancho >> alto).
  actionsGridDesktop: { maxWidth: 760, alignSelf: 'center', width: '100%', gap: S[16] },

  // Stats
  statsRow:    { flexDirection:'row', gap: S[8], paddingHorizontal: S[20], marginTop: S[8] },
  // Desktop: mismo problema que actionsGrid — cap de ancho + más padding
  // vertical para que no queden franjas finitas.
  statsRowDesktop: { maxWidth: 760, alignSelf: 'center', width: '100%', gap: S[16] },
  // El acento de color era un borderTopWidth: en CSS/RN-web un borde de lado
  // no sigue el border-radius de la card, así que se veía cortado feo en las
  // esquinas. Se reemplaza por una franja lateral izquierda (View absoluto),
  // que queda prolijamente recortada por el overflow:hidden de la card.
  statCard:    { flex:1, flexBasis:0, backgroundColor: C.white, borderRadius: R.lg, padding: S[14],
                 paddingLeft: S[14] + 4, alignItems:'center', overflow:'hidden',
                 position:'relative', ...SH.xs },
  statCardDesktop: { paddingVertical: S[28] },
  statAccent:  { position:'absolute', left:0, top:0, bottom:0, width:4 },
  statVal:     { fontSize:22, fontWeight:'900', lineHeight:26 },
  statValDesktop: { fontSize:28, lineHeight:32 },
  statLbl:     { fontSize:10, color: C.inkMuted, marginTop:3, fontWeight:'500', textAlign:'center' },
  statLblDesktop: { fontSize:12, marginTop: S[6] },
});
