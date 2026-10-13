import { useState } from 'react'
import { useDatos } from '../hooks/useDatos'
import { asignaturasApi } from '../services/api'
import { validarAsignatura } from '../utils/validaciones'
import { mensajeDeError } from '../utils/errores'
import Aviso from './Aviso'
import Campo from './Campo'

const VACIO = { codigo: '', nombre: '', creditos: '' }

export default function Asignaturas() {
  const { datos, error, recargar: cargar } = useDatos(asignaturasApi.listar)
  const lista = datos ?? []
  const [form, setForm] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [aviso, setAviso] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cambiar = (e) => {
    const valor = e.target.name === 'codigo' ? e.target.value.toUpperCase() : e.target.value
    setForm({ ...form, [e.target.name]: valor })
  }

  async function guardar(e) {
    e.preventDefault()
    const errs = validarAsignatura(form)
    setErrores(errs)
    if (Object.keys(errs).length) return
    setGuardando(true)
    try {
      await asignaturasApi.crear(form)
      setForm(VACIO)
      setAviso({ tipo: 'ok', texto: 'Asignatura registrada correctamente' })
      cargar()
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeDeError(err) })
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(a) {
    if (!window.confirm(`¿Eliminar ${a.codigo} ${a.nombre}?`)) return
    try { await asignaturasApi.eliminar(a.id); setAviso({ tipo: 'ok', texto: 'Asignatura eliminada' }); cargar() }
    catch (err) { setAviso({ tipo: 'error', texto: mensajeDeError(err) }) }
  }

  return (
    <section>
      <h2>Registro de asignaturas</h2>
      <form className="formulario" onSubmit={guardar} noValidate>
        <Campo etiqueta="Código" error={errores.codigo}>
          <input name="codigo" value={form.codigo} onChange={cambiar} maxLength={7} placeholder="PRG-101" />
        </Campo>
        <Campo etiqueta="Nombre" error={errores.nombre}>
          <input name="nombre" value={form.nombre} onChange={cambiar} />
        </Campo>
        <Campo etiqueta="Créditos" error={errores.creditos}>
          <input name="creditos" type="number" min="1" max="10" value={form.creditos} onChange={cambiar} />
        </Campo>
        <button disabled={guardando}>{guardando ? 'Guardando…' : 'Registrar'}</button>
      </form>
      <Aviso aviso={error ? { tipo: 'error', texto: mensajeDeError(error) } : aviso} />

      <table>
        <thead><tr><th>Código</th><th>Asignatura</th><th>Créditos</th><th></th></tr></thead>
        <tbody>
          {lista.map(a => (
            <tr key={a.id}>
              <td>{a.codigo}</td>
              <td>{a.nombre}</td>
              <td>{a.creditos}</td>
              <td className="acciones"><button className="peligro" onClick={() => eliminar(a)}>Eliminar</button></td>
            </tr>
          ))}
          {!lista.length && <tr><td colSpan="4" className="vacio">Sin asignaturas registradas</td></tr>}
        </tbody>
      </table>
    </section>
  )
}
