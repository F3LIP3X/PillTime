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
  /**
   * Texto e iconos SOBRE el primario. En claro es blanco (4,67:1 con
   * #028090). En oscuro NO: el primario del plan (#02A6B8) está pensado
   * para contrastar con el fondo oscuro, y con texto blanco encima solo
   * da 2,94:1; con este casi negro da más de 6:1.
   */
  onPrimary: '#FFFFFF',
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

  /**
   * Series de gráficas. No son el primario: el teal de marca en claro se
   * queda justo bajo el mínimo de croma para series (se lee grisáceo), así
   * que se usa un paso más saturado de la misma familia. Validado con el
   * validador de paleta (luminosidad, croma, daltonismo, contraste) contra
   * `surface` en claro y en oscuro.
   */
  serie1: '#008A9C',
  serie2: '#EB6834',
  /** Rejilla y eje de gráficas: un paso sobre la superficie, recesivos. */
  rejilla: '#E4EBEC',
  eje: '#C5D0D2',

  /**
   * Fases del ciclo menstrual en el calendario. Fijos en todos los colores
   * de la app (como los estados): validados como par para daltonismo y con
   * `onFase` encima ≥ 4,5:1. Siempre acompañados de leyenda y de una marca
   * distinta (relleno / borde discontinuo / punto), nunca solo color.
   */
  menstruacion: '#C2255C',
  menstruacionSoft: '#FBE3EC',
  fertil: '#5F4BD0',
  fertilSoft: '#ECE9FB',
  onFase: '#FFFFFF',
};

export const darkColors: Colors = {
  primary: '#02A6B8',
  primaryPressed: '#028C9B',
  primarySoft: '#0D2B30',
  onPrimary: '#0B1A1C',
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

  serie1: '#02A6B8',
  serie2: '#D95926',
  rejilla: '#263030',
  eje: '#3A4545',

  menstruacion: '#E0588A',
  menstruacionSoft: '#3A1824',
  fertil: '#8A7CF0',
  fertilSoft: '#25213F',
  onFase: '#161012',
};

export type Colors = { [K in keyof typeof lightColors]: string };
