import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { House, ListChecks, Settings, Activity, Pill } from 'lucide-react-native';

import { useTheme } from '@/theme/useTheme';
import { typography } from '@/theme/typography';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { ...typography.subtitle, color: colors.text },
        // La cabecera se oculta en las pestañas que ya traen su propio
        // título grande dentro del scroll (Inicio); el resto la conservan.
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.separator,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.1 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <House color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="medicamentos"
        options={{
          title: 'Medicamentos',
          // Etiqueta más corta que el título para que no se corte en la
          // barra de pestañas (con 5 pestañas hay poco espacio cada una).
          tabBarLabel: 'Fármacos',
          tabBarIcon: ({ color, size }) => <Pill color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: 'Historial',
          tabBarIcon: ({ color, size }) => <ListChecks color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="medidas"
        options={{
          title: 'Medidas',
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  );
}
