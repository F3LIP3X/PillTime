# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Qué es esto

PillTime: app móvil de salud personal para recordar la toma de medicamentos.
100% offline, sin servidor propio ni cuenta de usuario, perfil único por
instalación. Gratuita, con anuncios pequeños en una fase futura (nunca en
la pantalla de alarma o confirmación de toma).

Fuente de verdad para alcance funcional, stack y diseño: `docs/plan-tecnico-diseno.md`
y `docs/analisis-competencia.md`. Antes de añadir o descartar una función,
consulta esos documentos — recogen qué se comparó con MyTherapy/Medisafe/
RecuerdaMed y por qué se incluyó o se descartó (p. ej. el modo cuidador se
descarta explícitamente porque exigiría un servidor de sincronización).

## Comandos

```bash
npm start            # Metro / Expo dev server
npm run android       # abrir en Android
npm run ios           # abrir en iOS
npm run web           # abrir en web
npm run typecheck     # tsc --noEmit
npm run db:generate   # genera migración SQL a partir de src/db/schema.ts
npm run db:studio     # Drizzle Studio sobre el esquema local
```

No hay suite de tests configurada todavía.

Instala paquetes JS puros (no nativos de Expo) con `--legacy-peer-deps`
— el árbol de dependencias de Expo SDK 57 trae un conflicto de peer
dependency opcional (`react-dom`) no relacionado con este proyecto que
hace fallar `npm install` sin ese flag. Para paquetes nativos de Expo usa
`npx expo install <paquete>` (resuelve versión compatible con el SDK).

## Arquitectura

**Expo Router** (file-based routing) en `app/`. El punto de entrada es
`expo-router/entry` (ver `main` en `package.json`); no existen `App.tsx`
ni `index.ts` — Expo Router los sustituye.

Todo el código no ligado a una ruta concreta vive en `src/`, organizado
por feature:

- `src/db/` — `schema.ts` (Drizzle) y `client.ts` (hook `useDb()` sobre
  `expo-sqlite`).
- `src/features/<feature>/{hooks,components}` — un hook por operación de
  lectura/escritura sobre Drizzle (`useMedicamentos`,
  `useProximaTomaPorMedicamento`, etc.), sin capa de servicio intermedia.
- `src/theme/` — paleta "Teal Trust", tipografía y espaciado
  (`docs/plan-tecnico-diseno.md`), con `useTheme()` para claro/oscuro.
- `src/stores/` — Zustand, **solo estado de UI** (p. ej. preferencia de
  tema). Los datos persistentes viven en SQLite, nunca en un store.
- `src/components/` — UI compartida entre features.

### Pantallas (`app/`)

`(tabs)` = Inicio / Medicamentos / Historial / Medidas / Ajustes. Fuera
de las tabs: `medicamento/nuevo`, `medicamento/[id]/{detalle,editar}`,
`cita/{index,nueva}`.

`Medicamentos` es el listado completo (activos/archivados) para
gestionar los datos de cada uno — Inicio ya no sirve para eso desde que
solo muestra la próxima toma pendiente por medicamento.

`app/_layout.tsx` aplica las migraciones de Drizzle **antes** de montar
el árbol: abre una conexión de `expo-sqlite` a nivel de módulo solo para
`useMigrations`, y por separado `SQLiteProvider` abre su propia conexión
para los hooks de las pantallas (`useDb` → `useSQLiteContext`). Son dos
conexiones al mismo archivo a propósito — es el patrón oficial de
Drizzle + expo-sqlite, no una que se pueda "simplificar" a una sola sin
romper `useMigrations`.

**Las tomas del día no se precrean en segundo plano.** `useAsegurarTomasDeHoy`
(en `app/(tabs)/index.tsx`, vía `useFocusEffect`) genera, de forma
idempotente, las filas `pendiente` de `tomas` para los horarios activos
que coinciden con el día de hoy, cada vez que se abre la pantalla de
Inicio. Si la app no se abre un día, ese día no queda registrado como
"omitido" — no hay un cron ni una tarea en segundo plano. Si esto
cambia (por ejemplo al añadir un cumplimiento global que dependa de que
todos los días queden registrados), hay que revisar esta función primero.

