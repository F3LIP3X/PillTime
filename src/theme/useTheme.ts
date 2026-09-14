import { useColorScheme } from 'react-native';

import { usePreferenciasStore } from '@/stores/preferenciasStore';
import { paletaDe } from './paletas';

/**
 * Tema y paleta activos. La paleta sale del color base elegido en Ajustes
 * (`paletaDe` la memoiza por color y modo), así que cambiar el color
 * repinta toda la app sin reiniciar: todo color de pantalla sale de aquí.
 */
export function useTheme() {
  const tema = usePreferenciasStore((s) => s.tema);
  const colorBase = usePreferenciasStore((s) => s.colorBase);
  const sistema = useColorScheme();

  const esOscuro = tema === 'oscuro' || (tema === 'sistema' && sistema === 'dark');

  return {
    esOscuro,
    colors: paletaDe(colorBase, esOscuro),
  };
}
