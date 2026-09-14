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
npm start                  # Metro en modo Expo Go (túnel)
npm run start:dev-client    # Metro para una development build propia
npm run android       # abrir en Android
npm run ios           # abrir en iOS
npm run web           # abrir en web
npm run typecheck     # tsc --noEmit
npm run db:generate   # genera migración SQL a partir de src/db/schema.ts
npm run db:studio     # Drizzle Studio sobre el esquema local
```

No hay suite de tests configurada todavía.

**`npm start` lleva `--go` a propósito.** Con `expo-dev-client` instalado
(hace falta para el perfil `development` de EAS), `expo start` a secas
deja de apuntar a Expo Go y genera un enlace para una build propia — si
esa build no está instalada, el QR no abre nada y parece que la app se
ha roto. Pasó de verdad. El flag `--tunnel` está porque la red NAT de
WSL2 no es alcanzable desde el móvil (ver más abajo).

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
  `useTomasDeHoy`, etc.), sin capa de servicio intermedia.
- `src/theme/` — paleta "Teal Trust", tipografía y espaciado
  (`docs/plan-tecnico-diseno.md`), con `useTheme()` para claro/oscuro.
- `src/stores/` — Zustand, **solo estado de UI** (p. ej. preferencia de
  tema). Los datos persistentes viven en SQLite, nunca en un store.
- `src/components/` — UI compartida entre features.

### Pantallas (`app/`)

`(tabs)` = Inicio / Medicamentos / Historial / Medidas / Ajustes. Fuera
de las tabs: `medicamento/nuevo`, `medicamento/[id]/{detalle,editar}`,
`cita/{index,nueva}`.

`Medicamentos` es el listado completo (activos/terminados) para
gestionar los datos de cada uno — Inicio ya no sirve para eso desde que
solo muestra la próxima toma pendiente por medicamento.

`app/_layout.tsx` aplica las migraciones de Drizzle **antes** de montar
el árbol: abre una conexión de `expo-sqlite` a nivel de módulo solo para
`useMigrations`, y por separado `SQLiteProvider` abre su propia conexión
para los hooks de las pantallas (`useDb` → `useSQLiteContext`). Son dos
conexiones al mismo archivo a propósito — es el patrón oficial de
Drizzle + expo-sqlite, no una que se pueda "simplificar" a una sola sin
romper `useMigrations`.

**Qué toma toca y cuándo sale de un único cálculo:
`src/features/tomas/ocurrencias.ts`** (`calcularOcurrencias`, puro, sin
base de datos) cargado desde SQLite por `cargarOcurrencias.ts`. Devuelve
las tomas pendientes de un rango: las filas `pendiente` que ya existen y
las "virtuales" de pautas `'semanal'` que aún no tienen fila. Lo usan los
avisos, la generación de las tomas de hoy y la lista "Próximas tomas" del
detalle. Antes cada sitio lo calculaba a su manera y por eso una toma
omitida seguía avisando. Si necesitas saber qué toca en otro sitio, usa
esto; no vuelvas a recorrer `horarios_medicamento` a mano.

Dos reglas del cálculo que no son evidentes: una fila de una pauta
semanal se empareja con su ocurrencia **por día local, no por instante
exacto** (así editar la hora de una toma no hace que la pauta regenere
otra a la hora original), y cualquier fila que ya no esté `pendiente`
(tomada, omitida, eliminada) anula la ocurrencia de ese día.

**Las tomas del día no se precrean en segundo plano.** `useAsegurarTomasDeHoy`
(en `app/(tabs)/index.tsx`, vía `useFocusEffect`) crea, de forma
idempotente, las filas `pendiente` de hoy que el cálculo anterior da
como virtuales, cada vez que se abre la pantalla de Inicio. Las
ejecuciones solapadas se reutilizan y el insert lleva
`onConflictDoNothing` sobre el índice único: bug real de tomas
duplicadas (al omitir una, su gemela seguía "apareciendo"). Si la app no se abre un día, ese día no queda registrado como
"omitido" — no hay un cron ni una tarea en segundo plano. Si esto
cambia (por ejemplo al añadir un cumplimiento global que dependa de que
todos los días queden registrados), hay que revisar esta función primero.

**Quitar una toma concreta** (detalle del medicamento → "Próximas tomas",
7 días): si la toma ya tiene fila pasa a tumba `'eliminada'`; si es
virtual se inserta directamente como tumba, que es lo que impide que la
pauta la genere después (`eliminarOcurrencia`). El resto de la pauta no
cambia.

**Terminar no es borrar; y borrar existe aparte.** Decisión del usuario
tras el feedback de beta testers ("Archivados no tiene sentido"):
`medicamentos.activo = false` significa **Terminado**, un tratamiento
que acabó. Llega ahí de dos formas:
- Sola: `terminarTratamientosFinalizados` (al abrir Inicio) termina los
  medicamentos cuyas pautas activas han acabado TODAS
  (`pautaTerminada`: el día siguiente al último, no a la última hora, para
  que el último día aún se puedan marcar las tomas). Un medicamento sin
  pautas activas no se termina solo.
- A mano: `useTerminarMedicamento` (borra solo las pendientes futuras).

Un terminado conserva historial y pautas, sale de Inicio y de los
avisos, y se puede reactivar (`useReactivarMedicamento`): eso desactiva
sus pautas viejas —si no, la terminación automática lo devolvería a
Terminados en la siguiente apertura— y lleva a Editar con la hoja de
"Nueva pauta" abierta. `useMedicamentos()` filtra `activo = true` por
defecto (`soloActivos`).

**Eliminar** (`useEliminarMedicamento`, desde Editar) es borrado
definitivo del medicamento, sus pautas y todo su historial. Borra tomas y
pautas explícitamente antes que el medicamento: **`expo-sqlite` no activa
`PRAGMA foreign_keys` en la conexión de las pantallas**, así que los
`onDelete: 'cascade'` del esquema no se cumplen ahí. No confíes en ellos
para ningún borrado nuevo.

**Editar una pauta vale desde ahora** (`usePautas.ts`): cambiarla o
quitarla borra físicamente sus tomas pendientes futuras (las generó la
pauta, no hace falta tumba) y deja las pasadas como estén. Quitar una
pauta la desactiva (`activo = false`) en vez de borrarla, para que sus
tomas pasadas conserven su franja horaria. El tipo de una pauta no se
cambia al editar: se quita y se añade otra. Un medicamento puede tener
varias pautas (p. ej. 09:00 y 21:00, o una semanal y un tratamiento).

**Inicio es la agenda de hoy: todas las tomas del día por hora, también
las ya resueltas.** Decisión del usuario del 14-09-2026 tras el feedback
de beta testers, que sustituye a la anterior ("una tarjeta por
medicamento con su próxima toma pendiente", que a su vez había
sustituido a una primera lista de tomas de hoy). Motivo del cambio: al
marcar, la toma desaparecía y hacía dudar de si se había guardado, y se
colaban tomas de mañana o de días anteriores. Lo que hace ahora
(`useTomasDeHoy`):
- Solo hoy. Las tomadas se quedan con check verde, las omitidas con X y
  el nombre tachado; las pendientes llevan botones de Tomado/Omitir.
- Agrupadas por hora (varias a las 9:00 = un solo bloque), con el
  progreso "3 / 5" arriba.
- Las pendientes de días anteriores no se mezclan: un aviso con el
  número lleva a Historial.
- Si hoy no queda nada, se indica cuál es la siguiente toma prevista.

El problema que motivó la versión anterior (con "cada 8 horas" salían 3
tarjetas del mismo medicamento) se asume: ahora son 3 filas compactas en
3 horas distintas, que es lo que realmente toca ese día. Si se vuelve a
cambiar el modelo de Inicio, es un cambio de producto: coméntalo primero.

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
Lo mismo con un índice `UNIQUE` nuevo: `drizzle-kit` genera el `CREATE
UNIQUE INDEX` sin más, y en un dispositivo con filas duplicadas la
migración falla. `0002` lleva a mano un `DELETE` previo que conserva, de
cada grupo duplicado, la fila resuelta (tomado > omitido > pospuesto >
eliminada > pendiente). Si regeneras migraciones, no pierdas ese paso.

Antes de dar una migración de este tipo por buena, simúlala con
`better-sqlite3` en un script desechable: aplica la migración anterior,
inserta una fila de prueba, aplica la nueva migración, y comprueba
`PRAGMA foreign_key_check`.

Si se borra o falla la importación de un `.sql` en tiempo de build, revisa
primero estos dos archivos antes de sospechar de Drizzle.

## Rendimiento con mucho histórico

Medido con una base sembrada de 3 años de uso intenso (≈ 40.000 tomas,
6.600 medidas) en `better-sqlite3`; en un móvil, multiplicar por 5-10.
Reglas que salieron de ahí:

- **Ninguna lista de histórico se carga entera.** Historial
  (`useHistorial`, 150 por página) y Registros de Medidas
  (`useMedidasSalud`, 60) paginan por cursor `(fecha, id)` con
  `onEndReached`. Antes Historial copiaba las 40.000 filas a JS en cada
  foco. Al recargar por foco se vuelve a pedir tanto como había cargado,
  para no perder el scroll. Si añades una lista de histórico, copia el patrón.
- **Cursor, no OFFSET, y con el `lte` redundante.** La condición es
  `fecha <= c.fecha AND (fecha < c.fecha OR id < c.id)`. Sin el `lte`,
  SQLite no puede saltar al cursor por el índice y recorre desde el
  principio en cada página (un OFFSET encubierto). Comprobado con
  `EXPLAIN QUERY PLAN`: con él pasa de `SCAN` a `SEARCH`.
- **Índices** (migración `0005`): `tomas(fecha_hora_programada)` para
  todo lo que va por rango de fechas (tomas de hoy, avisos, historial);
  `tomas(medicamento_id, estado)` para el stock (que antes construía un
  índice temporal en cada consulta, ×7 más lento); `tomas(estado, fecha)`
  para "pendientes de días anteriores" (con solo el de fecha, SQLite
  recorría casi toda la tabla y era *más lento* que sin índices);
  `medidas_salud(tipo, fecha_hora)` y `(fecha_hora)`. Antes de añadir o
  quitar un índice, mide con `EXPLAIN QUERY PLAN` sobre datos sembrados:
  un índice mal elegido puede empeorar una consulta.
- Gráficas y su interpretación se calculan con `useMemo` sobre las filas
  del periodo elegido (máximo un año), no sobre el histórico.

Pendiente conocido: la exportación a PDF sigue metiendo todo el
historial en un solo HTML. Es bajo demanda, pero con años de datos puede
ser lenta o fallar; acotarla por periodo es un cambio de producto (qué
se le enseña al médico) y no se ha decidido.

## Esquema de base de datos (`src/db/schema.ts`)

Perfil único por instalación: **no existe tabla de perfiles ni columna
`perfilId`** en ninguna tabla. Añadir un "modo cuidador" multi-perfil
(descartado por ahora, ver `docs/analisis-competencia.md`) requeriría
migrar todas las tablas de abajo.

Tablas: `medicamentos`, `horarios_medicamento`, `tomas`,
`codigos_barras_aprendidos`, `medidas_salud`, `citas_medicas`.

**Dosis:** `medicamentos.dosis` sigue siendo texto ("600 mg") porque lo
leen Inicio, Historial, el PDF, los avisos y los códigos aprendidos, pero
ya no se escribe a mano: el formulario (`formulario.ts`) pide cantidad
numérica + unidad de `UNIDADES_DOSIS` y compone el texto. Una dosis
antigua no numérica se enseña como pista al editar y obliga a poner un
número. **Caducidad:** `fechaCaducidad`, fecha local "YYYY-MM-DD"
opcional; aviso a 30 días (`estadoCaducidad`).

Alta y edición comparten `CamposMedicamento` y `EditorPauta`: editar
debe permitir cambiar lo mismo que se escribió al crear.

**Medidas de salud** (`medidas_salud`, metadatos en
`src/features/medidas-salud/tipos.ts`): columnas genéricas
`valor1`/`valor2`/`valor3` + `notas`. Tensión = sistólica/diastólica/
pulso (el pulso es opcional y va en el mismo registro porque los
tensiómetros dan las tres cifras a la vez). `saturacion` = SpO₂ en %.
`sintoma` es texto libre en `notas` (antes era un número en `valor1`; esos
registros antiguos se siguen mostrando y al editarlos se ofrecen como
texto). Los min/max de `INFO_MEDIDA` solo filtran errores de tecleo, no
son rangos clínicos.

**Stock restante** no se guarda: se calcula en consulta como
`stockInicial − SUM(unidadesPorToma)` de las tomas en estado `tomado`
(ver `useMedicamentos`).

### Decisiones de esquema que no son obvias leyendo el código superficialmente

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
  (`useCrearPauta` → `generarTomasIntervalo`), porque el fin se conoce desde el
  principio.

Por eso `hora`/`diasSemana`/`fechaFin` (solo aplican a 'semanal') y
`frecuenciaHoras`/`duracionDias` (solo a 'intervalo') son todas nullable
a nivel de columna — la obligatoriedad real según
`tipo` se valida en los hooks, no en el esquema. `useAsegurarTomasDeHoy`
y `useCumplimientoPorFranja` filtran explícitamente `tipo='semanal'`; si
se te ocurre "generalizarlos" para que traten ambos tipos igual, primero
piensa en que 'intervalo' ya tiene sus tomas creadas y no tiene una
"franja horaria" fija que atribuirle.

Dentro de `'semanal'` hay dos duraciones (petición de beta testers):
**indefinida** (`fechaFin = null`, p. ej. sertralina de por vida) o **con
fecha límite** (`fechaFin` = último día incluido, como fecha local
`"YYYY-MM-DD"`, no un instante ISO). Se eligió un solo campo nullable en
vez de un enum `duracion` + fecha, que permitiría combinaciones sin
sentido (fecha límite sin fecha). `fechaHoraInicio` también se usa ahora
en `'semanal'`: es el momento en que se creó la pauta, y no se generan
tomas ni avisos anteriores a él (antes, dar de alta a las 20:00 algo
"diario a las 9:00" creaba al instante una toma de hoy "Atrasada"). Las
pautas semanales anteriores a este cambio lo tienen a `null` = sin límite.

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
- `calcularOcurrencias`: una tumba anula la ocurrencia de su pauta ese
  día, así que no se regenera ni avisa.
- `useTomasDeHoy` y `useHistorial`: excluyen `estado != 'eliminada'`
  explícitamente — si no, la fila tumba aparecería en las listas.
- `useCumplimientoPorFranja`: también la excluye, de ambos lados
  (numerador y denominador) — no cuenta como "programada" ni como
  "tomada", como si nunca hubiera existido.
- `useMedicamentos` (stock): no necesita cambio, ya solo suma
  `estado='tomado'`.
- `EditarTomaModal`: filtra `'eliminada'` de los chips de estado
  seleccionables — no es una opción que el usuario elija a mano.

**5. Índice único `tomas(horario_id, fecha_hora_programada)`.** Una pauta
no puede tener dos tomas en el mismo instante. Las manuales
(`horarioId = null`) no chocan: en un índice `UNIQUE` de SQLite los NULL
nunca son iguales, así que no contradice la decisión 1. Efecto visible:
mover una toma con `EditarTomaModal` encima de otra de la misma pauta
falla, y el modal lo explica en vez de reventar.

## Notificaciones locales

**Una sola función, `sincronizarNotificaciones(db)`**
(`src/features/notificaciones/scheduler.ts`): cancela todo lo programado y
vuelve a programar, con triggers `DATE` puntuales, los avisos de las
tomas pendientes de los próximos 14 días según `cargarOcurrencias`. Se
agrupan por minuto (`agrupar.ts`): un aviso con todos los medicamentos de
ese minuto, sea cual sea su tipo de pauta, una línea por medicamento
(Android aplica `BigTextStyle`, se leen todos al expandir).

Se llama tras cualquier escritura que cambie qué toca (marcar, editar o
quitar tomas; crear, cambiar o quitar pautas; editar, terminar, reactivar
o eliminar medicamento),
siempre desde el hook que escribe y sin `await` para no frenar la
interfaz, y al abrir Inicio, que renueva la ventana. Las llamadas se
serializan: dos "cancelar todo + programar" intercalados duplicarían
avisos. Si añades una mutación nueva sobre tomas, horarios o
medicamentos, llama a `sincronizarNotificaciones` desde su hook.

Sustituye a un diseño anterior con triggers `WEEKLY` recurrentes para
`'semanal'` y `DATE` para `'intervalo'`, que tenía tres fallos reportados
por beta testers:
1. Un aviso recurrente no sabe nada del estado de la toma: al omitirla o
   eliminarla seguía sonando.
2. **Expo numera `weekday` de 1 a 7 con 1 = domingo** (no 0 = domingo).
   El mapeo estaba mal: todos los avisos caían un día antes y el domingo
   salía `weekday: 0`, que lanza `RangeError`. Como el bucle entero iba
   en un solo `try/catch`, a partir de ahí no se programaba nada más (de
   ahí "con varios a la misma hora solo sale uno"). Ahora cada
   `scheduleNotificationAsync` tiene su propio `try/catch`.
3. Reprogramar las semanales cancelaba los avisos de los tratamientos.

Límites asumidos: si la app no se abre en 14 días, los avisos se acaban
(no hay tarea en segundo plano que renueve la ventana). Tope de 300
avisos en Android (muchos fabricantes rechazan pasar de 500 alarmas por
app) y 60 en iOS (que solo conserva 64). No se usan identificadores
propios de notificación: como todo sale de SQLite, cancelar todo y
reprogramar es correcto y más simple que un diff.

El texto añade "(antes/después de comer)" cuando aplica.

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
- **Unidades dentro del campo, no debajo.** `TextField` tiene `sufijo`
  ("kg", "horas"); `ayuda` es para pistas y errores. Bug de diseño
  reportado: "kg" suelto bajo el campo de peso parecía otra etiqueta.
- **Nada de controles con scroll horizontal.** Los beta testers no veían
  las opciones de la derecha. `SegmentedControl` es para 2-4 opciones que
  caben; si no caben, `Selector` (campo que abre una hoja con la lista).
  La prop `desplazable` de SegmentedControl queda solo por compatibilidad.
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

## Gráficas de Medidas

Medidas tiene dos secciones, Registros y Gráficas (`PanelGraficas`).
Decisión del usuario sobre la "gráfica global": primero una vista que
interpreta todos los datos y, al bajar, una gráfica por dato. La vista
global **no** es una gráfica con todas las series: peso, tensión y
glucosa no comparten unidad, y un doble eje o normalizarlas engaña. Es
una fila por dato con último valor, tendencia (media del primer tercio
del periodo frente al último), minigráfica con escala propia y una
lectura orientativa (`interpretacion.ts`: tensión según la ESH, SpO₂,
pulso; glucosa sin clasificar salvo extremos porque no se sabe si era en
ayunas). Lleva un aviso de que no es diagnóstico. No añadas consejos
médicos ni cambies umbrales sin fuente clínica.

Gráficas dibujadas a mano con `react-native-svg` (ya era dependencia),
sin librería de gráficas. Reglas que siguen: un solo eje Y por gráfica
(el pulso tiene su propia gráfica, no un segundo eje en la de tensión),
líneas de 2 px, puntos con anillo del color de superficie, rejilla
recesiva, texto nunca del color de la serie, leyenda solo con 2+ series,
y tocar/arrastrar muestra los valores del registro más cercano. Colores
de serie en `colors.serie1`/`serie2`, que no son el primario: el teal de
marca en claro no llega al mínimo de croma para series; los pares se
validaron (daltonismo, contraste) contra `surface` en ambos temas.

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

**Publicar en Google Play está descartado por decisión del usuario**, no
pendiente. Se valoró y se dejó al ver el trámite: 25 $ de alta,
verificación de identidad y, para cuentas personales nuevas, una prueba
cerrada con 12 probadores durante 14 días seguidos antes de poder pasar
a producción. La app se distribuye como APK (`--profile preview`), que
se instala directamente. No propongas publicarla en Play salvo que el
usuario lo saque él.

Por eso tampoco hay política de privacidad, ficha de tienda ni gráfico
promocional: se prepararon como opción y se descartaron con la
publicación.

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
