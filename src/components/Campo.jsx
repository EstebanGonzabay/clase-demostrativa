// Campo de formulario con su mensaje de validación.
export default function Campo({ etiqueta, error, children }) {
  return (
    <label className={`campo ${error ? 'campo-error' : ''}`}>
      <span>{etiqueta}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  )
}
