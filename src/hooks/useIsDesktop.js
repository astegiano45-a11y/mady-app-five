import { useWindowDimensions } from 'react-native';

// Punto de corte único para toda la app: por debajo se mantiene el diseño
// tipo app (mobile), por encima se activa el layout tipo web/landing.
export const DESKTOP_BREAKPOINT = 900;

export function useIsDesktop() {
  const { width } = useWindowDimensions();
  return width >= DESKTOP_BREAKPOINT;
}
