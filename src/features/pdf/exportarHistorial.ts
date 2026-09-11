import { eq, ne } from 'drizzle-orm';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';

import type { Db } from '@/db/client';
import { medicamentos, tomas } from '@/db/schema';

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  tomado: 'Tomado',
  omitido: 'Omitido',
  pospuesto: 'Pospuesto',
};

/** El nombre del medicamento lo escribe el usuario: escaparlo antes de meterlo en el HTML. */
function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Genera el PDF del historial en el propio dispositivo (sin backend) y
 * devuelve la ruta del archivo listo para compartir.
 */
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
    // 'eliminada' es un tombstone (ver schema.ts): no debe salir en el informe.
    .where(ne(tomas.estado, 'eliminada'))
    .orderBy(tomas.fechaHoraProgramada);

  const filasHtml = filas
    .map(
      (f) =>
        `<tr><td>${escaparHtml(f.medicamento)}</td><td>${escaparHtml(f.dosis)}</td><td>${formatearFecha(
          f.fechaHoraProgramada,
        )}</td><td>${ETIQUETA_ESTADO[f.estado] ?? f.estado}</td></tr>`,
    )
    .join('');

  const html = `
    <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family: -apple-system, Roboto, sans-serif; color: #14201F;">
        <h1 style="font-size: 20px; margin-bottom: 4px;">Historial de tomas</h1>
        <p style="color: #5C6670; font-size: 12px; margin-top: 0;">
          PillTime · generado el ${formatearFecha(new Date().toISOString())}
        </p>
        <table style="border-collapse: collapse; width: 100%; font-size: 12px;">
          <thead>
            <tr style="background: #E1EFF1;">
              <th align="left" style="padding: 6px; border: 1px solid #D3DEDF;">Medicamento</th>
              <th align="left" style="padding: 6px; border: 1px solid #D3DEDF;">Dosis</th>
              <th align="left" style="padding: 6px; border: 1px solid #D3DEDF;">Fecha y hora</th>
              <th align="left" style="padding: 6px; border: 1px solid #D3DEDF;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${filasHtml || '<tr><td colspan="4" style="padding: 12px;">Sin tomas registradas.</td></tr>'}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  /**
   * expo-print escribe el PDF en un directorio propio con un nombre
   * aleatorio y sin extensión fiable, que el FileProvider de
   * expo-sharing no siempre puede leer en Android ("Not allowed to read
   * file under given URL"). Se copia a la caché de la app con nombre y
   * extensión .pdf explícitos, que sí es una ruta compartible.
   *
   * Se usa la API nueva de expo-file-system (File/Paths). El intento
   * anterior con `expo-file-system/legacy` fallaba: ese módulo resuelve
   * con `requireOptionalNativeModule` y, cuando el módulo nativo legacy
   * no está presente (Expo Go en SDK 57), cae a un shim cuyo
   * `cacheDirectory` es `null` — la ruta destino quedaba en
   * "nullhistorial-....pdf" y la copia reventaba.
   */
  const origen = new File(uri);
  const destino = new File(Paths.cache, `historial-pilltime-${Date.now()}.pdf`);
  if (destino.exists) destino.delete();
  await origen.copy(destino);

  return destino.uri;
}
