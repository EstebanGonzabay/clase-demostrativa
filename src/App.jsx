import { useState } from 'react'
import Estudiantes from './components/Estudiantes'
import Asignaturas from './components/Asignaturas'
import Matriculas from './components/Matriculas'
import Calificaciones from './components/Calificaciones'

const PESTANAS = [
  { id: 'estudiantes', titulo: 'Estudiantes', componente: Estudiantes },
  { id: 'asignaturas', titulo: 'Asignaturas', componente: Asignaturas },
  { id: 'matriculas', titulo: 'Matrículas', componente: Matriculas },
  { id: 'calificaciones', titulo: 'Calificaciones', componente: Calificaciones },
]

function App() {
  const [activa, setActiva] = useState('estudiantes')
  const Vista = PESTANAS.find(p => p.id === activa).componente

  return (
    <div className="app">
      <header>
        <h1>Sistema de Gestión de Calificaciones</h1>
      </header>
      <nav>
        {PESTANAS.map(p => (
          <button key={p.id} className={p.id === activa ? 'pestana activa' : 'pestana'} onClick={() => setActiva(p.id)}>
            {p.titulo}
          </button>
        ))}
      </nav>
      <main>
        <Vista />
      </main>
    </div>
  )
}

export default App
