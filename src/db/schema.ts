import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Perfil único por instalación (decisión confirmada): no existe tabla de
 * perfiles ni columna perfil_id en ninguna tabla. Si en el futuro se
 * añadiera un "modo cuidador" con varios perfiles locales, requeriría
 * una migración que añada esa columna a todas las tablas de abajo.
 */

export const MOMENTO_COMIDA = ['antes', 'despues', 'ninguno'] as const;
export type MomentoComida = (typeof MOMENTO_COMIDA)[number];

/**
 * 'eliminada' es un estado tumba (tombstone), no un estado real de toma:
 * useEliminarToma NUNCA hace un DELETE físico de la fila. Si borrase la
 * fila y la toma pertenece a un horario 'semanal' activo,
 * useAsegurarTomasDeHoy la volvería a crear en la siguiente apertura de
 * Inicio (solo comprueba si existe una fila para ese horarioId +
 * fechaHoraProgramada, no si "nunca debió volver a existir") — bug real
 * reproducido y confirmado con una simulación antes de este comentario.
 * Por eso "eliminar" es un UPDATE a estado='eliminada': la fila sigue
 * ahí (bloqueando la regeneración) pero queda invisible en todas partes
 * (useTomasDeHoy, useHistorial, useCumplimientoPorFranja la excluyen
 * explícitamente, y no es una opción seleccionable en el selector de
 * estado de EditarTomaModal).
 */
export const ESTADO_TOMA = ['pendiente', 'tomado', 'omitido', 'pospuesto', 'eliminada'] as const;
export type EstadoToma = (typeof ESTADO_TOMA)[number];

/**
 * `tipo` es `text` sin CHECK: añadir un valor aquí (como 'saturacion') no
 * necesita migración. 'sintoma' es texto libre en `notas` (valor1 null);
 * los registros de síntoma anteriores guardaban un número en valor1 y se
 * siguen mostrando.
 */
export const TIPO_MEDIDA_SALUD = ['peso', 'tension', 'glucosa', 'saturacion', 'sintoma', 'animo'] as const;
export type TipoMedidaSalud = (typeof TIPO_MEDIDA_SALUD)[number];