**Archivar, no borrar.** `useArchivarMedicamento` pone `activo = false`
en vez de borrar la fila; `useMedicamentos()` filtra `activo = true` por
defecto (parámetro `soloActivos`). Un medicamento archivado sigue
apareciendo en el historial y en `useMedicamento(id)` (detalle), solo
desaparece del listado de Inicio.

**Inicio muestra una tarjeta por medicamento (su próxima toma pendiente),
no una lista de todas las tomas de hoy.** Decisión explícita del usuario
tras probar la primera versión (que sí listaba todas las tomas de hoy) y
resultarle confusa — con un tratamiento "cada 8 horas" se veían 3
tarjetas del mismo medicamento el mismo día. `useProximaTomaPorMedicamento`
trae, por cada medicamento activo, su toma `'pendiente'` más antigua sin
resolver (puede ser de hoy, atrasada de un día anterior, o incluso de
mañana si un tratamiento por intervalo aún no tiene ninguna pendiente
antes) — no se limita a "hoy". Al marcar Tomado/Omitido, esa toma deja de
ser `'pendiente'` y la recarga trae automáticamente la siguiente del
mismo medicamento (si la hay), dando la sensación de "avanzar" tarjeta a
tarjeta. Si se te ocurre volver a listar "todas las tomas de hoy" en
Inicio, es un cambio de producto consciente, no una vuelta atrás sin
más — coméntalo primero.

**Cada pantalla que lee datos mutables desde otra pantalla necesita
`useFocusEffect` llamando a su propio `recargar()`.** Expo Router (como
React Navigation) no desmonta una pantalla al volver a ella con
`router.back()` — se queda montada en la pila. Un hook que solo hace
`useEffect(() => { recargar() }, [db])` (fetch al montar) se queda con
datos viejos si la mutación pasó en OTRA pantalla mientras tanto: bug
real reportado por el usuario (editó el stock de un medicamento en
`editar.tsx`, y `index.tsx`/`medicamento/[id]/detalle.tsx` seguían
mostrando el valor antiguo al volver, porque su `useMedicamentos()`/
`useMedicamento()` no se había vuelto a llamar). Todas las pantallas de
`(tabs)` y de detalle que muestran datos que se pueden editar desde otra
pantalla (Inicio, Medicamentos, Historial, `medicamento/[id]/detalle`)
ya tienen este `useFocusEffect`; si añades una pantalla nueva que lee
`medicamentos`/`tomas`/etc., replica el patrón en vez de confiar en el
fetch inicial del hook.

**Gestión de estado y datos:** sin React Query — no hay red que cachear,
todo es SQLite local. El patrón es Zustand para UI + hooks propios sobre
Drizzle para todo lo demás (decisión explícita, no un olvido de añadir
React Query).

**Alias de import:** `@/*` → `./src/*` (`tsconfig.json`).

### Migraciones de Drizzle + expo-sqlite

Las migraciones se generan con `npm run db:generate` (usa
`drizzle.config.ts`, driver `expo`) y quedan en `src/db/migrations/`,
incluyendo un `migrations.js` autogenerado que no se debe editar a mano.
Para que Metro pueda importar los `.sql` generados hacen falta:

- `metro.config.js` — añade `sql` a `resolver.sourceExts`.
- `babel.config.js` — plugin `inline-import` sobre extensión `.sql`.

