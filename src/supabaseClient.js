import { createClient } from '@supabase/supabase-js'

// Lee la dirección y la clave pública desde el archivo .env
const url = import.meta.env.VITE_SUPABASE_URL
// Acepta el nombre que usa la guía de Supabase o el nombre corto
const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_KEY

if (!url || !clave) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en el archivo .env')
}

// Un único cliente (patrón Singleton) para toda la aplicación
export const supabase = createClient(url, clave)