export const medicamentos = sqliteTable('medicamentos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  dosis: text('dosis').notNull(),
  /** Unidades que se consumen de stock en cada toma marcada como "tomado". */
  unidadesPorToma: integer('unidades_por_toma').notNull().default(1),
  /** Stock restante = stockInicial − SUM(unidadesPorToma) de tomas en estado 'tomado'. Se calcula en consulta, no se guarda (ver features/medicamentos). */
  stockInicial: integer('stock_inicial').notNull().default(0),
  momentoComida: text('momento_comida', { enum: MOMENTO_COMIDA }),
  /**
   * Código de barras de la caja, si se dio de alta escaneando.
   * Al guardar, se hace upsert en `codigos_barras_aprendidos` con este
   * mismo código + nombre/dosis, para que un futuro escaneo del mismo
   * código autocomplete el alta (ver decisión "aprendizaje manual
   * reutilizable" — no hay base de datos de medicamentos embebida).
   */
  codigoBarras: text('codigo_barras').unique(),
  /** Ficha informativa básica / alertas asociadas, redactada por el usuario. */
  notas: text('notas'),
  /** Fecha de caducidad de la caja, "YYYY-MM-DD" local (un día del calendario, no un instante). Opcional. */
  fechaCaducidad: text('fecha_caducidad'),
  /**
   * false = "Terminado": un tratamiento que acabó (solo, al pasar el fin
   * de todas sus pautas, o a mano). Sale de Inicio y de los avisos pero
   * conserva historial, y se puede reactivar con una pauta nueva. Borrar
   * de verdad es otra acción distinta (useEliminarMedicamento).
   */
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const TIPO_HORARIO = ['semanal', 'intervalo'] as const;
export type TipoHorario = (typeof TIPO_HORARIO)[number];

/**
 * Dos modos de pauta, elegidos a propósito como modos separados (no un
 * único modelo tipo "cada N horas, sin fecha de fin = crónico"):
 *
 * - 'semanal': hora fija + días de la semana, INDEFINIDO (medicación
 *   crónica, ej. "tensión, todos los días a las 9:00"). Sus tomas se
 *   generan de forma perezosa día a día (ver useAsegurarTomasDeHoy) — no
 *   tiene sentido precrear tomas de algo que no tiene fecha de fin.
 * - 'intervalo': cada `frecuenciaHoras` horas a partir de
 *   `fechaHoraInicio`, durante `duracionDias` días (tratamiento corto,
 *   ej. "antibiótico cada 8 horas durante 7 días"). Como SÍ tiene un
 *   final conocido, sus tomas se generan TODAS de una vez al crear el
 *   horario (ver useCrearTratamientoIntervalo), no de forma perezosa.
 *
 * `hora`/`diasSemana`/`fechaFin` solo se usan (hora y días son NOT NULL a
 * nivel de aplicación) cuando tipo='semanal'; `frecuenciaHoras`/
 * `duracionDias` solo cuando tipo='intervalo'. `fechaHoraInicio` vale para
 * los dos (ver su comentario). SQLite no tiene un modo limpio de exigir
 * "estas columnas obligatorias solo si tipo=X" a nivel de esquema sin
 * CHECK constraints incómodos, así que la validación de qué grupo de
 * columnas es obligatorio según `tipo` vive en la capa de hooks, no aquí.
 */
export const horariosMedicamento = sqliteTable('horarios_medicamento', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  medicamentoId: integer('medicamento_id')
    .notNull()
    .references(() => medicamentos.id, { onDelete: 'cascade' }),
  tipo: text('tipo', { enum: TIPO_HORARIO }).notNull().default('semanal'),
  /** Hora local "HH:mm". Solo para tipo='semanal'. */
  hora: text('hora'),
  /** CSV de días ISO (1=lunes … 7=domingo), ej. "1,2,3,4,5". Solo para tipo='semanal'. */
  diasSemana: text('dias_semana'),
  /** Cada cuántas horas se repite la toma. Solo para tipo='intervalo'. */
  frecuenciaHoras: integer('frecuencia_horas'),
  /**
   * Instante ISO desde el que la pauta está vigente.
   * - 'intervalo': la primera toma del tratamiento.
   * - 'semanal': el momento en que se creó la pauta. No se generan tomas
   *   (ni avisos) de ocurrencias anteriores: sin esto, dar de alta a las
   *   20:00 un medicamento "todos los días a las 9:00" creaba al instante
   *   una toma de hoy ya "Atrasada". Las pautas semanales anteriores a
   *   este cambio lo tienen a null, que significa "sin límite inicial".
   */
  fechaHoraInicio: text('fecha_hora_inicio'),
  /** Duración total del tratamiento en días. Solo para tipo='intervalo'. */
  duracionDias: integer('duracion_dias'),
  /**
   * Último día (incluido) de una pauta 'semanal', como fecha LOCAL
   * "YYYY-MM-DD" — no un instante ISO, porque "hasta el día 12" es un día
   * del calendario del usuario, no una hora UTC. null = indefinido
   * (medicación crónica, hasta que el usuario la archive).
   *
   * Decisión: un solo campo nullable en vez de un enum
   * duración='indefinido'|'fecha_limite' más la fecha. Con el enum
   * existirían combinaciones sin sentido (fecha_limite sin fecha,
   * indefinido con fecha) que habría que validar en todas partes.
   * Solo para tipo='semanal': 'intervalo' ya define su fin con duracionDias.
   */
  fechaFin: text('fecha_fin'),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
});

