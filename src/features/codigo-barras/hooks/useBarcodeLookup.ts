import { useCallback } from 'react';
import { eq } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { codigosBarrasAprendidos } from '@/db/schema';

/**
 * Busca un código de barras ya "aprendido" (escaneado y rellenado a mano
 * previamente) para autocompletar el alta de un nuevo medicamento.
 * No hay catálogo externo de medicamentos: si no existe, devuelve null y
 * el usuario rellena el formulario a mano como de costumbre.
 */
export function useBarcodeLookup() {
  const db = useDb();

  return useCallback(
    async (codigoBarras: string) => {
      const [encontrado] = await db
        .select()
        .from(codigosBarrasAprendidos)
        .where(eq(codigosBarrasAprendidos.codigoBarras, codigoBarras))
        .limit(1);

      return encontrado ?? null;
    },
    [db],
  );
}
