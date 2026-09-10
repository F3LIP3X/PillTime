CREATE TABLE `citas_medicas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titulo` text NOT NULL,
	`lugar` text,
	`fecha_hora` text NOT NULL,
	`notas` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `codigos_barras_aprendidos` (
	`codigo_barras` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`dosis` text,
	`notas` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `horarios_medicamento` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`medicamento_id` integer NOT NULL,
	`hora` text NOT NULL,
	`dias_semana` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `medicamentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`dosis` text NOT NULL,
	`unidades_por_toma` integer DEFAULT 1 NOT NULL,
	`stock_inicial` integer DEFAULT 0 NOT NULL,
	`momento_comida` text,
	`codigo_barras` text,
	`notas` text,
	`activo` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `medicamentos_codigo_barras_unique` ON `medicamentos` (`codigo_barras`);--> statement-breakpoint
CREATE TABLE `medidas_salud` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tipo` text NOT NULL,
	`valor_1` real,
	`valor_2` real,
	`unidad` text,
	`notas` text,
	`fecha_hora` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tomas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`medicamento_id` integer NOT NULL,
	`horario_id` integer,
	`fecha_hora_programada` text NOT NULL,
	`fecha_hora_registrada` text,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`motivo_omision` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`horario_id`) REFERENCES `horarios_medicamento`(`id`) ON UPDATE no action ON DELETE set null
);
