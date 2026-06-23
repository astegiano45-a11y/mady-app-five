// ─────────────────────────────────────────────────────────────────────────────
//  Mady App · RegisterScreen — Semana 1
//  Formulario de registro en 2 pasos:
//    Paso 1 — Cuenta: nombre, correo, contraseña, confirmar contraseña
//    Paso 2 — Perfil: teléfono, ciudad  (opcionales)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth }   from '../context/AuthContext';
import FormInput     from '../components/FormInput';
import MadyLogo      from '../components/MadyLogo';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';

// ── Validadores por paso ──────────────────────────────────────────────────────
function validateStep1(f) {
  const e = {};
  if (!f.name.trim())
    e.name = 'El nombre es requerido.';
  else if (f.name.trim().length < 2)
    e.name = 'Ingresa tu nombre completo.';

  if (!f.email.trim())
    e.email = 'El correo es requerido.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
    e.email = 'Formato de correo inválido.';

  if (!f.password)
    e.password = 'La contraseña es requerida.';
  else if (f.password.length < 6)
    e.password = 'Mínimo 6 caracteres.';

  if (!f.confirm)
    e.confirm = 'Confirma tu contraseña.';
  else if (f.confirm !== f.password)
    e.confirm = 'Las contraseñas no coinciden.';

  return e;
}

function validateStep2(f) {
  const e = {};
  if (f.phone && !/^\+?[\d\s\-()]{7,}$/.test(f.phone.trim()))
    e.phone = 'Formato de teléfono inválido.';
  return e;
}

// ── Indicador de fortaleza de contraseña ─────────────────────────────────────
function PasswordStrength({ password }) {
  const tests = [
    { label: '6+ chars',   ok: password.length >= 6 },
    { label: 'Mayúscula',  ok: /[A-Z]/.test(password) },
    { label: 'Número',     ok: /\d/.test(password) },
    { label: 'Especial',   ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const passed = tests.filter((t) => t.ok).length;
  const level  = passed === 0 ? 0 : passed <= 1 ? 1 : passed <= 2 ? 2 : passed <= 3 ? 3 : 4;
  const colors = ['#E0E0E0', COLORS.error, COLORS.warning, COLORS.gold, COLORS.success];
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];

  if (!password) return null;

  return (
    <View style={pwStyles.row}>
      {[1, 2, 3, 4].map((n) => (
        <View
          key={n}
          style={[pwStyles.bar, { backgroundColor: n <= level ? colors[level] : '#E8E8E8' }]}
        />
      ))}
      <Text style={[pwStyles.label, { color: colors[level] }]}>
        {labels[level]}
      </Text>
    </View>
  );
}

const pwStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -10, marginBottom: SPACING.md },
  bar:   { flex: 1, height: 3, borderRadius: 2 },
  label: { fontSize: FONTS.xs, fontWeight: FONTS.semibold, width: 42 },
});

// ── Barra de progreso de pasos ────────────────────────────────────────────────
function StepBar({ current, total }) {
  return (
    <View style={sbStyles.wrapper}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={sbStyles.stepWrap}>
          <View style={[sbStyles.circle, i + 1 <= current && sbStyles.circleActive]}>
            {i + 1 < current ? (
              <Text style={sbStyles.checkText}>✓</Text>
            ) : (
              <Text style={[sbStyles.stepNum, i + 1 === current && sbStyles.stepNumActive]}>
                {i + 1}
              </Text>
            )}
          </View>
          {i < total - 1 && (
            <View style={[sbStyles.connector, i + 1 < current && sbStyles.connectorActive]} />
          )}
        </View>
      ))}
    </View>
  );
}

