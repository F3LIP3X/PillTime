/**
 * Paleta "Teal Trust" (docs/plan-tecnico-diseno.md), ampliada con los
 * tokens de superficie que el documento no cubría (surface, separator,
 * tintes suaves...). Los colores de marca del documento se respetan tal
 * cual; lo añadido son grises derivados con una pizca de teal para que
 * no se vean "sucios" al lado del primario.
 *
 * Matiz deliberado: el fondo de pantalla NO es blanco puro sino un gris
 * muy tenue, y las tarjetas sí son blancas. Es lo que da sensación de
 * profundidad sin cargar de sombras (mismo recurso que usa iOS con sus
 * fondos agrupados). El blanco del documento sigue siendo el color
 * dominante, porque las tarjetas ocupan la mayor parte de la pantalla.
 */
export const lightColors = {
  primary: '#028090',
  primaryPressed: '#016977',
  /** Tinte suave del primario: círculos de icono, badges, fondos de énfasis. */
  primarySoft: '#E1EFF1',
  secondary: '#00A896',
  accent: '#02C39A',

  /** Fondo de pantalla (gris teal muy tenue). */
  background: '#F3F7F7',
  /** Tarjetas y filas de lista. */
  surface: '#FFFFFF',
  /** Relleno sutil: inputs, segmented control, estados vacíos. */
  fill: '#EAF0F1',

  text: '#14201F',
  textSecondary: '#5C6670',
  textTertiary: '#8B979C',
  /** Línea de separación fina entre filas de una misma tarjeta. */
  separator: '#E4EBEC',

  error: '#D64550',
  errorSoft: '#FBEBEC',
  success: '#04916F',
  successSoft: '#E2F4EE',
  warning: '#B9761B',
  warningSoft: '#FBF0E1',
} as const;

export const darkColors = {
  primary: '#02A6B8',
  primaryPressed: '#028C9B',
  primarySoft: '#0D2B30',
  secondary: '#00A896',
  accent: '#02C39A',

  background: '#121212',
  surface: '#1B2222',
  fill: '#232B2B',

  text: '#F2F2F2',
  textSecondary: '#A3ADB5',
  textTertiary: '#77838A',
  separator: '#2A3333',

  error: '#FF6B74',
  errorSoft: '#2C1719',
  success: '#02C39A',
  successSoft: '#102E27',
  warning: '#E2A44A',
  warningSoft: '#2C2314',
} as const;

export type Colors = typeof lightColors;
