ALTER TABLE `horarios_medicamento` ADD `fecha_fin` text;--> statement-breakpoint
DELETE FROM `tomas` WHERE `horario_id` IS NOT NULL AND `id` NOT IN (SELECT `id` FROM (SELECT `id`, ROW_NUMBER() OVER (PARTITION BY `horario_id`, `fecha_hora_programada` ORDER BY CASE `estado` WHEN 'tomado' THEN 0 WHEN 'omitido' THEN 1 WHEN 'pospuesto' THEN 2 WHEN 'eliminada' THEN 3 ELSE 4 END, `id`) AS `orden` FROM `tomas` WHERE `horario_id` IS NOT NULL) WHERE `orden` = 1);--> statement-breakpoint
CREATE UNIQUE INDEX `tomas_horario_fecha_unica` ON `tomas` (`horario_id`,`fecha_hora_programada`);
