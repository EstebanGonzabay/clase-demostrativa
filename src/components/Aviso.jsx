// Mensaje de éxito o error mostrado al usuario.
export default function Aviso({ aviso }) {
  if (!aviso?.texto) return null
  return (
    <p className={`aviso aviso-${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
      {aviso.texto}
    </p>
  )
}
