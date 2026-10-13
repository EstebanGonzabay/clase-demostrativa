// Traduce los errores técnicos de PostgreSQL a mensajes para el usuario.
// Así la interfaz nunca muestra el error crudo ni JSON.

export function mensajeDeError(error) {
  if (!error) return ''
  const detalle = `${error.message ?? ''} ${error.details ?? ''}`
  switch (error.code) {
    case '23505': // unique_violation
      if (detalle.includes('cedula')) return 'Ya existe un estudiante con esa cédula'
      if (detalle.includes('email')) return 'Ya existe un estudiante con ese correo'
      if (detalle.includes('codigo')) return 'Ya existe una asignatura con ese código'
      if (detalle.includes('uq_matricula')) return 'El estudiante ya está matriculado en esa asignatura en ese periodo'
      if (detalle.includes('uq_componente')) return 'Ese componente ya tiene nota registrada'
      return 'Registro duplicado'
    case '23514': // check_violation
      return 'Algún dato no cumple las reglas del sistema (revise formatos y rangos)'
    case '23503': // foreign_key_violation
      return 'No se puede eliminar: tiene registros relacionados (matrículas o calificaciones)'
    case 'P0001': // regla de negocio (trigger)
    case 'P0002': // conflicto de concurrencia
      return error.message
    default:
      return 'No se pudo completar la operación. Verifique la conexión con la base de datos.'
  }
}
