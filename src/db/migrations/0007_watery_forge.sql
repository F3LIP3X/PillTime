CREATE TABLE `periodos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha_inicio` text NOT NULL,
	`fecha_fin` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `periodos_fecha_inicio_unique` ON `periodos` (`fecha_inicio`);--> statement-breakpoint
CREATE TABLE `registros_ciclo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha` text NOT NULL,
	`flujo` text,
	`dolor` text,
	`animo` text,
	`energia` text,
	`sintomas` text,
	`notas` text,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registros_ciclo_fecha_unique` ON `registros_ciclo` (`fecha`);