import type * as NotificacionesTipo from 'expo-notifications';
import { eq } from 'drizzle-orm';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { Db } from '@/db/client';
import { horariosMedicamento, medicamentos, type MomentoComida } from '@/db/schema';

type ModuloNotificaciones = typeof NotificacionesTipo;

// undefined = todavía no se ha intentado cargar; null = se intentó y falló
// (o se descartó a propósito, ver ES_EXPO_GO_ANDROID más abajo).
let notificacionesCache: ModuloNotificaciones | null | undefined;

/**
 * En Android dentro de Expo Go (no una development build), el simple
 * `require('expo-notifications')` lanza "Android Push notifications...
 * removed from Expo Go" desde SDK 53 durante la propia evaluación del
 * módulo — antes de ejecutar ninguna línea propia. Un try/catch alrededor
 * SÍ evita que la excepción tumbe la app, pero no evita que el propio
 * sistema de módulos de Metro (`guardedLoadModule`) reporte igualmente el
 * fallo como "Uncaught Error" en el LogBox (solo en dev, no pasa en
 * producción ni en una development build real). Para no generar ese
 * aviso falsamente alarmante en cada intento, se detecta Expo Go en
 * Android de antemano con `expo-constants` y directamente NO se intenta
 * cargar el paquete ahí — no es solo "cargar y capturar el error".
 *
 * `Constants.appOwnership === 'expo'` está deprecado a favor de
 * `executionEnvironment`, pero ese nuevo valor (`StoreClient`) agrupa
 * Expo Go CON las development builds — y en una development build
 * expo-notifications sí funciona, así que usarlo aquí apagaría
 * notificaciones también donde sí deberían funcionar. `appOwnership`
 * sigue siendo la señal correcta para este caso concreto.
 */
const ES_EXPO_GO_ANDROID = Platform.OS === 'android' && Constants.appOwnership === 'expo';

function cargarNotificaciones(): ModuloNotificaciones | null {
  if (notificacionesCache !== undefined) return notificacionesCache;

  if (ES_EXPO_GO_ANDROID) {
    console.warn(
      'expo-notifications no está disponible en Expo Go para Android (SDK 53+); hace falta una development build. Ver CLAUDE.md.',
    );
    notificacionesCache = null;
    return notificacionesCache;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const modulo = require('expo-notifications') as ModuloNotificaciones;
    modulo.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notificacionesCache = modulo;
  } catch (error) {
    console.warn('expo-notifications no está disponible en este entorno:', error);
    notificacionesCache = null;
  }

  return notificacionesCache;
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
 * Nunca lanza: si expo-notifications no está disponible en el entorno
 * actual (Expo Go en Android desde SDK 53 — hace falta una development
 * build ahí — o el usuario denegó el permiso), se registra un aviso y se
 * continúa sin programar nada. Guardar un medicamento/horario en SQLite
 * no debe depender de que la programación de notificaciones tenga éxito.
 */
export async function reprogramarNotificaciones(db: Db) {
  const Notifications = cargarNotificaciones();
  if (!Notifications) return;

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
