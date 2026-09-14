import { contraste, oklch } from './color';
import { darkColors, lightColors, type Colors } from './colors';

/**
 * Colores base que el usuario puede elegir en Ajustes. 'teal' es la
 * paleta de marca "Teal Trust" tal cual (docs/plan-tecnico-diseno.md); el
 * resto se generan con `generarPaleta` a partir de su tono y croma.
 *
 * Decisión: una lista cerrada de colores y no un selector libre. Con un
 * color cualquiera no se puede garantizar el contraste sin desvirtuarlo
 * (un amarillo "accesible" con texto blanco acaba siendo marrón) y hay
 * tonos que chocan con los colores de estado (un rojo base se confunde
 * con error). Por eso no hay rojo ni naranja/ámbar.
 */
export const COLORES_BASE = {
  teal: { nombre: 'Teal', tono: 205, croma: 0.1 },
  azul: { nombre: 'Azul', tono: 255, croma: 0.13 },
  verde: { nombre: 'Verde', tono: 150, croma: 0.12 },
  morado: { nombre: 'Morado', tono: 300, croma: 0.13 },
  rosa: { nombre: 'Rosa', tono: 355, croma: 0.14 },
  grafito: { nombre: 'Grafito', tono: 240, croma: 0.02 },
} as const;

export type ColorBase = keyof typeof COLORES_BASE;

/**
 * Busca la luminosidad OKLCH más cercana a `inicial` (moviéndose en
 * `direccion`) con la que el color cumple `cumple`. Contraste por
 * construcción, no a ojo.
 */
function ajustarLuminosidad(inicial: number, direccion: 1 | -1, C: number, H: number, cumple: (hex: string) => boolean) {
  for (let L = inicial; L >= 0.05 && L <= 0.97; L += 0.005 * direccion) {
    const hex = oklch(L, C, H);
    if (cumple(hex)) return { L, hex };
  }
  const L = direccion === 1 ? 0.97 : 0.05;
  return { L, hex: oklch(L, C, H) };
}

/**
 * Paleta completa a partir de un tono. Garantías (comprobadas en la
 * prueba de paletas para todos los colores y ambos temas):
 * - Texto sobre el primario (`onPrimary`) ≥ 4,5:1.
 * - Primario sobre `primarySoft` y sobre el fondo ≥ 4,5:1 (en botones
 *   secundarios y enlaces se usa como color de texto).
 * - Texto secundario ≥ 4,5:1 sobre fondo y superficie.
 * Los colores de estado (éxito, error, aviso) y las series de gráficas no
 * cambian con el tema: su significado no debe depender del color elegido.
 */
export function generarPaleta(base: ColorBase, esOscuro: boolean): Colors {
  const { tono: H, croma: C } = COLORES_BASE[base];
  const estados = esOscuro ? darkColors : lightColors;

  if (!esOscuro) {
    const background = oklch(0.975, Math.min(C, 0.006), H);
    const primarySoft = oklch(0.95, Math.min(C, 0.03), H);
    const primary = ajustarLuminosidad(0.62, -1, C, H, (hex) =>
      contraste(hex, '#FFFFFF') >= 4.5 && contraste(hex, primarySoft) >= 4.5 && contraste(hex, background) >= 4.5,
    );
    return {
      ...estados,
      primary: primary.hex,
      primaryPressed: oklch(primary.L - 0.06, C, H),
      primarySoft,
      onPrimary: '#FFFFFF',
      secondary: oklch(primary.L + 0.06, C, H + 12),
      accent: oklch(primary.L + 0.14, C, H + 20),
      background,
      surface: '#FFFFFF',
      fill: oklch(0.945, Math.min(C, 0.012), H),
      campo: '#FFFFFF',
      bordeCampo: ajustarLuminosidad(0.66, -1, Math.min(C, 0.02), H, (hex) => contraste(hex, '#FFFFFF') >= 3.2).hex,
      text: oklch(0.2, Math.min(C, 0.015), H),
      textSecondary: ajustarLuminosidad(0.5, -1, Math.min(C, 0.015), H, (hex) => contraste(hex, background) >= 4.6).hex,
      textTertiary: oklch(0.64, Math.min(C, 0.012), H),
      separator: oklch(0.925, Math.min(C, 0.01), H),
      rejilla: oklch(0.925, Math.min(C, 0.01), H),
      eje: oklch(0.84, Math.min(C, 0.012), H),
    };
  }

  const background = '#121212';
  const surface = oklch(0.235, Math.min(C, 0.012), H);
  const primarySoft = oklch(0.3, Math.min(C, 0.05), H);
  const primary = ajustarLuminosidad(0.62, 1, C, H, (hex) => contraste(hex, surface) >= 4.5 && contraste(hex, primarySoft) >= 4.5);
  return {
    ...estados,
    primary: primary.hex,
    primaryPressed: oklch(primary.L - 0.06, C, H),
    primarySoft,
    onPrimary: oklch(0.18, Math.min(C, 0.03), H),
    secondary: oklch(primary.L - 0.04, C, H + 12),
    accent: oklch(primary.L + 0.06, C, H + 20),
    background,
    surface,
    fill: oklch(0.27, Math.min(C, 0.012), H),
    campo: background,
    bordeCampo: ajustarLuminosidad(0.5, 1, Math.min(C, 0.02), H, (hex) => contraste(hex, surface) >= 3.2).hex,
    text: '#F2F2F2',
    textSecondary: ajustarLuminosidad(0.74, 1, Math.min(C, 0.012), H, (hex) => contraste(hex, surface) >= 4.6).hex,
    textTertiary: oklch(0.6, Math.min(C, 0.012), H),
    separator: oklch(0.3, Math.min(C, 0.01), H),
    rejilla: oklch(0.29, Math.min(C, 0.01), H),
    eje: oklch(0.38, Math.min(C, 0.012), H),
  };
}

const cache = new Map<string, Colors>();

export function paletaDe(base: ColorBase, esOscuro: boolean): Colors {
  if (base === 'teal') return esOscuro ? darkColors : lightColors;
  const clave = `${base}-${esOscuro}`;
  let paleta = cache.get(clave);
  if (!paleta) {
    paleta = generarPaleta(base, esOscuro);
    cache.set(clave, paleta);
  }
  return paleta;
}
