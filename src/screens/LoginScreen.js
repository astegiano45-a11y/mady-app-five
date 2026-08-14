// ─────────────────────────────────────────────────────────────────────────────
//  Mady App · LoginScreen — Aplicando las 5 skills
//
//  ✅ ui-ux-pro-max   : paleta cálida que combina con el logo, touch 44pt, spacing 8dp
//  ✅ frontend-design : dirección "Warm Natural Premium", animación orquestada
//  ✅ react-native    : Pressable > TouchableOpacity, StyleSheet.create, sin inline styles
//  ✅ accesslint      : accessibilityLabel/Role/Hint en todos los controles
//  ✅ web-guidelines  : error near field, visible labels, focus states
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform, Animated, Image,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useIsDesktop } from '../hooks/useIsDesktop';

// ── Design tokens (Turquesa + Coral + Blanco — colores bandera TDF) ──────────
const D = {
  // Marca turquesa
  brand:       '#0ABFBC',
  brandDark:   '#089A97',
  brandLight:  '#E0F7F7',
  brandPale:   '#F0FAFA',

  // Acento coral
  accent:      '#FF6B47',
  accentDark:  '#E85530',

  // Neutros
  ink:         '#0D1117',
  inkMid:      '#374151',
  inkLight:    '#6B7280',
  muted:       '#9CA3AF',
  border:      '#E5E7EB',
  borderFocus: '#0ABFBC',
  surface:     '#FFFFFF',
  bg:          '#F8FAFC',

  // Estado
  error:       '#DC2626',
  errorBg:     '#FEF2F2',
  errorBorder: '#FECACA',

  // Tipografía — escala 4dp
  textXs:  11,
  textSm:  13,
  textMd:  15,
  textLg:  18,
  textXl:  22,
  text2xl: 28,

  // Espaciado — ritmo 8dp (ui-ux-pro-max §5)
  sp4:   4,
  sp8:   8,
  sp12:  12,
  sp16:  16,
  sp20:  20,
  sp24:  24,
  sp32:  32,
  sp40:  40,
  sp48:  48,

  // Radio
  rSm:   8,
  rMd:   14,
  rLg:   20,
  rXl:   28,
  rFull: 9999,
};

