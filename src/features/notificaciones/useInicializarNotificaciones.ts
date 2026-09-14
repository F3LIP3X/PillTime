import { useEffect, useState } from 'react';

import { configurarCanalAndroid, solicitarPermisoNotificaciones } from './scheduler';

/**
 * Prepara las notificaciones una vez al arrancar: crea el canal de
 * Android (define el sonido y la importancia de los avisos) y pide el
 * permiso si hace falta.
 *
 * El orden importa: el canal primero, porque en Android el diálogo de
 * permiso se muestra mejor cuando ya existe el canal al que se refiere.
 *
 * Devuelve si las notificaciones quedaron utilizables, para que la
 * interfaz pueda avisar en lugar de programar recordatorios silenciosos
 * que el usuario nunca vería. En Expo Go sobre Android siempre será
 * `false` (ver CLAUDE.md): ahí no hay notificaciones que valgan.
 */
export function useInicializarNotificaciones(pedirPermiso: boolean) {
  const [permitidas, setPermitidas] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      await configurarCanalAndroid();
      if (!pedirPermiso) return;
      const concedido = await solicitarPermisoNotificaciones();
      if (!cancelado) setPermitidas(concedido);
    })();

    return () => {
      cancelado = true;
    };
  }, [pedirPermiso]);

  return permitidas;
}
