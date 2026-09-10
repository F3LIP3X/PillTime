PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_horarios_medicamento` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`medicamento_id` integer NOT NULL,
	`tipo` text DEFAULT 'semanal' NOT NULL,
	`hora` text,
	`dias_semana` text,
	`frecuencia_horas` integer,
	`fecha_hora_inicio` text,
	`duracion_dias` integer,
	`activo` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_horarios_medicamento`("id", "medicamento_id", "tipo", "hora", "dias_semana", "activo") SELECT "id", "medicamento_id", 'semanal', "hora", "dias_semana", "activo" FROM `horarios_medicamento`;--> statement-breakpoint
DROP TABLE `horarios_medicamento`;--> statement-breakpoint
ALTER TABLE `__new_horarios_medicamento` RENAME TO `horarios_medicamento`;--> statement-breakpoint
PRAGMA foreign_keys=ON;