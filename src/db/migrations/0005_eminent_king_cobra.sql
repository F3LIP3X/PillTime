CREATE INDEX `medidas_tipo_fecha` ON `medidas_salud` (`tipo`,`fecha_hora`);--> statement-breakpoint
CREATE INDEX `medidas_fecha` ON `medidas_salud` (`fecha_hora`);--> statement-breakpoint
CREATE INDEX `tomas_fecha` ON `tomas` (`fecha_hora_programada`);--> statement-breakpoint
CREATE INDEX `tomas_medicamento_estado` ON `tomas` (`medicamento_id`,`estado`);--> statement-breakpoint
CREATE INDEX `tomas_estado_fecha` ON `tomas` (`estado`,`fecha_hora_programada`);