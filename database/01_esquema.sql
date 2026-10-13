-- =====================================================================
--  SISTEMA DE GESTIÓN DE CALIFICACIONES  ·  Esquema de base de datos
--  Motor: PostgreSQL (Supabase)
--  Ejecutar en: Supabase > SQL Editor > New query > Run
--
--  ATENCIÓN: las líneas DROP borran las tablas y sus datos si ya existen.
--  Úsalo en un proyecto de demostración o haz respaldo antes.
-- =====================================================================

drop view  if exists v_calificaciones;
drop function if exists actualizar_nota(bigint, numeric, int);
drop table if exists calificaciones cascade;
drop table if exists matriculas     cascade;
drop table if exists asignaturas    cascade;
drop table if exists estudiantes    cascade;

-- ---------------------------------------------------------------------
-- 0. FUNCIÓN DE VALIDACIÓN: cédula = 10 dígitos + código de provincia
--    (01 a 24, o 30 para ecuatorianos registrados en el exterior)
-- ---------------------------------------------------------------------
create or replace function cedula_valida(c text)
returns boolean language sql immutable as $$
  select c ~ '^[0-9]{10}$'
     and (substr(c, 1, 2)::int between 1 and 24 or substr(c, 1, 2)::int = 30)
$$;

-- ---------------------------------------------------------------------
-- 1. ESTUDIANTES
-- ---------------------------------------------------------------------
create table estudiantes (
  id          bigint generated always as identity primary key,
  cedula      char(10)     not null unique
              check (cedula_valida(cedula)),
  nombres     varchar(80)  not null check (length(trim(nombres))   >= 2),
  apellidos   varchar(80)  not null check (length(trim(apellidos)) >= 2),
  email       varchar(120) not null unique
              check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  activo      boolean      not null default true,
  creado_en   timestamptz  not null default now()
);

-- ---------------------------------------------------------------------
-- 2. ASIGNATURAS
-- ---------------------------------------------------------------------
create table asignaturas (
  id          bigint generated always as identity primary key,
  codigo      varchar(10)  not null unique
              check (codigo ~ '^[A-Z]{3}-[0-9]{3}$'),          -- ej. PRG-101
  nombre      varchar(100) not null check (length(trim(nombre)) >= 3),
  creditos    smallint     not null check (creditos between 1 and 10),
  creado_en   timestamptz  not null default now()
);

-- ---------------------------------------------------------------------
-- 3. MATRÍCULAS  (resuelve la relación N:M estudiante-asignatura)
-- ---------------------------------------------------------------------
create table matriculas (
  id             bigint generated always as identity primary key,
  estudiante_id  bigint not null references estudiantes(id) on delete restrict,
  asignatura_id  bigint not null references asignaturas(id) on delete restrict,
  periodo        varchar(6) not null check (periodo ~ '^20[0-9]{2}-[12]$'),  -- ej. 2026-2
  creado_en      timestamptz not null default now(),
  -- Regla: un estudiante no puede matricularse dos veces en la misma
  -- asignatura dentro del mismo periodo.
  constraint uq_matricula unique (estudiante_id, asignatura_id, periodo)
);

-- ---------------------------------------------------------------------
-- 4. CALIFICACIONES  (una fila por componente de evaluación)
-- ---------------------------------------------------------------------
create table calificaciones (
  id             bigint generated always as identity primary key,
  matricula_id   bigint not null references matriculas(id) on delete cascade,
  componente     varchar(10) not null
                 check (componente in ('PARCIAL1', 'PARCIAL2', 'EXAMEN')),
  nota           numeric(4,2) not null check (nota between 0 and 50),   -- escala sobre 50 puntos
  version        int not null default 1,          -- control de concurrencia
  actualizado_en timestamptz not null default now(),
  -- Regla: cada componente se registra una sola vez por matrícula.
  constraint uq_componente unique (matricula_id, componente)
);

create index ix_matriculas_estudiante  on matriculas(estudiante_id);
create index ix_matriculas_asignatura  on matriculas(asignatura_id);
create index ix_calificaciones_matric  on calificaciones(matricula_id);

-- ---------------------------------------------------------------------
-- 5. REGLA DE NEGOCIO EN BD: no se matricula a un estudiante inactivo
-- ---------------------------------------------------------------------
create or replace function validar_estudiante_activo()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from estudiantes
                 where id = new.estudiante_id and activo) then
    raise exception 'El estudiante está inactivo y no puede matricularse'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger trg_matricula_estudiante_activo
before insert on matriculas
for each row execute function validar_estudiante_activo();

-- ---------------------------------------------------------------------
-- 6. CONCURRENCIA: bloqueo optimista al modificar una nota
--    Dos docentes abren la misma nota (version = 1). El primero guarda
--    y la versión pasa a 2. El segundo intenta guardar con version = 1:
--    el UPDATE no encuentra la fila y se rechaza el cambio en lugar de
--    sobrescribir silenciosamente ("lost update").
-- ---------------------------------------------------------------------
create or replace function actualizar_nota(p_id bigint, p_nota numeric, p_version int)
returns calificaciones
language plpgsql as $$
declare
  fila calificaciones;
begin
  update calificaciones
     set nota = p_nota,
         version = version + 1,
         actualizado_en = now()
   where id = p_id
     and version = p_version
  returning * into fila;

  if not found then
    raise exception 'CONFLICTO: la nota fue modificada por otro usuario. Recargue los datos.'
      using errcode = 'P0002';
  end if;
  return fila;
end $$;

-- ---------------------------------------------------------------------
-- 7. VISTA DE REPORTE: promedio ponderado y estado
--    Ponderación: Parcial 1 = 30 %, Parcial 2 = 30 %, Examen = 40 %
--    Escala: cada nota y el promedio van de 0 a 50 puntos.
--    Estado: APROBADO si promedio >= 35 (70 %); REPROBADO si < 35;
--            EN CURSO si falta algún componente.
-- ---------------------------------------------------------------------
create view v_calificaciones
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

-- ---------------------------------------------------------------------
-- 8. SEGURIDAD (Row Level Security de Supabase)
--    DEMO: se permite acceso al rol anónimo para que la app funcione sin
--    login. En producción se reemplaza "anon" por "authenticated" y se
--    usa Supabase Auth con roles (docente / secretaría).
-- ---------------------------------------------------------------------
alter table estudiantes    enable row level security;
alter table asignaturas    enable row level security;
alter table matriculas     enable row level security;
alter table calificaciones enable row level security;

create policy demo_estudiantes    on estudiantes    for all to anon, authenticated using (true) with check (true);
create policy demo_asignaturas    on asignaturas    for all to anon, authenticated using (true) with check (true);
create policy demo_matriculas     on matriculas     for all to anon, authenticated using (true) with check (true);
create policy demo_calificaciones on calificaciones for all to anon, authenticated using (true) with check (true);

grant execute on function actualizar_nota(bigint, numeric, int) to anon, authenticated;

-- Permisos explícitos para la API de Supabase (Data API / PostgREST)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
