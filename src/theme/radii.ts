/**
 * Radios de esquina. La escala sube rápido a propósito: los contenedores
 * grandes (tarjetas, hojas) llevan radios generosos y los controles
 * pequeños radios contenidos — mezclarlos al azar es lo que hace que una
 * interfaz parezca "de plantilla".
 */
export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  /** Para píldoras y círculos: cualquier valor mayor que la mitad del alto. */
  pill: 999,
} as const;
