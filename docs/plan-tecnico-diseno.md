# Plan de tecnologías y diseño — App móvil sin servidor (recordatorio de medicación)

## 0. Alcance funcional

App de salud personal para recordar la toma de medicamentos a su hora, gratuita, con pequeños anuncios en una fase futura. 100% offline, sin cuenta ni servidor propio.

**Funciones incluidas (ver detalle y justificación en `analisis-competencia.md`):**
- Alta de medicamento: nombre, dosis, horario, frecuencia
- Alarma nativa a la hora exacta, con opción de posponer
- Marcar toma como hecha u omitida, con motivo opcional
- Historial de tomas (lista o calendario)
- Aviso de stock bajo (unidades restantes calculadas localmente)
- Agrupación de varias tomas coincidentes en una sola notificación
- Aviso de antes/después de comer en la notificación
- Exportar historial a PDF para llevarlo a una cita médica (generado en el propio dispositivo)
- Escaneo de código de barras para dar de alta el medicamento más rápido
- Registro de medidas de salud básicas (peso, tensión, glucosa, síntomas, ánimo) con gráfico de evolución
- Recordatorio de citas médicas
- Ficha informativa básica del medicamento con alertas asociadas

**Descartado por ahora:** modo cuidador/familiar con sincronización entre dispositivos — requeriría un servidor o backend de sync, lo que rompe el objetivo "sin servidor". Queda como posible fase 2 si se decide asumir esa dependencia.

## 1. Plan de tecnologías

**Objetivo:** app móvil que funcione 100% offline, sin backend propio, con persistencia local.

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | React Native + Expo | Coincide con tu stack en React/TypeScript; un solo código para iOS/Android |
| Lenguaje | TypeScript | Consistencia con tu trabajo actual en Quantia |
| Base de datos local | **SQLite** (vía `expo-sqlite` o `op-sqlite`) | Motor embebido, cero red, transaccional, ideal para offline-first |
| Capa de acceso a datos | Drizzle ORM (soporta SQLite) | Tipado fuerte, migraciones versionadas, evita SQL a mano |
| Estado / cache en memoria | Zustand o React Query (modo offline) | Sincroniza UI con SQLite sin lógica repetida |
| Notificaciones locales | `expo-notifications` | Alarmas y recordatorios sin depender de un servidor push |
| Generación de PDF | `expo-print` o similar | Exportar historial de tomas localmente, sin backend |
| Escaneo de código de barras | `expo-camera` / `expo-barcode-scanner` | Alta rápida de medicamento leyendo el código de la caja, sin servidor |
| Gráficos de medidas de salud | `react-native-svg` + librería de gráficos ligera (ej. `victory-native`) | Visualizar evolución de peso, tensión, glucosa, etc. |
| Almacenamiento de archivos/imágenes | Sistema de archivos del dispositivo (`expo-file-system`) | Para adjuntos que no caben bien en SQLite |
| Build y despliegue | EAS Build (Expo) | Genera .apk/.ipa sin depender de Xcode/Android Studio propios |
| Anuncios (fase futura) | Google AdMob (banner) | Solo en pantallas secundarias, nunca en la pantalla de alarma o confirmación de toma |

**Por qué SQLite y no otra cosa:**
- Alternativas como Realm o WatermelonDB añaden complejidad que no necesitas para un caso offline simple.
- SQLite es el estándar de facto en apps móviles offline (WhatsApp, Signal, etc. lo usan como base).
- No requiere servidor, no requiere cuenta en la nube, no requiere conexión para funcionar.
- Permite calcular el stock restante de un medicamento con una simple consulta (stock inicial − tomas registradas), sin lógica añadida.

---

## 2. Plan de diseño

### Paleta de colores
Paleta **"Teal Trust"** — transmite fiabilidad y funciona bien en modo claro y oscuro:

| Uso | Color | Hex |
|---|---|---|
| Primario (dominante) | Teal | `#028090` |
| Secundario | Verde mar | `#00A896` |
| Acento | Menta | `#02C39A` |
| Fondo claro | Blanco | `#FFFFFF` |
| Texto principal | Casi negro | `#1A1A1A` |
| Texto secundario | Gris medio | `#5C6670` |
| Estados de error | Rojo | `#D64550` |

### Tipografía
- **Títulos:** Inter Bold / SF Pro Display Bold — tamaños 24-32pt
- **Cuerpo:** Inter Regular / System font — 14-16pt (nunca menos de 14pt en móvil)
- **Etiquetas y captions:** 12pt, color de texto secundario
- Usar fuentes del sistema (San Francisco en iOS, Roboto en Android) como fallback: reduce peso de la app y mejora legibilidad nativa.

### Accesibilidad
- **Contraste:** todo texto sobre fondo debe cumplir WCAG AA (mínimo 4.5:1 para texto normal, 3:1 para texto grande). El teal `#028090` sobre blanco cumple; evitar texto gris claro sobre blanco.
- **Tamaño táctil:** botones e íconos interactivos de al menos 44x44 px (guía de Apple/Google).
- **Soporte de lector de pantalla:** etiquetas `accessibilityLabel` en todos los componentes interactivos (React Native).
- **Escalado de texto:** respetar el ajuste de tamaño de fuente del sistema operativo (Dynamic Type / Font Scale), no fijar tamaños que ignoren la config del usuario.
- **Modo oscuro:** ofrecer variante oscura de la paleta (fondo `#121212`, texto `#F2F2F2`, primario ajustado a `#02A6B8` para mantener contraste).
- **Estados de foco/error** siempre comunicados con color + ícono + texto (nunca solo color, por daltonismo).
