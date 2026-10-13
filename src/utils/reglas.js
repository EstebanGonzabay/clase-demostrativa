// Reglas de negocio del sistema (funciones puras: fáciles de probar).
// Las mismas reglas están en la base de datos (vista v_calificaciones),
// aquí se usan para mostrar al usuario un cálculo inmediato.

export const PONDERACION = { PARCIAL1: 0.3, PARCIAL2: 0.3, EXAMEN: 0.4 }
export const COMPONENTES = Object.keys(PONDERACION)
export const NOTA_MAXIMA = 50              // escala de calificación: 0 a 50 puntos
export const NOTA_MINIMA_APROBACION = 35   // 70 % de 50

const esNotaValida = (v) => v !== '' && v !== null && v !== undefined && !Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= NOTA_MAXIMA

/** Promedio ponderado sobre 50; null si falta un componente o alguno es inválido. */
export function calcularPromedio(notas) {
  if (!COMPONENTES.every(c => esNotaValida(notas[c]))) return null
  const total = COMPONENTES.reduce((suma, c) => suma + Number(notas[c]) * PONDERACION[c], 0)
  return Math.round(total * 100) / 100
}

/** APROBADO / REPROBADO / EN CURSO */
export function determinarEstado(promedio) {
  if (promedio === null || promedio === undefined) return 'EN CURSO'
  return promedio >= NOTA_MINIMA_APROBACION ? 'APROBADO' : 'REPROBADO'
}
