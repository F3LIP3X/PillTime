import * as Notifications from 'expo-notifications';
import { eq } from 'drizzle-orm';

import type { Db } from '@/db/client';
import { horariosMedicamento, medicamentos, type MomentoComida } from '@/db/schema';

try {
  // En Android dentro de Expo Go (no una development build) esta llamada
  // lanza "Android Push notifications... removed from Expo Go" desde
  // SDK 53, aunque solo usemos notificaciones locales — es una limitación
  // conocida de Expo Go, no un bug nuestro. Se captura para que importar
  // este módulo nunca tumbe la pantalla que lo usa (p. ej. alta de
  // medicamento); en una development build o en producción esto no salta.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (error) {
  console.warn('No se pudo configurar el manejador de notificaciones:', error);
}

type HorarioConMedicamento = {
  hora: string;
  diasSemana: string;
  nombreMedicamento: string;
  momentoComida: MomentoComida | null;
};

type GrupoNotificacion = {
  hora: string;
  dias: number[]; // ISO: 1=lunes … 7=domingo
  medicamentos: { nombre: string; momentoComida: MomentoComida | null }[];
};

function parseDiasSemana(csv: string): number[] {
  return csv.split(',').map(Number);
}

/** ISO 1=lunes…7=domingo → Expo Notifications 0=domingo…6=sábado. */
function isoADiaExpo(diaIso: number): number {
  return diaIso === 7 ? 0 : diaIso;
}

/**
 * Agrupa horarios que coinciden en hora exacta y mismos días para emitir
 * una sola notificación con varios medicamentos, en vez de una por
 * medicamento (evita fatiga de notificaciones, ver análisis de MyTherapy).
 */
export function agruparHorariosCoincidentes(filas: HorarioConMedicamento[]): GrupoNotificacion[] {
  const grupos = new Map<string, GrupoNotificacion>();

  for (const fila of filas) {
    const dias = parseDiasSemana(fila.diasSemana);
    const clave = `${fila.hora}|${[...dias].sort().join(',')}`;

    const existente = grupos.get(clave);
    if (existente) {
      existente.medicamentos.push({ nombre: fila.nombreMedicamento, momentoComida: fila.momentoComida });
    } else {
      grupos.set(clave, {
        hora: fila.hora,
        dias,
        medicamentos: [{ nombre: fila.nombreMedicamento, momentoComida: fila.momentoComida }],
      });
    }
  }

  return Array.from(grupos.values());
}

function textoMomentoComida(m: MomentoComida | null): string {
  if (m === 'antes') return ' (antes de comer)';
  if (m === 'despues') return ' (después de comer)';
  return '';
}

function contenidoDeGrupo(grupo: GrupoNotificacion) {
  const cuerpo = grupo.medicamentos
    .map((m) => `${m.nombre}${textoMomentoComida(m.momentoComida)}`)
    .join(', ');

  return {
    title: grupo.medicamentos.length > 1 ? 'Es hora de tus medicamentos' : 'Es hora de tu medicamento',
    body: cuerpo,
  };
}

/**
 * Reprograma TODAS las notificaciones locales a partir de los horarios
 * activos. Se cancela todo lo anterior primero: es más simple y fiable que
 * calcular un diff, y el volumen de notificaciones programadas por un uso
 * doméstico normal es bajo.
 *
 * Nunca lanza: si las notificaciones no están disponibles en el entorno
 * actual (Expo Go en Android desde SDK 53 — hace falta una development
 * build ahí — o el usuario denegó el permiso), se registra un aviso y se
 * continúa. Guardar un medicamento/horario en SQLite no debe depender de
 * que la programación de notificaciones tenga éxito.
 */
export async function reprogramarNotificaciones(db: Db) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const filas = await db
      .select({
        hora: horariosMedicamento.hora,
        diasSemana: horariosMedicamento.diasSemana,
        nombreMedicamento: medicamentos.nombre,
        momentoComida: medicamentos.momentoComida,
      })
      .from(horariosMedicamento)
      .innerJoin(medicamentos, eq(medicamentos.id, horariosMedicamento.medicamentoId))
      .where(eq(horariosMedicamento.activo, true));

    const grupos = agruparHorariosCoincidentes(filas);

    for (const grupo of grupos) {
      const [hour, minute] = grupo.hora.split(':').map(Number);
      const contenido = contenidoDeGrupo(grupo);

      for (const diaIso of grupo.dias) {
        await Notifications.scheduleNotificationAsync({
          content: contenido,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: isoADiaExpo(diaIso),
            hour,
            minute,
          },
        });
      }
    }
  } catch (error) {
    console.warn('No se pudieron reprogramar las notificaciones:', error);
  }
}
