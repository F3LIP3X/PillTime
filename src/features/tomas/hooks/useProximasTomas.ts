import { useCallback, useEffect, useState } from 'react';

import { useDb } from '@/db/client';
import { sincronizarNotificaciones } from '@/features/notificaciones/scheduler';
import { cargarOcurrencias, eliminarOcurrencia } from '@/features/tomas/cargarOcurrencias';
import { finDelDia, inicioDelDia, type Ocurrencia } from '@/features/tomas/ocurrencias';

/**
 * Tomas previstas de un medicamento desde el inicio de hoy (incluidas las
 * de hoy aún sin marcar) hasta dentro de `dias` días. Mezcla filas ya
 * creadas y ocurrencias futuras de pautas semanales que todavía no
 * existen en la tabla (ver ocurrencias.ts).
 */
export function useProximasTomas(medicamentoId: number, dias = 7) {
  const db = useDb();
  const [tomasPrevistas, setTomasPrevistas] = useState<Ocurrencia[]>([]);

  const recargar = useCallback(async () => {
    const hoy = new Date();
    const hasta = finDelDia(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias));
    setTomasPrevistas(await cargarOcurrencias(db, inicioDelDia(hoy), hasta, { medicamentoId }));
  }, [db, medicamentoId, dias]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { tomasPrevistas, recargar };
}

/** Quita una toma prevista concreta (real o virtual) sin tocar el resto de la pauta. */
export function useEliminarTomaPrevista() {
  const db = useDb();

  return useCallback(
    async (ocurrencia: Ocurrencia) => {
      await eliminarOcurrencia(db, ocurrencia);
      void sincronizarNotificaciones(db);
    },
    [db],
  );
}
