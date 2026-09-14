import { Pressable, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, Droplet, History, House, Pill, Toothbrush } from 'lucide-react-native';

import { usePreferenciasStore } from '@/stores/preferenciasStore';

import { useTheme } from '@/theme/useTheme';
import { typography } from '@/theme/typography';

/** Alto de la barra sin contar la zona reservada del sistema. */
const ALTO_BARRA = 58;

/**
 * Máximo 5 pestañas (decisión del usuario del 14-09-2026, al añadir Salud
 * dental y Ciclo): con más, las etiquetas se cortan. Historial y Ajustes
 * salieron de la barra a pantallas de la pila; se abren desde Inicio
 * (iconos de arriba) y Historial también desde Fármacos.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const sexo = usePreferenciasStore((s) => s.sexo);
  // La barra de gestos de Android (y el home indicator de iPhone) ocupan
  // espacio real: hay que SUMARLO al alto en vez de fijar una altura, o
  // el sistema dibuja su barra encima de las etiquetas.
  const insets = useSafeAreaInsets();

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
          height: ALTO_BARRA + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
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
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/historial')}
              accessibilityRole="button"
              accessibilityLabel="Historial de tomas"
              hitSlop={8}
              style={styles.botonCabecera}
            >
              <History color={colors.primary} size={22} />
            </Pressable>
          ),
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
        name="dental"
        options={{
          title: 'Salud dental',
          tabBarLabel: 'Dental',
          tabBarIcon: ({ color, size }) => <Toothbrush color={color} size={size - 2} />,
        }}
      />
      {/* Solo si en el onboarding (o en Ajustes → Perfil) se eligió mujer. */}
      <Tabs.Protected guard={sexo === 'mujer'}>
        <Tabs.Screen
          name="ciclo"
          options={{
            title: 'Ciclo menstrual',
            tabBarLabel: 'Ciclo',
            tabBarIcon: ({ color, size }) => <Droplet color={color} size={size - 2} />,
          }}
        />
      </Tabs.Protected>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  botonCabecera: { paddingHorizontal: 16 },
});
