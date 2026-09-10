import { Platform } from 'react-native';

/**
 * Fuentes del sistema como base (San Francisco en iOS, Roboto en Android):
 * reduce el peso de la app y respeta el escalado de accesibilidad del SO
 * (Dynamic Type / Font Scale) mejor que una fuente empaquetada.
 */
export const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const typography = {
  title: { fontFamily, fontWeight: '700' as const, fontSize: 28 },
  subtitle: { fontFamily, fontWeight: '700' as const, fontSize: 22 },
  // Nunca menos de 14pt en móvil (docs/plan-tecnico-diseno.md).
  body: { fontFamily, fontWeight: '400' as const, fontSize: 16 },
  bodySmall: { fontFamily, fontWeight: '400' as const, fontSize: 14 },
  caption: { fontFamily, fontWeight: '400' as const, fontSize: 12 },
};
