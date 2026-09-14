import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import Storage from 'expo-sqlite/kv-store';

import type { ColorBase } from '@/theme/paletas';

export type PreferenciaTema = 'sistema' | 'claro' | 'oscuro';
export type Sexo = 'mujer' | 'hombre';

/**
 * Preferencias del usuario que deben sobrevivir a cerrar la app: tema,
 * color, si ya vio el onboarding y el sexo elegido en él (decide si se
 * muestra la pestaña de ciclo menstrual). Zustand (estado de UI) + `persist` sobre el almacén clave-valor de
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
  /** false hasta terminar el onboarding. Borrar los datos de la app lo devuelve a false. */
  onboardingCompletado: boolean;
  /** null solo antes del onboarding. */
  sexo: Sexo | null;
  /** Aviso opcional unos días antes de la próxima regla estimada. */
  recordatorioCiclo: boolean;
  setTema: (tema: PreferenciaTema) => void;
  setColorBase: (color: ColorBase) => void;
  setSexo: (sexo: Sexo) => void;
  completarOnboarding: () => void;
  setRecordatorioCiclo: (activo: boolean) => void;
};

export const usePreferenciasStore = create<PreferenciasStore>()(
  persist(
    (set) => ({
      tema: 'sistema',
      colorBase: 'teal',
      onboardingCompletado: false,
      sexo: null,
      recordatorioCiclo: false,
      setTema: (tema) => set({ tema }),
      setColorBase: (colorBase) => set({ colorBase }),
      setSexo: (sexo) => set({ sexo }),
      completarOnboarding: () => set({ onboardingCompletado: true }),
      setRecordatorioCiclo: (recordatorioCiclo) => set({ recordatorioCiclo }),
    }),
    {
      name: 'pilltime-preferencias',
      storage: createJSONStorage(() => almacenSincrono),
      version: 1,
    },
  ),
);
