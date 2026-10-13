import { NOTA_MAXIMA } from './reglas'

// Validaciones de entrada (capa de presentación).
// Cada función devuelve un objeto { campo: 'mensaje' }; vacío = válido.
// La base de datos repite estas reglas con CHECK / UNIQUE / FK,
// porque el frontend se puede saltar y la BD es la última barrera.

// Cédula: 10 dígitos numéricos y los dos primeros = código de provincia
// (01 a 24, o 30 para ecuatorianos registrados en el exterior).
export function cedulaValida(cedula) {
  if (!/^\d{10}$/.test(cedula)) return false
  const provincia = Number(cedula.slice(0, 2))
  return (provincia >= 1 && provincia <= 24) || provincia === 30
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/

export function validarEstudiante({ cedula, nombres, apellidos, email }) {
  const e = {}
  if (!cedulaValida(cedula?.trim() ?? '')) e.cedula = 'Cédula: 10 dígitos y código de provincia válido (01 a 24 o 30)'
  if (!nombres?.trim() || nombres.trim().length < 2 || !SOLO_LETRAS.test(nombres)) e.nombres = 'Nombres: mínimo 2 letras, sin números'
  if (!apellidos?.trim() || apellidos.trim().length < 2 || !SOLO_LETRAS.test(apellidos)) e.apellidos = 'Apellidos: mínimo 2 letras, sin números'
  if (!EMAIL.test(email?.trim() ?? '')) e.email = 'Correo electrónico no válido'
  return e
}

export function validarAsignatura({ codigo, nombre, creditos }) {
  const e = {}
  if (!/^[A-Z]{3}-\d{3}$/.test(codigo?.trim() ?? '')) e.codigo = 'Formato AAA-000 (ej. PRG-101)'
  if (!nombre?.trim() || nombre.trim().length < 3) e.nombre = 'Nombre: mínimo 3 caracteres'
  const c = Number(creditos)
  if (!Number.isInteger(c) || c < 1 || c > 10) e.creditos = 'Créditos: entero entre 1 y 10'
  return e
}

export function validarMatricula({ estudiante_id, asignatura_id, periodo }) {
  const e = {}
  if (!estudiante_id) e.estudiante_id = 'Seleccione un estudiante'
  if (!asignatura_id) e.asignatura_id = 'Seleccione una asignatura'
  if (!/^20\d{2}-[12]$/.test(periodo ?? '')) e.periodo = 'Periodo con formato AAAA-1 o AAAA-2'
  return e
}

export function validarNota(valor) {
  if (valor === '' || valor === null || valor === undefined) return 'Ingrese una nota'
  const n = Number(valor)
  if (Number.isNaN(n)) return 'La nota debe ser numérica'
  if (n < 0 || n > NOTA_MAXIMA) return `La nota debe estar entre 0 y ${NOTA_MAXIMA}`
  if (!/^\d+(\.\d{1,2})?$/.test(String(valor))) return 'Máximo 2 decimales'
  return null
}