export const tomas = sqliteTable('tomas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  medicamentoId: integer('medicamento_id')
    .notNull()
    .references(() => medicamentos.id, { onDelete: 'cascade' }),
  /**
   * DECISIÓN EXPLÍCITA (no simplificar poniéndolo NOT NULL):
   * nullable a propósito para permitir tomas puntuales/manuales que no
   * vienen de una pauta fija (`horarios_medicamento`). Efecto en cada
   * métrica que toca esta tabla:
   *  - Aviso de stock bajo: NO depende de horarioId. Se agrega por
   *    medicamentoId sobre TODAS las tomas 'tomado', con o sin horario.
   *  - % cumplimiento por franja horaria: agrupa por horarioId, así que
   *    las tomas con horarioId = null se EXCLUYEN explícitamente
   *    (`WHERE horario_id IS NOT NULL`) — no tienen franja que atribuir.
   *  - % cumplimiento global: si se implementa, SÍ incluye todas las
   *    tomas (con y sin horario), porque mide adherencia general.
   * Si se te ocurre "simplificar" haciendo este campo obligatorio,
   * primero revisa si sigue existiendo el caso de toma manual sin
   * horario fijo — si sigue existiendo, la solución es documentar la
   * exclusión donde corresponda, no eliminar la nulabilidad.
   */
  horarioId: integer('horario_id').references(() => horariosMedicamento.id, {
    onDelete: 'set null',
  }),
  fechaHoraProgramada: text('fecha_hora_programada').notNull(),
  fechaHoraRegistrada: text('fecha_hora_registrada'),
  estado: text('estado', { enum: ESTADO_TOMA }).notNull().default('pendiente'),
  motivoOmision: text('motivo_omision'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
}, (tabla) => [
  /**
   * Una pauta no puede tener dos tomas en el mismo instante. Bug real: dos
   * ejecuciones solapadas de useAsegurarTomasDeHoy (comprueban "¿existe?"
   * y luego insertan, con awaits en medio) podían crear la misma toma dos
   * veces; al omitir una, la gemela seguía pendiente y "volvía a aparecer".
   * Las tomas manuales (horarioId null) no chocan entre sí: en un índice
   * UNIQUE de SQLite, los NULL nunca se consideran iguales.
   */
  uniqueIndex('tomas_horario_fecha_unica').on(tabla.horarioId, tabla.fechaHoraProgramada),
  /**
   * Índices de rendimiento, medidos con una base de 3 años de uso intenso
   * (≈ 40.000 tomas): sin ellos, las consultas por fecha (tomas de hoy,
   * avisos, historial paginado) recorrían la tabla entera, y el stock
   * agregaba todas las tomas construyendo un índice temporal cada vez.
   */
  index('tomas_fecha').on(tabla.fechaHoraProgramada),
  index('tomas_medicamento_estado').on(tabla.medicamentoId, tabla.estado),
  // "Pendientes de días anteriores": con solo tomas_fecha, SQLite recorría
  // por fecha casi toda la tabla (fecha < hoy) y era más lento que sin índice.
  index('tomas_estado_fecha').on(tabla.estado, tabla.fechaHoraProgramada),
]);

/**
 * Tabla de aprendizaje local para el escaneo de códigos de barras.
 *
 * La app es 100% offline y NO incluye una base de datos de medicamentos
 * embebida. En su lugar: la primera vez que se escanea un código nuevo,
 * el usuario rellena nombre/dosis a mano y se guarda aquí; la próxima
 * vez que se escanee ESE MISMO código (en un alta nueva), se autocompleta
 * el formulario con lo guardado. Es una caché de conveniencia, no un
 * catálogo de medicamentos — un mismo código de barras solo puede tener
 * una entrada, que se sobrescribe (upsert) si el usuario corrige el
 * nombre/dosis al editar el medicamento.
 */
