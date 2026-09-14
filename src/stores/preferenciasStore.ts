import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import Storage from 'expo-sqlite/kv-store';

import type { ColorBase } from '@/theme/paletas';

export type PreferenciaTema = 'sistema' | 'claro' | 'oscuro';

/**
 * Preferencias del usuario que deben sobrevivir a cerrar la app: tema y
 * color. Zustand (estado de UI) + `persist` sobre el almacén clave-valor de
 * expo-sqlite (`expo-sqlite/kv-store`, un SQLite aparte de pilltime.db).
 *
 * Decisión: esto NO va en una tabla de Drizzle. Son unos pocos valores
 * sueltos que se leen al arrancar, antes de que existan la conexión de
 * SQLiteProvider y las migraciones, y el kv-store tiene API síncrona: el
 * store se hidrata al importarse y la primera pantalla ya sale con el
 * color correcto, sin parpadeo. Los datos de salud siguen en Drizzle.
 *
 * Antes la preferencia de tema vivía en un store sin persistir y se
 * perdía al cerrar la app.
 */
const almacenSincrono: StateStorage = {
  getItem: (clave) => Storage.getItemSync(clave),
  setItem: (clave, valor) => Storage.setItemSync(clave, valor),
  removeItem: (clave) => {
    Storage.removeItemSync(clave);
  },
};

type PreferenciasStore = {
  tema: PreferenciaTema;
  colorBase: ColorBase;
  setTema: (tema: PreferenciaTema) => void;
  setColorBase: (color: ColorBase) => void;
};

export const usePreferenciasStore = create<PreferenciasStore>()(
  persist(
    (set) => ({
      tema: 'sistema',
      colorBase: 'teal',
      setTema: (tema) => set({ tema }),
      setColorBase: (colorBase) => set({ colorBase }),
    }),
    {
      name: 'pilltime-preferencias',
      storage: createJSONStorage(() => almacenSincrono),
      version: 1,
    },
  ),
);