const sbStyles = StyleSheet.create({
  wrapper:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  stepWrap:       { flexDirection: 'row', alignItems: 'center' },
  circle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  circleActive:   { backgroundColor: COLORS.gold, borderColor: COLORS.goldDark, ...SHADOW.gold },
  stepNum:        { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textMuted },
  stepNumActive:  { color: COLORS.cream },
  checkText:      { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.cream },
  connector:      { width: 40, height: 2, backgroundColor: COLORS.border },
  connectorActive:{ backgroundColor: COLORS.gold },
});

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function RegisterScreen({ navigation }) {
  const insets       = useSafeAreaInsets();
  const { register } = useAuth();
  const TOTAL_STEPS  = 2;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '',
    phone: '', city: '',
  });
  const [errors,    setErrors]    = useState({});
  const [authError, setAuthError] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);

  // Refs para focus chaining
  const emailRef    = useRef(null);
  const passRef     = useRef(null);
  const confirmRef  = useRef(null);
  const phoneRef    = useRef(null);
  const cityRef     = useRef(null);

  // Animación de entrada
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const set = (key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
    setAuthError('');
  };

  // ── Ir al paso 2 ─────────────────────────────────────────────────────────
  const goNext = () => {
    const errs = validateStep1(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setStep(2);
  };

  // ── Registrar ─────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    const errs = validateStep2(form);
    setErrors(errs);
    setAuthError('');
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await register({
        name:     form.name,
        email:    form.email,
        password: form.password,
        phone:    form.phone,
        city:     form.city,
      });
      setDone(true);          // muestra pantalla de éxito
    } catch (e) {
      // Si el email ya existe → retroceder al paso 1 con error
      setAuthError(e.message);
      if (e.code === 'EMAIL_IN_USE') {
        setStep(1);
        setErrors({ email: e.message });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Pantalla de éxito ─────────────────────────────────────────────────────
  if (done) return <SuccessScreen name={form.name} />;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + SPACING.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backLabel}>{step > 1 ? 'Atrás' : 'Iniciar sesión'}</Text>
          </TouchableOpacity>
          <MadyLogo size={44} />
        </Animated.View>

        {/* ── Card ── */}
        <Animated.View
          style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Text style={styles.cardTitle}>Crea tu cuenta</Text>
          <Text style={styles.cardSubtitle}>
            {step === 1 ? 'Tus datos de acceso' : 'Información de contacto (opcional)'}
          </Text>

          <StepBar current={step} total={TOTAL_STEPS} />

          {/* Error global */}
          {authError ? <ErrorBanner message={authError} /> : null}

          {/* ── PASO 1 ── */}
          {step === 1 && (
            <>
              <FormInput
                label="Nombre completo"
                value={form.name}
                onChangeText={set('name')}
                type="text"
                placeholder="Sofía Ramírez"
                icon="👤"
                error={errors.name}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                autoFocus
              />
              <FormInput
                label="Correo electrónico"
                value={form.email}
                onChangeText={set('email')}
                type="email"
                placeholder="correo@ejemplo.com"
                icon="✉️"
                error={errors.email}
                returnKeyType="next"
                onSubmitEditing={() => passRef.current?.focus()}
                inputRef={emailRef}
              />
              <FormInput
                label="Contraseña"
                value={form.password}
                onChangeText={set('password')}
                type="password"
                placeholder="Mínimo 6 caracteres"
                icon="🔒"
                error={errors.password}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                inputRef={passRef}
              />
              <PasswordStrength password={form.password} />
              <FormInput
                label="Confirmar contraseña"
                value={form.confirm}
                onChangeText={set('confirm')}
                type="password"
                placeholder="Repite tu contraseña"
                icon="🔐"
                error={errors.confirm}
                returnKeyType="done"
                onSubmitEditing={goNext}
                inputRef={confirmRef}
              />

              <GoldButton label="Continuar →" onPress={goNext} />
            </>
          )}

          {/* ── PASO 2 ── */}
          {step === 2 && (
            <>
              <View style={styles.optionalNote}>
                <Text style={styles.optionalIcon}>💡</Text>
                <Text style={styles.optionalText}>
                  Estos datos son opcionales pero te ayudan a conectar con la comunidad Mady.
                </Text>
              </View>

              <FormInput
                label="Teléfono"
                value={form.phone}
                onChangeText={set('phone')}
                type="phone"
                placeholder="+52 55 0000 0000"
                icon="📞"
                error={errors.phone}
                hint="Para que otros puedan contactarte si encuentran a tu mascota."
                returnKeyType="next"
                onSubmitEditing={() => cityRef.current?.focus()}
                inputRef={phoneRef}
                autoFocus
              />
              <FormInput
                label="Ciudad"
                value={form.city}
                onChangeText={set('city')}
                type="text"
                placeholder="Ciudad de México"
                icon="📍"
                error={errors.city}
                hint="Ayuda a mostrar reportes cercanos a ti."
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                inputRef={cityRef}
              />

              <GoldButton
                label="🐾  Crear mi cuenta"
                onPress={handleRegister}
                loading={loading}
              />

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={handleRegister}
                activeOpacity={0.7}
              >
                <Text style={styles.skipText}>Omitir por ahora</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        {/* Footer */}
        <Animated.Text style={[styles.footer, { opacity: fadeAnim }]}>
          Al registrarte aceptas los{' '}
          <Text style={styles.footerLink}>Términos de uso</Text>
          {' '}y la{' '}
          <Text style={styles.footerLink}>Política de privacidad</Text>
          {' '}de Mady App.
        </Animated.Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Pantalla de éxito ─────────────────────────────────────────────────────────
function SuccessScreen({ name }) {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={successStyles.screen}>
      <Animated.View style={[successStyles.content, { transform: [{ scale }] }]}>
        <Text style={successStyles.emoji}>🎉</Text>
        <Text style={successStyles.title}>¡Bienvenido/a, {name.split(' ')[0]}!</Text>
        <Text style={successStyles.subtitle}>
          Tu cuenta Mady ha sido creada.{'\n'}Ya puedes registrar a tus mascotas.
        </Text>
        <View style={successStyles.paws}>
          {['🐕', '🐱', '🐇', '🦜'].map((e, i) => (
            <Text key={i} style={successStyles.paw}>{e}</Text>
          ))}
        </View>
        <Text style={successStyles.hint}>Redirigiendo automáticamente…</Text>
      </Animated.View>
    </View>
  );
}

const successStyles = StyleSheet.create({
  screen: {
    flex: 1, backgroundColor: COLORS.cream,
    alignItems: 'center', justifyContent: 'center', padding: SPACING.xl,
  },
  content:  { alignItems: 'center' },
  emoji:    { fontSize: 64, marginBottom: SPACING.lg },
  title: {
    fontSize: FONTS['2xl'], fontWeight: FONTS.heavy,
    color: COLORS.black, fontFamily: 'serif',
    textAlign: 'center', marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.base, color: COLORS.textMuted,
    textAlign: 'center', lineHeight: 24,
  },
  paws: { flexDirection: 'row', gap: SPACING.md, marginVertical: SPACING.xl },
  paw:  { fontSize: 32 },
  hint: { fontSize: FONTS.xs, color: COLORS.placeholder, letterSpacing: 1, textTransform: 'uppercase' },
});

// ── Shared sub-components ─────────────────────────────────────────────────────
function GoldButton({ label, onPress, loading }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true }).start();
  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} disabled={loading}>
      <Animated.View style={[styles.goldBtn, { transform: [{ scale: scaleAnim }] }]}>
        {loading ? <LoadingDots /> : <Text style={styles.goldBtnLabel}>{label}</Text>}
      </Animated.View>
    </Pressable>
  );
}

