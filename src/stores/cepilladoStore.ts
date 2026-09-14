import { create } from 'zustand';

/** Duración recomendada de un cepillado (OMS y sociedades odontológicas). */
export const DURACION_CEPILLADO_S = 120;

/**
 * Estado del temporizador de cepillado: solo UI, no persistente (si se
 * cierra la app a mitad, ese cepillado no cuenta). Se guarda el INSTANTE
 * de inicio y no un contador que se decrementa: con la app en segundo
 * plano los intervalos de JS se congelan, y al volver el tiempo restante
 * se recalcula bien a partir del reloj.
 *
 * `terminar` devuelve el instante de inicio y limpia el estado en la
 * misma operación síncrona, para que dos ticks seguidos no guarden el
 * mismo cepillado dos veces.
 */
type CepilladoStore = {
  inicio: number | null;
  empezar: () => void;
  cancelar: () => void;
  terminar: () => number | null;
};

export const useCepilladoStore = create<CepilladoStore>((set, get) => ({
  inicio: null,
  empezar: () => set({ inicio: Date.now() }),
  cancelar: () => set({ inicio: null }),
  terminar: () => {
    const { inicio } = get();
    if (inicio !== null) set({ inicio: null });
    return inicio;
  },
}));
