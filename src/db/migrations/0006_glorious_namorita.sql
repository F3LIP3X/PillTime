CREATE TABLE `cepillados` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha_hora` text NOT NULL,
	`duracion_segundos` integer NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cepillados_fecha` ON `cepillados` (`fecha_hora`);