**No confíes ciegamente en el SQL que genera `drizzle-kit generate`
cuando una migración recrea una tabla** (añadir/quitar NOT NULL, cambiar
tipos, etc. en SQLite obliga a crear tabla nueva + copiar datos + borrar
la vieja + renombrar). Ya ha generado al menos una vez un `INSERT INTO
__new_tabla SELECT columnas_nuevas FROM tabla_vieja` leyendo de la tabla
vieja columnas que no existen ahí todavía (las que la propia migración
está añadiendo) — rompería en cualquier dispositivo que ya tuviera datos.
Antes de dar una migración de este tipo por buena, simúlala con
`better-sqlite3` en un script desechable: aplica la migración anterior,
inserta una fila de prueba, aplica la nueva migración, y comprueba
`PRAGMA foreign_key_check`.

Si se borra o falla la importación de un `.sql` en tiempo de build, revisa
primero estos dos archivos antes de sospechar de Drizzle.

## Esquema de base de datos (`src/db/schema.ts`)

Perfil único por instalación: **no existe tabla de perfiles ni columna
`perfilId`** en ninguna tabla. Añadir un "modo cuidador" multi-perfil
(descartado por ahora, ver `docs/analisis-competencia.md`) requeriría
migrar todas las tablas de abajo.

Tablas: `medicamentos`, `horarios_medicamento`, `tomas`,
`codigos_barras_aprendidos`, `medidas_salud`, `citas_medicas`.

**Stock restante** no se guarda: se calcula en consulta como
`stockInicial − SUM(unidadesPorToma)` de las tomas en estado `tomado`
(ver `useMedicamentos`).

### Dos decisiones de esquema que no son obvias leyendo el código superficialmente

**1. `tomas.horarioId` es nullable a propósito.** Permite tomas
puntuales/manuales que no vienen de una pauta fija en
`horarios_medicamento`. Esto tiene efectos distintos en cada métrica que
toca la tabla `tomas`, y están documentados como comentario justo sobre
la columna en `schema.ts`:

- **Aviso de stock bajo** (`useMedicamentos`): NO depende de `horarioId`.
  Agrega por `medicamentoId` sobre todas las tomas `tomado`, con o sin
  horario.
- **% de cumplimiento por franja horaria** (`useCumplimientoPorFranja`):
  agrupa por `horarioId` y **excluye explícitamente** las tomas con
  `horarioId = null` (`WHERE horario_id IS NOT NULL`) — no tienen franja
  a la que atribuirse.
- **% de cumplimiento global** (si se implementa): debe incluir todas las
  tomas, con y sin horario.

Si tocas esta columna: **no la hagas `NOT NULL` "para simplificar"** sin
comprobar antes si sigue existiendo el caso de toma manual sin horario
fijo. Si sigue existiendo, la solución correcta es mantener la nulabilidad
y documentar la exclusión donde corresponda — no eliminar la flexibilidad.

**2. `codigos_barras_aprendidos` es una caché de aprendizaje local, no
un catálogo de medicamentos.** La app es 100% offline y no incluye (ni
consulta) una base de datos externa de medicamentos por código de
barras. En su lugar: la primera vez que se escanea un código nuevo, el
usuario rellena nombre/dosis a mano al dar de alta el medicamento
(`useCrearMedicamento`); ese código + nombre/dosis se guardan (upsert)
en esta tabla. La próxima vez que se escanee ese mismo código
(`useBarcodeLookup`), se autocompleta el formulario. Es una conveniencia
de una sola tabla, sin relación de catálogo con `medicamentos` — un
mismo código solo puede tener una entrada, que se sobrescribe si el
usuario corrige el nombre/dosis.

**3. `horarios_medicamento.tipo` separa dos modelos de pauta a
propósito, en vez de forzar uno solo.** `'semanal'` (hora fija + días de
la semana, indefinido — medicación crónica) y `'intervalo'` (cada
`frecuenciaHoras` horas desde `fechaHoraInicio`, durante `duracionDias`
días — un tratamiento con fin, ej. antibiótico). Son modelos de
generación de tomas opuestos, no una variación menor del mismo:
- `'semanal'`: tomas generadas perezosamente día a día
  (`useAsegurarTomasDeHoy`), porque no tiene fecha de fin.
