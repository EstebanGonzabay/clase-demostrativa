-- =====================================================================
--  DEMOSTRACIÓN EN CLASE: bloqueo optimista
--  Ejecutar las dos líneas por separado en el SQL Editor de Supabase.
-- =====================================================================

-- Ver la versión actual de la nota 1
select id, componente, nota, version from calificaciones where id = 1;

-- Docente A guarda con la versión que leyó (1) -> éxito, version pasa a 2
select * from actualizar_nota(1, 45.00, 1);

-- Docente B intenta guardar con la misma versión vieja (1) -> CONFLICTO
select * from actualizar_nota(1, 25.00, 1);
