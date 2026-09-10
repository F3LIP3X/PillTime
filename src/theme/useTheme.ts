import { useColorScheme } from 'react-native';

import { useThemeStore } from '@/stores/themeStore';
import { darkColors, lightColors } from './colors';

export function useTheme() {
  const preferencia = useThemeStore((s) => s.preferencia);
  const sistema = useColorScheme();

  const esOscuro = preferencia === 'oscuro' || (preferencia === 'sistema' && sistema === 'dark');

  return {
    esOscuro,
    colors: esOscuro ? darkColors : lightColors,
  };
}
