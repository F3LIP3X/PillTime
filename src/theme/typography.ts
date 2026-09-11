import { Platform, type TextStyle } from 'react-native';

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

const fontFamilyMedia = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'System',
});

/**
 * Escala tipográfica con `letterSpacing` y `lineHeight` explícitos. Los
 * títulos grandes llevan tracking negativo (a tamaño grande, el espaciado
 * por defecto se ve suelto) y el texto pequeño tracking positivo (a
 * tamaño pequeño, apretado se lee peor). Es el detalle que más separa una
 * pantalla "puesta" de una cuidada, y no cuesta nada.
 *
 * Cuerpo a 17pt: por encima del mínimo de 14pt del plan de diseño y el
 * tamaño con el que mejor se lee de un vistazo, que es como se usa una
 * app de recordatorios.
 */
export const typography = {
  largeTitle: {
    fontFamily,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 38,
  } satisfies TextStyle,
  title: {
    fontFamily,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.35,
    lineHeight: 29,
  } satisfies TextStyle,
  subtitle: {
    fontFamily: fontFamilyMedia,
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 24,
  } satisfies TextStyle,
  body: {
    fontFamily,
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.1,
    lineHeight: 23,
  } satisfies TextStyle,
  bodyStrong: {
    fontFamily: fontFamilyMedia,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.1,
    lineHeight: 23,
  } satisfies TextStyle,
  bodySmall: {
    fontFamily,
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.05,
    lineHeight: 20,
  } satisfies TextStyle,
  caption: {
    fontFamily,
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 17,
  } satisfies TextStyle,
  /** Etiquetas de sección en mayúsculas, estilo lista agrupada. */
  overline: {
    fontFamily: fontFamilyMedia,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.7,
    lineHeight: 16,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  /** Cifras grandes (hora de la próxima toma): tracking cerrado y peso alto. */
  numeroGrande: {
    fontFamily,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 40,
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,
};