function LoadingDots() {
  const anims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    const loops = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(a, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0,  duration: 300, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', height: 20 }}>
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={{ width: 7, height: 7, borderRadius: 4,
                   backgroundColor: COLORS.cream, transform: [{ translateY: a }] }}
        />
      ))}
    </View>
  );
}

function ErrorBanner({ message }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerIcon}>⚠️</Text>
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  kav:    { flex: 1 },
  scroll: { flex: 1, backgroundColor: COLORS.cream },
  content:{ paddingHorizontal: SPACING.lg, flexGrow: 1 },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   SPACING.lg,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backIcon: { fontSize: 28, color: COLORS.gold, lineHeight: 32 },
  backLabel:{ fontSize: FONTS.sm, color: COLORS.gold, fontWeight: FONTS.semibold },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius:    RADIUS.xl,
    padding:         SPACING.lg,
    borderWidth:     1,
    borderColor:     COLORS.borderLight,
    ...SHADOW.md,
  },
  cardTitle: {
    fontSize:   FONTS['2xl'],
    fontWeight: FONTS.heavy,
    color:      COLORS.black,
    fontFamily: 'serif',
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    fontSize:     FONTS.sm,
    color:        COLORS.textMuted,
    marginTop:    4,
    marginBottom: SPACING.lg,
  },

  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.errorBg, borderWidth: 1,
    borderColor: COLORS.error + '40', borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.md,
  },
  errorBannerIcon: { fontSize: 16 },
  errorBannerText: {
    flex: 1, fontSize: FONTS.sm,
    color: COLORS.error, lineHeight: 20, fontWeight: FONTS.medium,
  },

  goldBtn: {
    backgroundColor: COLORS.gold, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.goldDark, minHeight: 52, ...SHADOW.gold,
    marginTop: SPACING.sm,
  },
  goldBtnLabel: {
    fontSize: FONTS.md, fontWeight: FONTS.bold,
    color: COLORS.cream, letterSpacing: 0.8,
  },

  optionalNote: {
    flexDirection: 'row', gap: SPACING.sm,
    backgroundColor: COLORS.cream, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  optionalIcon: { fontSize: 16 },
  optionalText: { flex: 1, fontSize: FONTS.sm, color: COLORS.textBody, lineHeight: 20 },

  skipBtn:  { alignItems: 'center', marginTop: SPACING.md },
  skipText: { fontSize: FONTS.sm, color: COLORS.textMuted },

  footer: {
    textAlign: 'center', fontSize: FONTS.xs, color: COLORS.textMuted,
    marginTop: SPACING.xl, lineHeight: 18, paddingHorizontal: SPACING.md,
  },
  footerLink: { color: COLORS.gold, fontWeight: FONTS.medium },
});
