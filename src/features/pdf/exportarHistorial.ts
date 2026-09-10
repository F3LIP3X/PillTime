import { eq } from 'drizzle-orm';
import * as Print from 'expo-print';

import type { Db } from '@/db/client';
import { medicamentos, tomas } from '@/db/schema';

/** Genera el PDF en el propio dispositivo (sin backend) y devuelve la ruta del archivo. */
export async function exportarHistorialAPdf(db: Db) {
  const filas = await db
    .select({
      medicamento: medicamentos.nombre,
      dosis: medicamentos.dosis,
      fechaHoraProgramada: tomas.fechaHoraProgramada,
      estado: tomas.estado,
    })
    .from(tomas)
    .innerJoin(medicamentos, eq(medicamentos.id, tomas.medicamentoId))
    .orderBy(tomas.fechaHoraProgramada);

  const filasHtml = filas
    .map(
      (f) =>
        `<tr><td>${f.medicamento}</td><td>${f.dosis}</td><td>${f.fechaHoraProgramada}</td><td>${f.estado}</td></tr>`,
    )
    .join('');

  const html = `
    <html>
      <body>
        <h1>Historial de tomas — PillTime</h1>
        <table border="1" cellpadding="6" style="border-collapse: collapse; width: 100%;">
          <tr><th>Medicamento</th><th>Dosis</th><th>Fecha y hora</th><th>Estado</th></tr>
          ${filasHtml}
        </table>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}
