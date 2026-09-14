import type * as NotificacionesTipo from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { Db } from '@/db/client';
import { cargarOcurrencias } from '@/features/tomas/cargarOcurrencias';
import { MS_DIA } from '@/features/tomas/ocurrencias';
import { agruparPorMinuto, contenidoDeAviso } from './agrupar';

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

/**
 * Canal de Android donde caen todos los recordatorios de toma.
 *
 * En Android 8+ el sonido y la prioridad los decide el CANAL, no la
 * notificación: sin un canal con importancia alta, el aviso aparece
 * mudo y sin emerger en pantalla, que para un recordatorio de
 * medicación equivale a no avisar. El id se pasa luego en cada
 * `trigger.channelId` — si se programa una notificación sin él, Android
 * la manda al canal por defecto y se pierde esta configuración.
 *
 * Ojo: Android solo deja cambiar el nombre y la descripción de un canal
 * ya creado. Si en el futuro hay que cambiarle el sonido o la
 * importancia, hay que usar un id nuevo (p. ej. 'recordatorios-v2'),
 * porque reconfigurar el existente no tiene efecto.
 */
export const CANAL_RECORDATORIOS = 'recordatorios-tomas';

export async function configurarCanalAndroid() {
  if (Platform.OS !== 'android') return;
  const Notifications = cargarNotificaciones();
  if (!Notifications) return;

  try {
    await Notifications.setNotificationChannelAsync(CANAL_RECORDATORIOS, {
      name: 'Recordatorios de tomas',
      description: 'Avisos a la hora de cada medicamento',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
  } catch (error) {
    console.warn('No se pudo crear el canal de notificaciones:', error);
  }
}

/**
 * Pide el permiso de notificaciones si aún no está concedido. En Android
 * 13+ el permiso está DENEGADO por defecto hasta que la app lo pide, así
 * que sin esta llamada no suena nada por mucho que se programe.
 *
 * Devuelve si quedó concedido, para que la interfaz pueda avisar al
 * usuario en vez de programar recordatorios que nunca va a ver.
 */
export async function solicitarPermisoNotificaciones(): Promise<boolean> {
  const Notifications = cargarNotificaciones();
  if (!Notifications) return false;

  try {
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return true;
    // No se vuelve a pedir si el usuario ya dijo que no y el sistema no
    // permite volver a preguntar: ahí hay que ir a los ajustes del SO.
    if (!actual.canAskAgain) return false;

    const solicitado = await Notifications.requestPermissionsAsync();
    return solicitado.granted;
  } catch (error) {
    console.warn('No se pudo solicitar el permiso de notificaciones:', error);
    return false;
  }
}

/**
 * Cuántos días por delante se programan avisos, y cuántos como máximo.
 *
 * Todos los avisos son puntuales (trigger DATE), así que hay que
 * programarlos con antelación y renovar la ventana: se hace cada vez que
 * se abre Inicio y tras cualquier cambio en tomas o medicamentos. Si la
 * app no se abre en VENTANA_DIAS días, los avisos se acaban.
 *
 * El tope existe porque los sistemas limitan las alarmas por app: iOS
 * solo conserva 64 notificaciones locales programadas y muchos Android
 * (Samsung en particular) rechazan pasar de 500.
 */
const VENTANA_DIAS = 14;
const MAX_AVISOS = Platform.OS === 'ios' ? 60 : 300;

/**
 * Deja programados en el sistema exactamente los avisos de las tomas
 * pendientes de los próximos días: cancela todo y vuelve a programar a
 * partir de SQLite.
 *
 * Sustituye a las dos funciones anteriores (triggers WEEKLY recurrentes
 * para 'semanal' + DATE para 'intervalo'), que tenían tres fallos reales:
 * 1. Un aviso semanal recurrente no sabe nada del estado de la toma: al
 *    omitirla (o eliminarla, o tomarla antes de hora) seguía sonando.
 * 2. Mapeaban el día ISO al `weekday` de Expo como si 0 fuera domingo,
 *    pero Expo usa 1=domingo…7=sábado. Todos los avisos caían un día
 *    antes y el domingo salía `weekday: 0`, que lanza RangeError: como el
 *    bucle iba dentro de un solo try/catch, a partir de ahí ya no se
 *    programaba nada más (de ahí "solo avisa de uno").
 * 3. Reprogramar las semanales cancelaba también los avisos de los
 *    tratamientos por intervalo.
 * Ahora todo sale de un único cálculo (`cargarOcurrencias`), así que
 * cancelarlo todo es correcto: lo que siga pendiente vuelve a programarse.
 *
 * Las llamadas se serializan: si llega una mientras otra está en marcha,
 * se repite al acabar en vez de solaparse (dos "cancelar todo + programar"
 * intercalados dejarían avisos duplicados).
 *
 * Nunca lanza: guardar datos no debe depender de que haya notificaciones
 * (Expo Go en Android, permiso denegado…).
 */
let sincronizacionEnCurso: Promise<void> | null = null;
let repetirSincronizacion = false;

export function sincronizarNotificaciones(db: Db): Promise<void> {
  if (sincronizacionEnCurso) {
    repetirSincronizacion = true;
    return sincronizacionEnCurso;
  }

  sincronizacionEnCurso = (async () => {
    do {
      repetirSincronizacion = false;
      await sincronizarUnaVez(db);
    } while (repetirSincronizacion);
  })().finally(() => {
    sincronizacionEnCurso = null;
  });

  return sincronizacionEnCurso;
}

async function sincronizarUnaVez(db: Db) {
  const Notifications = cargarNotificaciones();
  if (!Notifications) return;

  try {
    const ahora = new Date();
    const ocurrencias = await cargarOcurrencias(db, ahora, new Date(ahora.getTime() + VENTANA_DIAS * MS_DIA));
    const grupos = agruparPorMinuto(ocurrencias)
      .filter((g) => g.fecha.getTime() > ahora.getTime())
      .slice(0, MAX_AVISOS);

    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const grupo of grupos) {
      // try/catch por aviso: que uno falle no debe dejar sin programar el resto.
      try {
        await Notifications.scheduleNotificationAsync({
          content: contenidoDeAviso(grupo),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: grupo.fecha,
            channelId: CANAL_RECORDATORIOS,
          },
        });
      } catch (error) {
        console.warn('No se pudo programar un aviso:', error);
      }
    }
  } catch (error) {
    console.warn('No se pudieron sincronizar las notificaciones:', error);
  }
}
