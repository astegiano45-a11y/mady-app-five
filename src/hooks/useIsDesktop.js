import { useWindowDimensions } from 'react-native';

export function useIsDesktop() {
  const { width } = useWindowDimensions();
  return width >= 768; // Desktop si ancho >= 768px
}
