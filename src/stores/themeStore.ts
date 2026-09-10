import { create } from 'zustand';

/**
 * Estado de UI puro (Zustand solo para esto, nunca para datos persistentes
 * que ya viven en SQLite — ver src/db). Preferencia manual de tema; si es
 * 'sistema', se sigue el color scheme del SO (ver src/theme/useTheme.ts).
 */
type PreferenciaTema = 'sistema' | 'claro' | 'oscuro';

type ThemeStore = {
  preferencia: PreferenciaTema;
  setPreferencia: (p: PreferenciaTema) => void;
};

export const useThemeStore = create<ThemeStore>((set) => ({
  preferencia: 'sistema',
  setPreferencia: (preferencia) => set({ preferencia }),
}));