- `'intervalo'`: TODAS las tomas se generan de golpe al crear el horario
  (`useCrearTratamientoIntervalo`), porque el fin se conoce desde el
  principio.

Por eso `hora`/`diasSemana` (solo aplican a 'semanal') y
`frecuenciaHoras`/`fechaHoraInicio`/`duracionDias` (solo a 'intervalo')
son todas nullable a nivel de columna — la obligatoriedad real según
`tipo` se valida en los hooks, no en el esquema. `useAsegurarTomasDeHoy`
y `useCumplimientoPorFranja` filtran explícitamente `tipo='semanal'`; si
se te ocurre "generalizarlos" para que traten ambos tipos igual, primero
piensa en que 'intervalo' ya tiene sus tomas creadas y no tiene una
"franja horaria" fija que atribuirle.

**4. `tomas.estado = 'eliminada'` es un estado tumba (tombstone), no un
estado real.** `useEliminarToma` NUNCA hace `DELETE` físico de la fila
— hace `UPDATE ... SET estado = 'eliminada'`. Motivo, confirmado con un
bug real reproducido y verificado con una simulación antes de arreglarlo
(no solo deducido leyendo el código): si se borra físicamente una toma
que pertenece a un horario `'semanal'` activo, `useAsegurarTomasDeHoy`
la vuelve a crear en la siguiente apertura de Inicio, porque esa función
solo comprueba si existe una fila para ese `horarioId` + `fechaHoraProgramada`
— no si "esta toma fue borrada a propósito y no debe volver". Dejar la
fila como tumba bloquea la regeneración sin necesitar una columna nueva
ni una migración (`estado` es `text` sin `CHECK`, así que añadir un
valor al enum de TypeScript no toca el esquema SQL).

Efecto en cada sitio que lee `tomas`, para que una "limpieza" no la
vuelva a hacer visible sin querer:
- `useTomasDeHoy` y `useHistorial`: excluyen `estado != 'eliminada'`
  explícitamente — si no, la fila tumba aparecería en las listas.
- `useCumplimientoPorFranja`: también la excluye, de ambos lados
  (numerador y denominador) — no cuenta como "programada" ni como
  "tomada", como si nunca hubiera existido.
- `useMedicamentos` (stock): no necesita cambio, ya solo suma
  `estado='tomado'`.
- `EditarTomaModal`: filtra `'eliminada'` de los chips de estado
  seleccionables — no es una opción que el usuario elija a mano.

## Notificaciones locales

Dos funciones, una por tipo de horario — no comparten lógica de
agrupación porque el tipo de trigger es distinto:

- `reprogramarNotificaciones` (horarios `'semanal'`): agrupa horarios que
  coinciden en hora exacta y mismos días (`agruparHorariosCoincidentes`)
  para emitir una sola notificación con varios medicamentos en vez de una
  por medicamento (evita fatiga de notificaciones, función tomada de
  MyTherapy — ver `docs/analisis-competencia.md`), con un trigger
  `WEEKLY` recurrente por día de la semana.
- `programarNotificacionesTratamiento` (horarios `'intervalo'`): una
  notificación puntual (trigger `DATE`, no recurrente) por cada toma ya
  generada del tratamiento. No agrupa con otras tomas coincidentes de
  otros medicamentos — simplificación aceptada mientras el volumen de
  tratamientos simultáneos sea bajo.
  **Limitación conocida sin resolver:** `reprogramarNotificaciones`
  cancela TODAS las notificaciones programadas en el sistema
  (`cancelAllScheduledNotificationsAsync`) antes de reprogramar solo las
  `'semanal'` — si hay un tratamiento por intervalo en curso y luego se
  da de alta un medicamento crónico nuevo, sus recordatorios pendientes
  se borran sin querer. Arreglarlo bien exige guardar los identificadores
  que devuelve `scheduleNotificationAsync` para cancelar solo lo que
  corresponde a `'semanal'`, en vez de cancelar todo. No se ha hecho
  porque solo se puede verificar con notificaciones funcionando de
  verdad (development build), no en Expo Go.

