import { useState } from 'react'
import { useDatos } from '../hooks/useDatos'
import { calificacionesApi } from '../services/api'
import { validarNota } from '../utils/validaciones'
import { mensajeDeError } from '../utils/errores'
import { COMPONENTES, PONDERACION, NOTA_MAXIMA, NOTA_MINIMA_APROBACION, calcularPromedio, determinarEstado } from '../utils/reglas'
import Aviso from './Aviso'

const NOMBRE = { PARCIAL1: 'Parcial 1', PARCIAL2: 'Parcial 2', EXAMEN: 'Examen final' }
const formato = (n) => (n === null || n === undefined ? '—' : Number(n).toFixed(2))

export default function Calificaciones() {
  const { datos, error, recargar: cargarReporte } = useDatos(calificacionesApi.reporte)
  const reporte = datos ?? []
  const [seleccion, setSeleccion] = useState(null)   // fila del reporte en edición
  const [registros, setRegistros] = useState({})     // { PARCIAL1: {id, nota, version} }
  const [notas, setNotas] = useState({})             // valores escritos en el formulario
  const [errores, setErrores] = useState({})
  const [aviso, setAviso] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [verFormula, setVerFormula] = useState(false)

  async function abrir(fila) {
    setSeleccion(fila); setErrores({}); setAviso(null)
    try {
      const datos = await calificacionesApi.porMatricula(fila.matricula_id)
      const porComponente = Object.fromEntries(datos.map(d => [d.componente, d]))
      setRegistros(porComponente)
      setNotas(Object.fromEntries(COMPONENTES.map(c => [c, porComponente[c]?.nota ?? ''])))
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensajeDeError(e) })
    }
  }

  async function guardar(e) {
    e.preventDefault()
    // Solo se validan y guardan los componentes que el usuario llenó o cambió
    const cambios = COMPONENTES.filter(c => notas[c] !== '' && String(notas[c]) !== String(registros[c]?.nota ?? ''))
    const errs = {}
    cambios.forEach(c => { const m = validarNota(notas[c]); if (m) errs[c] = m })
    setErrores(errs)
    if (Object.keys(errs).length) return
    if (!cambios.length) { setAviso({ tipo: 'error', texto: 'No hay cambios para guardar' }); return }

    setGuardando(true)
    try {
      for (const c of cambios) {
        const existente = registros[c]
        if (existente) await calificacionesApi.actualizar(existente.id, notas[c], existente.version) // bloqueo optimista
        else await calificacionesApi.registrar(seleccion.matricula_id, c, notas[c])
      }
      setAviso({ tipo: 'ok', texto: 'Calificaciones guardadas' })
      cargarReporte()
      await abrir(seleccion)
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeDeError(err) })
    } finally {
      setGuardando(false)
    }
  }

  // Valida mientras se escribe: el error aparece al instante y el promedio
  // solo se calcula cuando las tres notas son válidas.
  function cambiarNota(componente, valor) {
    setNotas({ ...notas, [componente]: valor })
    setErrores({ ...errores, [componente]: valor === '' ? undefined : validarNota(valor) ?? undefined })
  }

  const promedioPrevio = calcularPromedio(notas)
  const hayErrores = Object.values(errores).some(Boolean)
  const estadoPrevio = hayErrores ? 'NOTA INVÁLIDA' : determinarEstado(promedioPrevio)

  return (
    <section>
      <div className="titulo-con-ayuda">
        <h2>Calificaciones</h2>
        <span className="ayuda" onMouseLeave={() => setVerFormula(false)}>
          <button type="button" className="ayuda-boton" aria-label="¿Cómo se calcula la nota?"
            aria-expanded={verFormula} onClick={() => setVerFormula(v => !v)}>i</button>
          <span className={`ayuda-nube ${verFormula ? 'visible' : ''}`} role="tooltip">
            <strong>¿Cómo se calcula la nota?</strong>
            <span>Parcial 1 × {PONDERACION.PARCIAL1 * 100}% + Parcial 2 × {PONDERACION.PARCIAL2 * 100}% + Examen × {PONDERACION.EXAMEN * 100}%</span>
            <span>Cada nota va de 0 a {NOTA_MAXIMA} puntos.</span>
            <span>Aprueba con {NOTA_MINIMA_APROBACION} puntos o más.</span>
          </span>
        </span>
      </div>

      {seleccion && (
        <form className="panel" onSubmit={guardar} noValidate>
          <h3>{seleccion.estudiante} — {seleccion.asignatura} ({seleccion.periodo})</h3>
          <div className="formulario">
            {COMPONENTES.map(c => (
              <label key={c} className={`campo ${errores[c] ? 'campo-error' : ''}`}>
                <span>{NOMBRE[c]}</span>
                <input type="number" step="0.01" min="0" max={NOTA_MAXIMA} value={notas[c] ?? ''}
                  onChange={e => cambiarNota(c, e.target.value)} />
                {errores[c] && <small>{errores[c]}</small>}
              </label>
            ))}
            <div className="previo">
              <span>Promedio</span>
              <strong>{formato(promedioPrevio)}</strong>
              <span className={`etiqueta ${hayErrores ? 'REPROBADO' : estadoPrevio.replace(' ', '_')}`}>
                {estadoPrevio}
              </span>
            </div>
          </div>
          <div className="acciones">
            <button disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar notas'}</button>
            <button type="button" className="secundario" onClick={() => setSeleccion(null)}>Cerrar</button>
          </div>
        </form>
      )}
      <Aviso aviso={error ? { tipo: 'error', texto: mensajeDeError(error) } : aviso} />

      <table>
        <thead>
          <tr><th>Estudiante</th><th>Asignatura</th><th>Periodo</th><th>P1</th><th>P2</th><th>Examen</th><th>Promedio</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          {reporte.map(r => (
            <tr key={r.matricula_id} className={seleccion?.matricula_id === r.matricula_id ? 'activa' : ''}>
              <td>{r.estudiante}</td>
              <td>{r.asignatura}</td>
              <td>{r.periodo}</td>
              <td>{formato(r.parcial1)}</td>
              <td>{formato(r.parcial2)}</td>
              <td>{formato(r.examen)}</td>
              <td><strong>{formato(r.promedio)}</strong></td>
              <td><span className={`etiqueta ${r.estado.replace(' ', '_')}`}>{r.estado}</span></td>
              <td className="acciones"><button className="secundario" onClick={() => abrir(r)}>Calificar</button></td>
            </tr>
          ))}
          {!reporte.length && <tr><td colSpan="9" className="vacio">No hay matrículas. Registre una en la pestaña Matrículas.</td></tr>}
        </tbody>
      </table>
    </section>
  )
}
