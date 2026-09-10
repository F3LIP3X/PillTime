/** Paleta "Teal Trust" (docs/plan-tecnico-diseno.md). Contraste verificado WCAG AA sobre fondo claro/oscuro. */
export const lightColors = {
  primary: '#028090',
  secondary: '#00A896',
  accent: '#02C39A',
  background: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#5C6670',
  error: '#D64550',
} as const;

export const darkColors = {
  primary: '#02A6B8',
  secondary: '#00A896',
  accent: '#02C39A',
  background: '#121212',
  text: '#F2F2F2',
  textSecondary: '#A3ADB5',
  error: '#D64550',
} as const;

export type Colors = typeof lightColors;