El texto añade "(antes/después de comer)" cuando aplica. El mapeo de días
es ISO (1=lunes…7=domingo) en el esquema → formato de Expo Notifications
(0=domingo…6=sábado) vía `isoADiaExpo`.

**`expo-notifications` no funciona en Expo Go en Android (desde SDK 53),
ni siquiera para notificaciones locales** — hace falta una development
build para probarlo de verdad ahí. Confirmado en dispositivo real, y en
dos capas: primero se intentó envolver solo la llamada a
`setNotificationHandler` en `try/catch`, pero el crash seguía — porque en
Expo Go/Android **el simple `import * as Notifications from
'expo-notifications'` ya lanza la excepción** ("Android Push
notifications... removed from Expo Go") durante la propia evaluación del
módulo, antes de que se ejecute ninguna línea propia. Un `try/catch`
alrededor de una llamada no sirve de nada si lo que revienta es el
`import` estático de otro módulo.

Por eso `src/features/notificaciones/scheduler.ts` **no tiene un import
estático de `expo-notifications`** — solo un `import type` (se borra en
compilación) para conservar el tipado. La carga real es perezosa, vía
`require('expo-notifications')` dentro de la función `cargarNotificaciones()`,
envuelta en `try/catch` y memoizada (éxito o fallo). Si al tocar este
archivo alguien vuelve a poner `import * as Notifications from
'expo-notifications'` arriba del todo "porque total ya está en un
try/catch más abajo", va a reventar exactamente igual — hay que
verificarlo en Expo Go en Android, no solo en iOS o en una development
build, antes de dar el cambio por bueno.

## Sistema de diseño (`src/theme` + `src/components`)

La paleta es la del plan de diseño; los tokens de forma no estaban ahí y
se añadieron después (`radii.ts`, `shadows.ts`, y los colores de
superficie en `colors.ts`). Reglas que conviene no romper por descuido:

- **Nunca colores literales en las pantallas.** Todo sale de
  `useTheme().colors`. El único literal aceptado es `#FFFFFF` para texto
  sobre el primario, porque no cambia entre temas.
- **Sombras solo en claro.** `sombraSegunTema()` las anula en oscuro: en
  un fondo casi negro no se ven y solo ensucian. Ahí la elevación la da
  `colors.surface`, que es más claro que `colors.background`.
- **`Card` tiene dos capas a propósito** (una proyecta la sombra, otra
  recorta al radio). En iOS `overflow: 'hidden'` y `shadow*` en la misma
  vista se anulan entre sí; si alguien "simplifica" Card a una sola
  vista, o desaparecen las sombras o se ven las esquinas cuadradas de
  las filas dentro de una lista agrupada.
- **Estado nunca solo por color** (requisito de accesibilidad del plan):
  los badges de estado llevan color + texto, y en Historial además
  icono.

**Zonas seguras.** Bug real en dispositivo: fijar alturas a mano en la
barra de pestañas hacía que la barra de gestos de Android pisara las
etiquetas, y ocultar la cabecera en Inicio metía el título bajo el reloj
del sistema. Regla: la altura de la barra de pestañas es
`58 + insets.bottom`, Inicio añade `insets.top` al padding de su lista, y
cualquier barra inferior de acción usa el componente `PieAccion`, que
suma el inset inferior **salvo** cuando la pantalla está dentro de las
pestañas (`dentroDeTabs`), porque ahí ese hueco ya lo ocupa la barra.

## Permisos y canal de notificaciones

Además de la limitación de Expo Go (arriba), para que un recordatorio
suene de verdad hacen falta dos cosas que no son evidentes:

- **Permiso.** En Android 13+ está denegado por defecto hasta que la app
  lo pide. `solicitarPermisoNotificaciones()` lo pide una vez al
  arrancar (vía `useInicializarNotificaciones` en `app/_layout.tsx`) y
  respeta `canAskAgain`: si el usuario ya dijo que no y el sistema no
  deja volver a preguntar, hay que ir a los ajustes del SO.
- **Canal de Android** (`CANAL_RECORDATORIOS`). En Android 8+ el sonido y
  la prioridad los decide el canal, no la notificación: sin un canal con
  `AndroidImportance.HIGH`, el aviso sale mudo y sin emerger. Cada
  trigger pasa `channelId`; si se programa una notificación sin él,
  Android la manda al canal por defecto y se pierde la configuración.
  Ojo: Android solo permite cambiar el nombre y la descripción de un
  canal ya creado — para cambiarle sonido o importancia hay que usar un
  id nuevo (`recordatorios-v2`), reconfigurar el existente no hace nada.

Lo que hay son notificaciones normales, no una alarma tipo despertador:
suenan y emergen, pero no toman la pantalla completa ni suenan en modo
silencio, y Android puede retrasarlas en reposo profundo. Una alarma
insistente exigiría permisos de alarma exacta y notificación a pantalla
completa; se descartó a propósito por ahora.

## Compilar el APK (EAS Build)

No hay Android SDK en el entorno de desarrollo, así que las builds van
por la nube de Expo. `eas.json` define tres perfiles:

- `development`: APK con `expo-dev-client`. Se instala una vez y luego
  `npm start` recarga los cambios al vuelo — es la forma de iterar con
  notificaciones funcionando, sin recompilar por cada cambio.
- `preview`: APK independiente instalable a mano (`buildType: apk`, no
  `app-bundle`, que no se puede instalar directamente).
- `production`: `app-bundle` para subir a Google Play.

`android.package` es `com.felit.pilltime`. El `extra.eas.projectId` lo
añade `eas init` la primera vez (requiere cuenta de Expo).

## Assets de marca (icono, adaptive icon, splash)

Icono aprobado: concepto "cápsula partida" (cápsula en diagonal, mitad
`#028090` / mitad `#02C39A`, separador del color de fondo sobre el que se
compone). Los PNG en `assets/` (`icon.png`, `favicon.png`,
`android-icon-foreground.png`, `android-icon-background.png`,
`android-icon-monochrome.png`, `splash-icon.png`, `splash-icon-dark.png`)
se generaron a partir de esa geometría con `@resvg/resvg-js`, en un
proyecto Node desechable fuera de este repo — no se añadió como
dependencia del proyecto ni se versionó el SVG fuente, solo el PNG
resultante. Si hay que regenerarlos (ajustar proporciones, añadir un
tamaño que falte), hay que rehacer ese script puntual; la geometría base
está descrita en la comparativa de conceptos que se le mostró al usuario
antes de aprobar el 01 (rect 72×32 rx16 rotado 45° sobre un viewBox 0-100,
recortado por la mitad con `clipPath`).

`android-icon-monochrome.png` es intencionalmente una silueta blanca
sobre fondo transparente (para el tintado de iconos temáticos de Android
13+) — se ve "en blanco" si se abre sobre un visor con fondo blanco, eso
es correcto, no un archivo vacío.

Splash configurado vía el plugin `expo-splash-screen` en `app.json`
(no existe ya un bloque `splash` de nivel superior, que es el formato
antiguo): fondo `#FFFFFF` / imagen `splash-icon.png` en claro, fondo
`#121212` / `splash-icon-dark.png` en oscuro — mismos colores de fondo
que `src/theme/colors.ts`.

## Monetización (para cuando llegue)

Banner discreto solo en pantallas no críticas (historial, ajustes).
**Nunca** en la pantalla de alarma/confirmación de toma, ni intersticial
al abrir la app por primera vez o justo antes de confirmar una toma —
ver `docs/analisis-competencia.md`.
