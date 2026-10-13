-- =====================================================================
--  DATOS DE PRUEBA  ·  ejecutar después de 01_esquema.sql
--  Notas sobre 50 puntos
-- =====================================================================

insert into estudiantes (cedula, nombres, apellidos, email) values
  ('0801234568', 'Ana María',   'Quiñónez Cortez', 'ana.quinonez@correo.edu.ec'),
  ('0802345678', 'Luis Alberto','Valencia Mina',   'luis.valencia@correo.edu.ec'),
  ('0803456789', 'Carla Sofía', 'Bone Arroyo',     'carla.bone@correo.edu.ec');

insert into asignaturas (codigo, nombre, creditos) values
  ('PRG-101', 'Fundamentos de Programación', 4),
  ('BDD-201', 'Bases de Datos',              4),
  ('ISW-301', 'Ingeniería de Software',      3);

insert into matriculas (estudiante_id, asignatura_id, periodo) values
  (1, 1, '2026-2'), (1, 2, '2026-2'),
  (2, 1, '2026-2'), (2, 2, '2026-2'),
  (3, 1, '2026-2');

insert into calificaciones (matricula_id, componente, nota) values
  (1, 'PARCIAL1', 42.50), (1, 'PARCIAL2', 45.00), (1, 'EXAMEN', 40.00),  -- 42.25 APROBADO
  (2, 'PARCIAL1', 30.00), (2, 'PARCIAL2', 27.50), (2, 'EXAMEN', 35.00),  -- 31.25 REPROBADO
  (3, 'PARCIAL1', 35.00), (3, 'PARCIAL2', 37.50);                         -- EN CURSO
