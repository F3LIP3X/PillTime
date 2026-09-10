import { eq } from 'drizzle-orm';
// SDK 57 sustituyó la API imperativa de expo-file-system (cacheDirectory,
// copyAsync...) por clases File/Directory nuevas; se usa el import de
// compatibilidad expo-file-system/legacy para no reescribir esto con una
// API experimental que aún no está bien documentada.
import * as FileSystem from 'expo-file-system/legacy';
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

  /**
   * expo-print escribe el PDF en un directorio propio que el
   * FileProvider de expo-sharing no siempre puede leer directamente en
   * Android ("Not allowed to read file under given URL" — confirmado en
   * dispositivo real). El arreglo estándar es copiar el archivo a
   * FileSystem.cacheDirectory con nombre y extensión .pdf explícitos
   * antes de compartirlo; ese directorio sí está cubierto por el
   * FileProvider que usa expo-sharing.
   */
  const destino = `${FileSystem.cacheDirectory}historial-pilltime-${Date.now()}.pdf`;
  await FileSystem.copyAsync({ from: uri, to: destino });
  return destino;
}