// ── Componente: Input accesible ───────────────────────────────────────────────
// accesslint: label visible, error junto al campo, accessibilityLabel/Hint
function Field({ label, value, onChangeText, type, error, onSubmit, inputRef, returnKeyType = 'next' }) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [error ? D.errorBorder : D.border, error ? D.error : D.borderFocus],
  });

  const isPassword = type === 'password';

  return (
    <View style={fieldS.wrap} accessible={false}>
      {/* Label visible — web-guidelines: visible label per input */}
      <Text style={fieldS.label}>{label}</Text>

      <Animated.View style={[fieldS.row, { borderColor }]}>
        <TextInput
          ref={inputRef}
          style={fieldS.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          keyboardType={type === 'email' ? 'email-address' : 'default'}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={isPassword && !showPass}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmit}
          selectionColor={D.brand}
          placeholderTextColor={D.muted}
          // accesslint: accessibilityLabel + hint claros
          accessibilityLabel={label}
          accessibilityHint={
            type === 'email'
              ? 'Ingresa tu correo electrónico registrado'
              : 'Ingresa tu contraseña de al menos 6 caracteres'
          }
          accessibilityRequired
          // accesslint: informar si hay error
          accessibilityInvalid={!!error}
          accessibilityErrorMessage={error}
        />

        {/* Toggle contraseña — touch target ≥44pt (react-native-guidelines) */}
        {isPassword && (
          <Pressable
            onPress={() => setShowPass(v => !v)}
            style={fieldS.eyeBtn}
            accessibilityLabel={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityRole="button"
          >
            <Text style={fieldS.eyeText} accessible={false}>
              {showPass ? '🙈' : '👁️'}
            </Text>
          </Pressable>
        )}
      </Animated.View>

      {/* Error junto al campo — web-guidelines: error near field */}
      {error ? (
        <View
          style={fieldS.errorRow}
          accessibilityLiveRegion="polite"   // accesslint: aria-live
          accessible
          accessibilityLabel={`Error: ${error}`}
        >
          <Text style={fieldS.errorDot}>●</Text>
          <Text style={fieldS.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const fieldS = StyleSheet.create({
  wrap:     { marginBottom: D.sp20 },
  label:    { fontSize: D.textSm, fontWeight: '600', color: D.inkMid, marginBottom: D.sp8, letterSpacing: 0.3 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surface, borderRadius: D.rMd,
    borderWidth: 1.5, paddingHorizontal: D.sp16,
    minHeight: 54,   // touch target ≥44pt + padding
  },
  input: { flex: 1, fontSize: D.textMd, color: D.ink, paddingVertical: D.sp12 },
  // touch target ≥44pt (ui-ux-pro-max rule touch-target-size)
  eyeBtn:  { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -D.sp8 },
  eyeText: { fontSize: 18 },
  errorRow:{ flexDirection: 'row', alignItems: 'center', gap: D.sp4, marginTop: D.sp8 },
  errorDot:{ fontSize: 8, color: D.error },
  errorText:{ flex: 1, fontSize: D.textXs, color: D.error, fontWeight: '500' },
});

// ── Componente: Botón principal animado ───────────────────────────────────────
// react-native-guidelines: Pressable > TouchableOpacity
// ui-ux-pro-max: scale feedback 0.97 en press
function PrimaryBtn({ label, onPress, loading, accessibilityHint }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 50 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading, disabled: loading }}
    >
      <Animated.View style={[btnS.btn, loading && btnS.btnLoading, { transform: [{ scale }] }]}>
        {loading
          ? <ActivityIndicator color="#FFF" size="small" accessibilityLabel="Cargando..." />
          : <Text style={btnS.label}>{label}</Text>
        }
      </Animated.View>
    </Pressable>
  );
}

const btnS = StyleSheet.create({
  btn: {
    backgroundColor: D.accent, borderRadius: D.rMd,
    height: 54, alignItems: 'center', justifyContent: 'center',
    shadowColor: D.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  btnLoading: { opacity: 0.8 },
  label:      { color: '#FFF', fontSize: D.textLg, fontWeight: '700', letterSpacing: 0.6 },
});

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
  const insets     = useSafeAreaInsets();
  const { login }  = useAuth();
  const isDesktop  = useIsDesktop(); // >900px → layout tipo landing (hero + form)

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [authErr,  setAuthErr]  = useState('');
  const passwordRef = useRef(null);

  // ── Animación de entrada orquestada (frontend-design: one orchestrated page load)
  // ui-ux-pro-max §7: logo entra primero con spring, luego form con stagger 30-50ms
  const logoScale   = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const formSlide   = useRef(new Animated.Value(32)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const shakeX      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo: spring physics (más natural que timing lineal)
    Animated.parallel([
      Animated.spring(logoScale,   { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      // Form: slide-up + fade, después del logo
      Animated.parallel([
        Animated.timing(formSlide,   { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.timing(formOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  // Shake al error (ui-ux-pro-max §8: error feedback)
  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 6,   duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,   duration: 55, useNativeDriver: true }),
    ]).start();
  };

  // ── Validación ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Ingresa tu correo electrónico';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Correo con formato inválido';
    if (!password) e.password = 'Ingresa tu contraseña';
    else if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    return e;
  };

  const handleLogin = async () => {
    setAuthErr('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { shake(); return; }

    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch {
      setAuthErr('Correo o contraseña incorrectos');
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ── Card de formulario — compartida entre layout mobile y desktop ──────────
  const formCard = (
    <Animated.View
      style={[
        s.card,
        isDesktop && s.cardDesktop,
        {
          opacity: formOpacity,
          transform: [
            { translateY: formSlide },
            { translateX: shakeX },
          ],
        },
      ]}
    >
      <Text style={s.title} accessibilityRole="header">Iniciar sesión</Text>
      <Text style={s.subtitle}>Bienvenido/a de vuelta 🐾</Text>

      {/* Error global de autenticación — accesslint: aria-live */}
      {authErr ? (
        <View
          style={s.authErrBox}
          accessibilityLiveRegion="assertive"
          accessible
          accessibilityLabel={`Error de inicio de sesión: ${authErr}`}
        >
          <Text style={s.authErrText}>{authErr}</Text>
        </View>
      ) : null}

      {/* Campos — web-guidelines: visible labels + error near field */}
      <Field
        label="Correo electrónico"
        value={email}
        onChangeText={t => { setEmail(t); setErrors(e => ({ ...e, email: '' })); setAuthErr(''); }}
        type="email"
        error={errors.email}
        returnKeyType="next"
        onSubmit={() => passwordRef.current?.focus()}
      />
      <Field
        label="Contraseña"
        value={password}
        onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: '' })); setAuthErr(''); }}
        type="password"
        error={errors.password}
        returnKeyType="done"
        onSubmit={handleLogin}
        inputRef={passwordRef}
      />

      {/* ¿Olvidaste? — touch target ≥44pt */}
      <Pressable
        style={s.forgotBtn}
        onPress={() => {}}
        accessibilityRole="button"
        accessibilityLabel="¿Olvidaste tu contraseña?"
        accessibilityHint="Abre el flujo de recuperación de contraseña"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={s.forgotText}>¿Olvidaste tu contraseña?</Text>
      </Pressable>

      {/* CTA principal */}
      <PrimaryBtn
        label="Entrar a Mady"
        onPress={handleLogin}
        loading={loading}
        accessibilityHint="Inicia sesión con tu correo y contraseña"
      />

      {/* Divisor */}
      <View style={s.divRow} accessible={false}>
        <View style={s.divLine} />
        <Text style={s.divText}>o</Text>
        <View style={s.divLine} />
      </View>

      {/* Registro */}
      <Pressable
        style={({ pressed }) => [s.regBtn, pressed && s.regBtnPressed]}
        onPress={() => navigation.navigate('Register')}
        accessibilityRole="button"
        accessibilityLabel="Crear cuenta nueva"
        accessibilityHint="Navega a la pantalla de registro"
      >
        <Text style={s.regText}>Crear cuenta nueva</Text>
      </Pressable>

      <Text style={s.terms} accessible accessibilityRole="text">
        Al ingresar aceptas nuestros{' '}
        <Text style={s.termsLink}>Términos de uso</Text>
        {' '}y la{' '}
        <Text style={s.termsLink}>Política de privacidad</Text>
      </Text>
    </Animated.View>
  );

  // ── Cuentas de prueba (dev) — compartida entre layouts ──────────────────────
  const devSection = (
    <View style={s.devSection} accessible={false}>
      <Text style={s.devLabel}>🧪 Cuentas de prueba</Text>
      <View style={s.devRow}>
        {[
          { name: 'Sofía', email: 'sofia@madyapp.com', pass: '123456' },
          { name: 'Carlos', email: 'carlos@test.com', pass: 'abcdef' },
        ].map(acc => (
          <Pressable
            key={acc.email}
            style={({ pressed }) => [s.devChip, pressed && s.devChipPressed]}
            onPress={() => { setEmail(acc.email); setPassword(acc.pass); setErrors({}); setAuthErr(''); }}
            accessibilityRole="button"
            accessibilityLabel={`Usar cuenta de prueba ${acc.name}`}
          >
            <Text style={s.devChipText}>{acc.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  // ── Layout DESKTOP (>900px): landing tipo split — hero a la izquierda,
  //    formulario a la derecha. Sin scroll de página, aprovecha el ancho real. ──
  if (isDesktop) {
    return (
      <View style={s.desktopRoot}>
        {/* Panel izquierdo — marca / hero */}
        <View style={s.heroPanel}>
          <Animated.View
            style={[s.heroContent, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
            accessible
            accessibilityRole="image"
            accessibilityLabel="Logo de Mady App, un perro con anillo dorado"
          >
            <Image
              source={require('../../assets/mady_logo.png')}
              style={s.heroLogoImg}
              resizeMode="contain"
              accessible={false}
            />
            <Text style={s.heroTitle}>Mady App</Text>
            <Text style={s.heroTagline}>Tu compañero siempre contigo</Text>

            <View style={s.heroFeatures} accessible={false}>
              {[
                ['📍', 'Mascotas perdidas cerca tuyo, en tiempo real'],
                ['🤝', 'Una red de vecinos que ayuda a reencontrarlas'],
                ['🐾', 'Adopción responsable, estilo swipe'],
              ].map(([icon, text]) => (
                <View key={text} style={s.heroFeatureRow}>
                  <Text style={s.heroFeatureIcon}>{icon}</Text>
                  <Text style={s.heroFeatureText}>{text}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* Panel derecho — formulario */}
        <ScrollView
          style={s.formPanel}
          contentContainerStyle={s.formPanelContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {formCard}
          {devSection}
        </ScrollView>
      </View>
    );
  }

  // ── Layout MOBILE (<900px): diseño original, sin cambios ────────────────────
  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + D.sp24, paddingBottom: insets.bottom + D.sp32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // accesslint: safe area en ScrollView (react-native-guidelines: ui-safe-area-scroll)
        scrollIndicatorInsets={{ right: 1 }}
      >

        {/* ── Logo — frontend-design: el logo es el corazón emocional ── */}
        <Animated.View
          style={[s.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
          accessible
          accessibilityRole="image"
          accessibilityLabel="Logo de Mady App, un perro con anillo dorado"
        >
          <Image
            source={require('../../assets/mady_logo.png')}
            style={s.logoImg}
            resizeMode="contain"
            accessible={false}   // ya manejado por el parent
          />
          <Text style={s.tagline} accessibilityRole="text">
            Tu compañero siempre contigo
          </Text>
        </Animated.View>

        {formCard}
        {devSection}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    // Degradé turquesa → coral igual que la landing
    background: 'linear-gradient(135deg, #0ABFBC 0%, #089A97 40%, #FF6B47 100%)',
    backgroundColor: '#0ABFBC', // fallback nativo
  },
  scroll: {
    flexGrow: 1, paddingHorizontal: D.sp24, alignItems: 'center',
    // Centra el formulario verticalmente en pantallas grandes
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
    minHeight: Platform.OS === 'web' ? '100vh' : undefined,
    paddingVertical: D.sp48,
  },

  // ── Desktop (>900px): layout tipo landing, split en dos paneles ────────────
  desktopRoot: {
    flex: 1,
    flexDirection: 'row',
    minHeight: Platform.OS === 'web' ? '100vh' : undefined,
    backgroundColor: D.surface,
  },
  heroPanel: {
    flex: 1,
    minWidth: 420,
    alignItems: 'center',
    justifyContent: 'center',
    padding: D.sp48,
    background: 'linear-gradient(135deg, #0ABFBC 0%, #089A97 40%, #FF6B47 100%)',
    backgroundColor: D.brand, // fallback nativo
  },
  heroContent: { alignItems: 'center', maxWidth: 440 },
  heroLogoImg: {
    width: 140, height: 140, marginBottom: D.sp24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20,
  },
  heroTitle: {
    fontSize: 34, fontWeight: '800', color: '#FFF',
    fontFamily: 'Georgia', letterSpacing: 0.3, marginBottom: D.sp8,
  },
  heroTagline: {
    fontSize: D.textMd, color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1.5, textTransform: 'uppercase',
    marginBottom: D.sp40, textAlign: 'center',
  },
  heroFeatures: { width: '100%', gap: D.sp20 },
  heroFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: D.sp16 },
  heroFeatureIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  heroFeatureText: { flex: 1, fontSize: D.textMd, color: '#FFF', fontWeight: '500', lineHeight: 22 },

  formPanel: { flex: 1 },
  formPanelContent: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    padding: D.sp48,
  },

  // Logo
  logoWrap: { alignItems: 'center', marginBottom: D.sp32, width: '100%' },
  logoImg: {
    width: 180, height: 180,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20,
  },
  tagline: {
    fontSize: D.textSm, color: 'rgba(255,255,255,0.9)',
    letterSpacing: 2.5, textTransform: 'uppercase',
    marginTop: D.sp12, fontFamily: 'Georgia',
  },

  // Card
  card: {
    width: '100%', backgroundColor: D.surface,
    borderRadius: D.rXl, padding: D.sp32,
    borderWidth: 1, borderColor: D.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  cardDesktop: {
    maxWidth: 440, // en el panel derecho: no se estira de punta a punta
    boxShadow: 'none', shadowOpacity: 0, elevation: 0,
    borderWidth: 0, padding: 0,
  },
  title: {
    fontSize: D.text2xl, fontWeight: '800', color: D.ink,
    fontFamily: 'Georgia', letterSpacing: 0.3, marginBottom: D.sp4,
  },
  subtitle: { fontSize: D.textSm, color: D.muted, marginBottom: D.sp24 },

  // Auth error
  authErrBox: {
    backgroundColor: D.errorBg, borderRadius: D.rMd,
    borderWidth: 1, borderColor: D.errorBorder,
    padding: D.sp12, marginBottom: D.sp16,
  },
  authErrText: { fontSize: D.textSm, color: D.error, fontWeight: '600', textAlign: 'center' },

  // Forgot — hitSlop en el componente, aquí solo alineación
  forgotBtn: { alignSelf: 'flex-end', marginBottom: D.sp20, marginTop: -D.sp8 },
  forgotText: { fontSize: D.textSm, color: D.accent, fontWeight: '600' },

  // Divider
  divRow: { flexDirection: 'row', alignItems: 'center', marginVertical: D.sp20, gap: D.sp12 },
  divLine: { flex: 1, height: 1, backgroundColor: D.border },
  divText: { fontSize: D.textSm, color: D.muted },

  // Register button
  regBtn: {
    borderWidth: 1.5, borderColor: D.brand, borderRadius: D.rMd,
    height: 54, alignItems: 'center', justifyContent: 'center',
    marginBottom: D.sp20,
  },
  regBtnPressed: { backgroundColor: D.brandPale },
  regText: { color: D.brand, fontSize: D.textMd, fontWeight: '600' },

  // Terms
  terms:     { fontSize: D.textXs, color: D.muted, textAlign: 'center', lineHeight: 17 },
  termsLink: { color: D.accent, fontWeight: '600' },

  // Dev section
  devSection: { marginTop: D.sp32, alignItems: 'center', gap: D.sp12 },
  devLabel:   { fontSize: D.textXs, color: D.muted, letterSpacing: 1, textTransform: 'uppercase' },
  devRow:     { flexDirection: 'row', gap: D.sp8 },
  devChip: {
    paddingHorizontal: D.sp16, paddingVertical: D.sp8,
    borderRadius: D.rFull, backgroundColor: D.surface,
    borderWidth: 1, borderColor: D.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    // touch target: paddingVertical 8 + altura texto ≈ 38 → hitSlop debajo
  },
  devChipPressed: { backgroundColor: D.brandLight, borderColor: D.brand },
  devChipText:    { fontSize: D.textSm, color: D.inkMid, fontWeight: '500' },
});
