import { useCallback, useEffect, useState } from 'react';
import { eq } from 'drizzle-orm';

import { useDb } from '@/db/client';
import { horariosMedicamento, medicamentos } from '@/db/schema';

export function useMedicamento(id: number) {
  const db = useDb();
  const [medicamento, setMedicamento] = useState<typeof medicamentos.$inferSelect | null>(null);
  const [horarios, setHorarios] = useState<(typeof horariosMedicamento.$inferSelect)[]>([]);

  const recargar = useCallback(async () => {
    const [fila] = await db.select().from(medicamentos).where(eq(medicamentos.id, id)).limit(1);
    setMedicamento(fila ?? null);

    const filasHorarios = await db
      .select()
      .from(horariosMedicamento)
      .where(eq(horariosMedicamento.medicamentoId, id));
    setHorarios(filasHorarios);
  }, [db, id]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { medicamento, horarios, recargar };
}
