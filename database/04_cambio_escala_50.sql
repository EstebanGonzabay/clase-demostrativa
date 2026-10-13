-- =====================================================================
--  MIGRACIÓN: pasar la escala de notas de 0–10 a 0–50 SIN borrar datos
--  Úsalo solo si ya tienes datos cargados con la escala anterior.
--  (Si prefieres empezar limpio, ejecuta 01_esquema.sql y 02_datos_prueba.sql.)
--
--  Todo va dentro de una transacción: si un paso falla (por ejemplo, una
--  nota ya guardada que al multiplicar supera 50), se deshace TODO.
-- =====================================================================
begin;

-- 1) Editar una RESTRICCIÓN: no se modifica, se elimina y se vuelve a crear
alter table calificaciones drop constraint if exists calificaciones_nota_check;

-- 2) Convertir las notas existentes de escala 10 a escala 50
update calificaciones set nota = nota * 5;

-- 3) Nueva restricción: cada nota entre 0 y 50
alter table calificaciones
  add constraint calificaciones_nota_check check (nota between 0 and 50);

-- 4) Editar la VISTA: CREATE OR REPLACE la reemplaza (aprueba con >= 35)
create or replace view v_calificaciones
with (security_invoker = true) as
select
  m.id                                         as matricula_id,
  e.cedula,
  e.apellidos || ' ' || e.nombres              as estudiante,
  a.codigo,
  a.nombre                                     as asignatura,
  m.periodo,
  max(c.nota) filter (where c.componente = 'PARCIAL1') as parcial1,
  max(c.nota) filter (where c.componente = 'PARCIAL2') as parcial2,
  max(c.nota) filter (where c.componente = 'EXAMEN')   as examen,
  case when count(c.id) = 3 then
    round(  max(c.nota) filter (where c.componente = 'PARCIAL1') * 0.30
          + max(c.nota) filter (where c.componente = 'PARCIAL2') * 0.30
          + max(c.nota) filter (where c.componente = 'EXAMEN')   * 0.40, 2)
  end                                          as promedio,
  case
    when count(c.id) < 3 then 'EN CURSO'
    when round(  max(c.nota) filter (where c.componente = 'PARCIAL1') * 0.30
               + max(c.nota) filter (where c.componente = 'PARCIAL2') * 0.30
               + max(c.nota) filter (where c.componente = 'EXAMEN')   * 0.40, 2) >= 35
      then 'APROBADO'
    else 'REPROBADO'
  end                                          as estado
from matriculas m
join estudiantes e on e.id = m.estudiante_id
join asignaturas a on a.id = m.asignatura_id
left join calificaciones c on c.matricula_id = m.id
group by m.id, e.cedula, e.apellidos, e.nombres, a.codigo, a.nombre, m.periodo;

commit;

-- Comprobar
select matricula_id, estudiante, parcial1, parcial2, examen, promedio, estado
from v_calificaciones order by matricula_id;
