import { useCallback, useEffect, useState } from 'react'

// Hook reutilizable para cargar datos asíncronos.
// - "vigente" evita una condición de carrera: si el componente se cierra o
//   se pide otra carga antes de que llegue la respuesta anterior, esa
//   respuesta vieja se descarta y no sobrescribe datos más nuevos.
// - recargar() vuelve a consultar la base de datos.
export function useDatos(cargar) {
  const [estado, setEstado] = useState({ datos: null, error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    cargar()
      .then(datos => { if (vigente) setEstado({ datos, error: null }) })
      .catch(error => { if (vigente) setEstado(prev => ({ ...prev, error })) })
    return () => { vigente = false }
  }, [cargar, version])

  const recargar = useCallback(() => setVersion(v => v + 1), [])
  return { ...estado, recargar }
}
