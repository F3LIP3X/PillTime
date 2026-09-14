/** Traduce los errores de SQLite que el usuario puede provocar al guardar un medicamento. */
export function mensajeErrorGuardado(error: unknown): string {
  const texto = error instanceof Error ? error.message : String(error);
  if (texto.includes('UNIQUE') && texto.includes('codigo_barras')) {
    return 'Ese código de barras ya está asignado a otro medicamento.';
  }
  return texto;
}
