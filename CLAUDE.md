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
  lectura/escritura sobre Drizzle (`useMedicamentos`, `useTomasDeHoy`,
  etc.), sin capa de servicio intermedia.
- `src/theme/` — paleta "Teal Trust", tipografía y espaciado
  (`docs/plan-tecnico-diseno.md`), con `useTheme()` para claro/oscuro.
- `src/stores/` — Zustand, **solo estado de UI** (p. ej. preferencia de
  tema). Los datos persistentes viven en SQLite, nunca en un store.
- `src/components/` — UI compartida entre features.

### Pantallas (`app/`)

`(tabs)` = Inicio / Historial / Medidas / Ajustes. Fuera de las tabs:
`medicamento/nuevo`, `medicamento/[id]/{detalle,editar}`, `cita/{index,nueva}`.

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

## Notificaciones locales

`src/features/notificaciones/scheduler.ts` agrupa horarios que coinciden
en hora exacta y mismos días (`agruparHorariosCoincidentes`) para emitir
una sola notificación con varios medicamentos en vez de una por
medicamento (evita fatiga de notificaciones, función tomada de
MyTherapy — ver `docs/analisis-competencia.md`). El texto añade
"(antes/después de comer)" cuando aplica. El mapeo de días es ISO
(1=lunes…7=domingo) en el esquema → formato de Expo Notifications
(0=domingo…6=sábado) vía `isoADiaExpo`.

**`expo-notifications` no funciona en Expo Go en Android (desde SDK 53),
ni siquiera para notificaciones locales** — hace falta una development
build para probarlo de verdad ahí (confirmado con un dispositivo real:
`Notifications.setNotificationHandler` lanza
`java.io.IOException`/"Android Push notifications... removed from Expo
Go"). Por eso `setNotificationHandler` y todo el cuerpo de
`reprogramarNotificaciones` están envueltos en `try/catch` con
`console.warn` — importar `scheduler.ts` o guardar un horario **nunca**
debe lanzar solo porque el entorno no soporte notificaciones. Si al
tocar este archivo se quita alguno de esos `try/catch` "porque ya no
hace falta", verificarlo primero en Expo Go en Android, no solo en iOS
o en una development build.

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