export const codigosBarrasAprendidos = sqliteTable('codigos_barras_aprendidos', {
  codigoBarras: text('codigo_barras').primaryKey(),
  nombre: text('nombre').notNull(),
  dosis: text('dosis'),
  notas: text('notas'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const medidasSalud = sqliteTable('medidas_salud', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tipo: text('tipo', { enum: TIPO_MEDIDA_SALUD }).notNull(),
  /** Valor numérico principal (peso, glucosa, sistólica, ...). */
  valor1: real('valor_1'),
  /** Segundo valor, solo para medidas de dos componentes (diastólica). */
  valor2: real('valor_2'),
  /**
   * Tercer valor, hoy solo pulsaciones por minuto dentro de un registro de
   * tensión (los tensiómetros de brazo dan las tres cifras a la vez).
   * Opcional. Columna genérica y no `pulso` para seguir el patrón valor1/2.
   */
  valor3: real('valor_3'),
  unidad: text('unidad'),
  notas: text('notas'),
  fechaHora: text('fecha_hora').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
}, (tabla) => [
  // Registros de un tipo (paginados por fecha) y gráficas por periodo.
  index('medidas_tipo_fecha').on(tabla.tipo, tabla.fechaHora),
  index('medidas_fecha').on(tabla.fechaHora),
]);

export const citasMedicas = sqliteTable('citas_medicas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titulo: text('titulo').notNull(),
  lugar: text('lugar'),
  fechaHora: text('fecha_hora').notNull(),
  notas: text('notas'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

/**
 * Salud dental: un registro por cepillado COMPLETADO. Solo se guarda
 * cuando el temporizador llega al final (2 minutos, la duración que
 * recomiendan la OMS y las sociedades odontológicas); cancelar antes no
 * deja rastro. `fechaHora` es el instante en que terminó.
 * `duracionSegundos` se guarda aunque hoy siempre sea 120, por si en el
 * futuro la duración se puede configurar y cambia lo que significa un
 * registro antiguo.
 */
export const cepillados = sqliteTable('cepillados', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fechaHora: text('fecha_hora').notNull(),
  duracionSegundos: integer('duracion_segundos').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
}, (tabla) => [index('cepillados_fecha').on(tabla.fechaHora)]);

/**
 * Ciclo menstrual (solo visible si en el onboarding se eligió mujer).
 *
 * Se guardan las REGLAS (periodos de sangrado), no los ciclos: un ciclo es
 * lo que va de un inicio de regla al siguiente, y guardarlo aparte
 * duplicaría el dato y se desincronizaría al corregir una fecha. Duraciones,
 * medias, fases y predicciones se calculan (src/features/ciclo/prediccion.ts).
 *
 * Fechas como día local "YYYY-MM-DD", no instantes: "me vino el día 3" es
 * un día del calendario del usuario. `fechaFin` null = regla en curso.
 */
export const periodos = sqliteTable('periodos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fechaInicio: text('fecha_inicio').notNull().unique(),
  fechaFin: text('fecha_fin'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const FLUJO = ['manchado', 'ligero', 'medio', 'abundante'] as const;
export const DOLOR = ['sin-dolor', 'leve', 'moderado', 'fuerte'] as const;
export const ANIMO_CICLO = ['bien', 'sensible', 'irritable', 'triste', 'ansiosa'] as const;
export const ENERGIA = ['baja', 'normal', 'alta'] as const;
export const SINTOMAS_CICLO = [
  'colicos',
  'dolor-cabeza',
  'hinchazon',
  'sensibilidad-pecho',
  'dolor-espalda',
  'acne',
  'nauseas',
  'antojos',
  'insomnio',
] as const;

/**
 * Síntomas de un día del ciclo: una fila por día como máximo (`fecha`
 * única). Selectores rápidos para lo común y `notas` en texto libre para
 * lo demás, igual que los síntomas de Medidas. `sintomas` es CSV de
 * SINTOMAS_CICLO. Todo nullable: se apunta solo lo que el usuario marca.
 */
export const registrosCiclo = sqliteTable('registros_ciclo', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fecha: text('fecha').notNull().unique(),
  flujo: text('flujo', { enum: FLUJO }),
  dolor: text('dolor', { enum: DOLOR }),
  animo: text('animo', { enum: ANIMO_CICLO }),
  energia: text('energia', { enum: ENERGIA }),
  sintomas: text('sintomas'),
  notas: text('notas'),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});
