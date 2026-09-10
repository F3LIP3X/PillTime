import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Perfil único por instalación (decisión confirmada): no existe tabla de
 * perfiles ni columna perfil_id en ninguna tabla. Si en el futuro se
 * añadiera un "modo cuidador" con varios perfiles locales, requeriría
 * una migración que añada esa columna a todas las tablas de abajo.
 */

export const MOMENTO_COMIDA = ['antes', 'despues', 'ninguno'] as const;
export type MomentoComida = (typeof MOMENTO_COMIDA)[number];

export const ESTADO_TOMA = ['pendiente', 'tomado', 'omitido', 'pospuesto'] as const;
export type EstadoToma = (typeof ESTADO_TOMA)[number];

export const TIPO_MEDIDA_SALUD = ['peso', 'tension', 'glucosa', 'sintoma', 'animo'] as const;
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
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const horariosMedicamento = sqliteTable('horarios_medicamento', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  medicamentoId: integer('medicamento_id')
    .notNull()
    .references(() => medicamentos.id, { onDelete: 'cascade' }),
  /** Hora local en formato "HH:mm". */
  hora: text('hora').notNull(),
  /** CSV de días ISO (1=lunes … 7=domingo), ej. "1,2,3,4,5". */
  diasSemana: text('dias_semana').notNull(),
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
});

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
  unidad: text('unidad'),
  notas: text('notas'),
  fechaHora: text('fecha_hora').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

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
