-- =====================================================================
--  CAMBIO: validación de cédula más simple, SIN borrar datos
--  Antes: 10 dígitos + provincia + tercer dígito + dígito verificador (módulo 10)
--  Ahora: 10 dígitos + provincia (01 a 24, o 30)
--
--  Ejemplo de cómo EDITAR UNA FUNCIÓN: CREATE OR REPLACE la reemplaza.
--  La restricción CHECK de la tabla estudiantes llama a esta función,
--  así que desde ahora usa la regla nueva automáticamente.
-- =====================================================================
create or replace function cedula_valida(c text)
returns boolean language plpgsql immutable as $$
begin
  return c ~ '^[0-9]{10}$'
     and (substr(c, 1, 2)::int between 1 and 24 or substr(c, 1, 2)::int = 30);
end $$;

-- Comprobar
select cedula_valida('1710034066') as provincia_17_valida,     -- true
       cedula_valida('2512345678') as provincia_25_invalida,   -- false
       cedula_valida('171003406')  as nueve_digitos_invalida;  -- false
