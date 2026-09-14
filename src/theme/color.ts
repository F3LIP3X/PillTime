/**
 * Conversión OKLCH ↔ sRGB y contraste WCAG, sin dependencias. OKLCH es
 * perceptualmente uniforme: con la misma L, un azul y un rosa se ven
 * igual de claros, que es lo que permite generar paletas de cualquier
 * color con el mismo "peso" visual que la de marca.
 */

type Rgb = [number, number, number];

const lineal = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const gamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function hexARgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255) as Rgb;
}

export function rgbAHex([r, g, b]: Rgb): string {
  const canal = (c: number) =>
    Math.round(Math.min(1, Math.max(0, c)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${canal(r)}${canal(g)}${canal(b)}`.toUpperCase();
}

function oklabARgbLineal(L: number, a: number, b: number): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const dentroDeGama = (rgb: Rgb) => rgb.every((c) => c >= -0.0005 && c <= 1.0005);

/**
 * OKLCH → hex. Si el color no cabe en sRGB se reduce el croma (no la
 * luminosidad) hasta que cabe: así se conserva la claridad que se pidió,
 * que es lo que decide el contraste.
 */
export function oklch(L: number, C: number, H: number): string {
  const rad = (H * Math.PI) / 180;
  let croma = C;
  let rgb = oklabARgbLineal(L, croma * Math.cos(rad), croma * Math.sin(rad));
  while (!dentroDeGama(rgb) && croma > 0.0005) {
    croma *= 0.95;
    rgb = oklabARgbLineal(L, croma * Math.cos(rad), croma * Math.sin(rad));
  }
  return rgbAHex(rgb.map(gamma) as Rgb);
}

export function luminanciaRelativa(hex: string): number {
  const [r, g, b] = hexARgb(hex).map(lineal);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste WCAG 2.x (1 a 21). */
export function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminanciaRelativa(a), luminanciaRelativa(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}
