// Capa de acceso a datos: los componentes NO hablan directo con Supabase,
// llaman a estas funciones. Si mañana cambiamos Supabase por una API REST
// propia (Spring Boot, Node, etc.), solo se modifica este archivo.
import { supabase } from '../supabaseClient'

// Devuelve los datos o lanza el error para que la UI lo traduzca.
async function ejecutar(consulta) {
  const { data, error } = await consulta
  if (error) throw error
  return data
}

// ---------- Estudiantes ----------
export const estudiantesApi = {
  listar: () => ejecutar(supabase.from('estudiantes').select('*').order('apellidos')),
  crear: (e) => ejecutar(supabase.from('estudiantes').insert({
    cedula: e.cedula.trim(),
    nombres: e.nombres.trim(),
    apellidos: e.apellidos.trim(),
    email: e.email.trim().toLowerCase(),
  })),
  cambiarEstado: (id, activo) => ejecutar(supabase.from('estudiantes').update({ activo }).eq('id', id)),
  eliminar: (id) => ejecutar(supabase.from('estudiantes').delete().eq('id', id)),
}

// ---------- Asignaturas ----------
export const asignaturasApi = {
  listar: () => ejecutar(supabase.from('asignaturas').select('*').order('codigo')),
  crear: (a) => ejecutar(supabase.from('asignaturas').insert({
    codigo: a.codigo.trim().toUpperCase(),
    nombre: a.nombre.trim(),
    creditos: Number(a.creditos),
  })),
  eliminar: (id) => ejecutar(supabase.from('asignaturas').delete().eq('id', id)),
}

// ---------- Matrículas ----------
export const matriculasApi = {
  listar: () => ejecutar(
    supabase.from('matriculas')
      .select('id, periodo, estudiantes(apellidos, nombres), asignaturas(codigo, nombre)')
      .order('id', { ascending: false })
  ),
  crear: (m) => ejecutar(supabase.from('matriculas').insert({
    estudiante_id: Number(m.estudiante_id),
    asignatura_id: Number(m.asignatura_id),
    periodo: m.periodo,
  })),
  eliminar: (id) => ejecutar(supabase.from('matriculas').delete().eq('id', id)),
}

// ---------- Calificaciones ----------
export const calificacionesApi = {
  // Reporte consolidado (vista con promedio y estado calculados en la BD)
  reporte: () => ejecutar(supabase.from('v_calificaciones').select('*').order('estudiante')),
  // Notas individuales de una matrícula (incluye version para concurrencia)
  porMatricula: (matriculaId) => ejecutar(
    supabase.from('calificaciones').select('id, componente, nota, version').eq('matricula_id', matriculaId)
  ),
  registrar: (matriculaId, componente, nota) => ejecutar(
    supabase.from('calificaciones').insert({ matricula_id: matriculaId, componente, nota: Number(nota) })
  ),
  // Actualización con bloqueo optimista (función actualizar_nota en la BD)
  actualizar: (id, nota, version) => ejecutar(
    supabase.rpc('actualizar_nota', { p_id: id, p_nota: Number(nota), p_version: version })
  ),
}
