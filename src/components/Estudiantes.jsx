import { useState } from 'react'
import { useDatos } from '../hooks/useDatos'
import { estudiantesApi } from '../services/api'
import { validarEstudiante } from '../utils/validaciones'
import { mensajeDeError } from '../utils/errores'
import Aviso from './Aviso'
import Campo from './Campo'

const VACIO = { cedula: '', nombres: '', apellidos: '', email: '' }

export default function Estudiantes() {
  const { datos, error, recargar: cargar } = useDatos(estudiantesApi.listar)
  const lista = datos ?? []
  const [form, setForm] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [aviso, setAviso] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  async function guardar(e) {
    e.preventDefault()
    const errs = validarEstudiante(form)          // 1) validación en el cliente
    setErrores(errs)
    if (Object.keys(errs).length) return
    setGuardando(true)                            // evita doble envío
    try {
      await estudiantesApi.crear(form)            // 2) la BD valida otra vez
      setForm(VACIO)
      setAviso({ tipo: 'ok', texto: 'Estudiante registrado correctamente' })
      cargar()
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeDeError(err) })
    } finally {
      setGuardando(false)
    }
  }

  async function alternar(est) {
    try { await estudiantesApi.cambiarEstado(est.id, !est.activo); cargar() }
    catch (err) { setAviso({ tipo: 'error', texto: mensajeDeError(err) }) }
  }

  async function eliminar(est) {
    if (!window.confirm(`¿Eliminar a ${est.apellidos} ${est.nombres}?`)) return
    try { await estudiantesApi.eliminar(est.id); setAviso({ tipo: 'ok', texto: 'Estudiante eliminado' }); cargar() }
    catch (err) { setAviso({ tipo: 'error', texto: mensajeDeError(err) }) }
  }

  return (
    <section>
      <h2>Registro de estudiantes</h2>
      <form className="formulario" onSubmit={guardar} noValidate>
        <Campo etiqueta="Cédula" error={errores.cedula}>
          <input name="cedula" value={form.cedula} onChange={cambiar} maxLength={10} inputMode="numeric" />
        </Campo>
        <Campo etiqueta="Nombres" error={errores.nombres}>
          <input name="nombres" value={form.nombres} onChange={cambiar} />
        </Campo>
        <Campo etiqueta="Apellidos" error={errores.apellidos}>
          <input name="apellidos" value={form.apellidos} onChange={cambiar} />
        </Campo>
        <Campo etiqueta="Correo" error={errores.email}>
          <input name="email" type="email" value={form.email} onChange={cambiar} />
        </Campo>
        <button disabled={guardando}>{guardando ? 'Guardando…' : 'Registrar'}</button>
      </form>
      <Aviso aviso={error ? { tipo: 'error', texto: mensajeDeError(error) } : aviso} />

      <table>
        <thead><tr><th>Cédula</th><th>Apellidos y nombres</th><th>Correo</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {lista.map(e => (
            <tr key={e.id}>
              <td>{e.cedula}</td>
              <td>{e.apellidos} {e.nombres}</td>
              <td>{e.email}</td>
              <td><span className={`etiqueta ${e.activo ? 'APROBADO' : 'REPROBADO'}`}>{e.activo ? 'Activo' : 'Inactivo'}</span></td>
              <td className="acciones">
                <button className="secundario" onClick={() => alternar(e)}>{e.activo ? 'Desactivar' : 'Activar'}</button>
                <button className="peligro" onClick={() => eliminar(e)}>Eliminar</button>
              </td>
            </tr>
          ))}
          {!lista.length && <tr><td colSpan="5" className="vacio">Sin estudiantes registrados</td></tr>}
        </tbody>
      </table>
    </section>
  )
}
