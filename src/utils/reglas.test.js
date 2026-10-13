import { describe, expect, it } from 'vitest'
import { calcularPromedio, determinarEstado } from './reglas'
import { cedulaValida, validarAsignatura, validarEstudiante, validarMatricula, validarNota } from './validaciones'

describe('Reglas de negocio', () => {
  it('calcula el promedio ponderado 30-30-40 sobre 50', () => {
    expect(calcularPromedio({ PARCIAL1: 42.5, PARCIAL2: 45, EXAMEN: 40 })).toBe(42.25)
  })
  it('no calcula el promedio con una nota fuera de rango', () => {
    expect(calcularPromedio({ PARCIAL1: 42.5, PARCIAL2: 45, EXAMEN: 80 })).toBeNull()
  })
  it('devuelve null si falta un componente', () => {
    expect(calcularPromedio({ PARCIAL1: 35, PARCIAL2: 37.5 })).toBeNull()
  })
  it('determina el estado según la nota mínima 35', () => {
    expect(determinarEstado(35)).toBe('APROBADO')
    expect(determinarEstado(34.99)).toBe('REPROBADO')
    expect(determinarEstado(null)).toBe('EN CURSO')
  })
})

describe('Validaciones', () => {
  it('acepta una cédula de 10 dígitos con provincia válida', () => {
    expect(cedulaValida('1710034066')).toBe(true)
    expect(cedulaValida('3012345678')).toBe(true)
    expect(cedulaValida('2512345678')).toBe(false)   // provincia 25 no existe
    expect(cedulaValida('0012345678')).toBe(false)   // provincia 00 no existe
    expect(cedulaValida('171003406')).toBe(false)    // 9 dígitos
    expect(cedulaValida('17100340661')).toBe(false)  // 11 dígitos
    expect(cedulaValida('17A0034066')).toBe(false)   // letras
  })
  it('valida los datos del estudiante', () => {
    const errores = validarEstudiante({ cedula: '1', nombres: 'A1', apellidos: '', email: 'x' })
    expect(Object.keys(errores)).toEqual(['cedula', 'nombres', 'apellidos', 'email'])
  })
  it('valida el formato del código de asignatura y los créditos', () => {
    expect(validarAsignatura({ codigo: 'PRG-101', nombre: 'Programación', creditos: 4 })).toEqual({})
    expect(validarAsignatura({ codigo: 'prg101', nombre: 'P', creditos: 0 })).toHaveProperty('creditos')
  })
  it('valida el periodo de la matrícula', () => {
    expect(validarMatricula({ estudiante_id: 1, asignatura_id: 1, periodo: '2026-3' })).toHaveProperty('periodo')
  })
  it('valida el rango y los decimales de una nota', () => {
    expect(validarNota('43.75')).toBeNull()
    expect(validarNota('50')).toBeNull()
    expect(validarNota('50.5')).toMatch(/entre 0 y 50/)
    expect(validarNota('-1')).toMatch(/entre 0 y 50/)
    expect(validarNota('37.555')).toMatch(/2 decimales/)
    expect(validarNota('')).toMatch(/Ingrese/)
  })
})
