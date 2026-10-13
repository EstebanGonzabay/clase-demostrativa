import { useState } from 'react'
import { useDatos } from '../hooks/useDatos'
import { asignaturasApi, estudiantesApi, matriculasApi } from '../services/api'
import { validarMatricula } from '../utils/validaciones'
import { mensajeDeError } from '../utils/errores'
import Aviso from './Aviso'
import Campo from './Campo'

const VACIO = { estudiante_id: '', asignatura_id: '', periodo: '2026-2' }

// Las tres consultas se ejecutan en paralelo
const cargarTodo = () => Promise.all([matriculasApi.listar(), estudiantesApi.listar(), asignaturasApi.listar()])

export default function Matriculas() {
  const { datos, error, recargar: cargar } = useDatos(cargarTodo)
  const [lista, todosEstudiantes, asignaturas] = datos ?? [[], [], []]
  const estudiantes = todosEstudiantes.filter(x => x.activo)
  const [form, setForm] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [aviso, setAviso] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  async function guardar(e) {
    e.preventDefault()
    const errs = validarMatricula(form)
    setErrores(errs)
    if (Object.keys(errs).length) return
    setGuardando(true)
    try {
      await matriculasApi.crear(form)
      setForm({ ...VACIO, periodo: form.periodo })
      setAviso({ tipo: 'ok', texto: 'Matrícula registrada correctamente' })
      cargar()
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeDeError(err) })
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(m) {
    if (!window.confirm('¿Anular esta matrícula y sus calificaciones?')) return
    try { await matriculasApi.eliminar(m.id); setAviso({ tipo: 'ok', texto: 'Matrícula anulada' }); cargar() }
    catch (err) { setAviso({ tipo: 'error', texto: mensajeDeError(err) }) }
  }

  return (
    <section>
      <h2>Matrícula de estudiantes en asignaturas</h2>
      <form className="formulario" onSubmit={guardar} noValidate>
        <Campo etiqueta="Estudiante (activos)" error={errores.estudiante_id}>
          <select name="estudiante_id" value={form.estudiante_id} onChange={cambiar}>
            <option value="">— Seleccione —</option>
            {estudiantes.map(e => <option key={e.id} value={e.id}>{e.apellidos} {e.nombres}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Asignatura" error={errores.asignatura_id}>
          <select name="asignatura_id" value={form.asignatura_id} onChange={cambiar}>
            <option value="">— Seleccione —</option>
            {asignaturas.map(a => <option key={a.id} value={a.id}>{a.codigo} · {a.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Periodo" error={errores.periodo}>
          <input name="periodo" value={form.periodo} onChange={cambiar} maxLength={6} placeholder="2026-2" />
        </Campo>
        <button disabled={guardando}>{guardando ? 'Guardando…' : 'Matricular'}</button>
      </form>
      <Aviso aviso={error ? { tipo: 'error', texto: mensajeDeError(error) } : aviso} />

      <table>
        <thead><tr><th>Estudiante</th><th>Asignatura</th><th>Periodo</th><th></th></tr></thead>
        <tbody>
          {lista.map(m => (
            <tr key={m.id}>
              <td>{m.estudiantes?.apellidos} {m.estudiantes?.nombres}</td>
              <td>{m.asignaturas?.codigo} · {m.asignaturas?.nombre}</td>
              <td>{m.periodo}</td>
              <td className="acciones"><button className="peligro" onClick={() => eliminar(m)}>Anular</button></td>
            </tr>
          ))}
          {!lista.length && <tr><td colSpan="4" className="vacio">Sin matrículas registradas</td></tr>}
        </tbody>
      </table>
    </section>
  )
}
