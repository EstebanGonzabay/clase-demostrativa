# Sistema de Gestión de Calificaciones

Aplicación web que **registra estudiantes, asignaturas y calificaciones**, calcula el promedio ponderado y determina el estado académico (APROBADO / REPROBADO / EN CURSO).

**Tecnologías:** React 19 + Vite 8 (frontend) · Supabase (PostgreSQL 16 administrado en la nube) · Vitest + ESLint (calidad).

---

## 1. Funcionalidades

| Módulo | Qué hace |
|---|---|
| Estudiantes | Registrar, listar, activar/desactivar y eliminar estudiantes |
| Asignaturas | Registrar, listar y eliminar asignaturas |
| Matrículas | Inscribir un estudiante activo en una asignatura para un periodo |
| Calificaciones | Registrar/editar Parcial 1, Parcial 2 y Examen; ver promedio y estado |

## 2. Arquitectura

Arquitectura **cliente-servidor en 3 capas**, con Supabase como *Backend as a Service*:

```
┌──────────────── Navegador ────────────────┐      HTTPS / REST       ┌──────────── Supabase (nube) ────────────┐
│ Presentación  components/*.jsx            │  ───────────────────▶   │ API REST automática (PostgREST)          │
│ Lógica        utils/validaciones, reglas  │                          │ Seguridad: Row Level Security            │
│ Acceso datos  services/api.js             │  ◀───────────────────   │ PostgreSQL: tablas, vista, función,      │
│               supabaseClient.js           │        JSON              │ trigger, restricciones                   │
└───────────────────────────────────────────┘                          └──────────────────────────────────────────┘
```

- **Presentación** (`src/components`): formularios y tablas. No conoce SQL.
- **Lógica de negocio** (`src/utils`): validaciones y reglas como funciones puras, probadas con Vitest.
- **Acceso a datos** (`src/services/api.js`): único lugar que habla con Supabase. Si se cambia el backend (por ejemplo, a Spring Boot), solo cambia este archivo.
- **Base de datos** (`database/*.sql`): es la **fuente de verdad**; repite las reglas críticas para que no se puedan saltar desde fuera de la interfaz.

### Estructura del proyecto

```
notas-app/
├── database/
│   ├── 01_esquema.sql           Tablas, restricciones, trigger, función, vista, seguridad
│   ├── 02_datos_prueba.sql      Datos de ejemplo
│   ├── 03_demo_concurrencia.sql Demostración del bloqueo optimista
│   ├── 04_cambio_escala_50.sql  Migración de escala 0–10 a 0–50 sin borrar datos
│   └── 05_cambio_validacion_cedula.sql  Simplifica la validación de la cédula
├── src/
│   ├── components/              Estudiantes, Asignaturas, Matriculas, Calificaciones, Aviso, Campo
│   ├── hooks/useDatos.js        Carga de datos con protección contra respuestas obsoletas
│   ├── services/api.js          Capa de acceso a datos
│   ├── utils/
│   │   ├── validaciones.js      Reglas de entrada (cédula, correo, códigos, notas)
│   │   ├── reglas.js            Promedio ponderado y estado
│   │   ├── errores.js           Traduce códigos de PostgreSQL a mensajes claros
│   │   └── reglas.test.js       Pruebas unitarias
│   ├── supabaseClient.js        Cliente único (Singleton)
│   └── App.jsx                  Navegación por pestañas
├── .env.example                 Plantilla de variables de entorno
└── package.json
```

## 3. Modelo de datos

```
ESTUDIANTES 1 ──── N MATRICULAS N ──── 1 ASIGNATURAS
                         │ 1
                         │
                         N
                   CALIFICACIONES
```

| Tabla | Campos principales | Restricciones |
|---|---|---|
| `estudiantes` | id, cedula, nombres, apellidos, email, activo | cédula única, 10 dígitos con provincia válida, email único con formato |
| `asignaturas` | id, codigo, nombre, creditos | código único `AAA-000`, créditos 1–10 |
| `matriculas` | id, estudiante_id, asignatura_id, periodo | FK a ambas tablas, periodo `AAAA-1/2`, **UNIQUE(estudiante, asignatura, periodo)** |
| `calificaciones` | id, matricula_id, componente, nota, version | nota 0–10 con 2 decimales, componente ∈ {PARCIAL1, PARCIAL2, EXAMEN}, **UNIQUE(matrícula, componente)** |

**Decisiones de diseño**
- `matriculas` resuelve la relación **muchos a muchos** entre estudiantes y asignaturas y permite que el mismo estudiante repita la asignatura en otro periodo.
- Una fila por componente de nota (en vez de tres columnas) facilita agregar componentes sin cambiar la estructura.
- El esquema está en **3FN**: el promedio y el estado no se guardan, se calculan en la vista `v_calificaciones` (evita datos inconsistentes).
- `ON DELETE RESTRICT` impide borrar un estudiante o asignatura con matrículas; `ON DELETE CASCADE` borra las notas al anular una matrícula.
- Claves `GENERATED ALWAYS AS IDENTITY` (estándar SQL) e índices en las claves foráneas.

## 4. Reglas de negocio

| Regla | Dónde se aplica |
|---|---|
| Promedio = P1·30 % + P2·30 % + Examen·40 % | `reglas.js` (vista previa) y vista `v_calificaciones` (oficial) |
| Notas sobre 50 puntos; aprueba con promedio ≥ 35 (70 %); sin las 3 notas = EN CURSO | `reglas.js` y vista |
| Nota entre 0 y 50, máximo 2 decimales | `validarNota` + `CHECK` + `numeric(4,2)` |
| Cédula: 10 dígitos y provincia 01–24 o 30 | `cedulaValida` + función `cedula_valida()` en BD |
| No duplicar estudiante (cédula/correo) ni asignatura (código) | `UNIQUE` |
| No matricular dos veces en la misma asignatura y periodo | `UNIQUE uq_matricula` |
| Un solo registro por componente de nota | `UNIQUE uq_componente` |
| No matricular a un estudiante inactivo | Filtro en el formulario + **trigger** `trg_matricula_estudiante_activo` |
| No borrar registros con dependencias | `FOREIGN KEY ... ON DELETE RESTRICT` |

### Validación en dos capas

1. **Cliente (React):** respuesta inmediata al usuario, mensajes por campo.
2. **Base de datos:** restricciones `CHECK`, `UNIQUE`, `FK` y triggers. Es la barrera definitiva, porque cualquiera puede llamar a la API sin usar la interfaz.

Los errores de PostgreSQL (`23505` duplicado, `23514` regla violada, `23503` dependencia, `P0001/P0002` reglas propias) se traducen en `utils/errores.js` a mensajes en español; la interfaz nunca muestra errores técnicos ni JSON.

## 5. Concurrencia y procesos

- **Bloqueo optimista:** cada calificación tiene una columna `version`. La función `actualizar_nota(id, nota, version)` solo actualiza si la versión no cambió; si otro docente guardó antes, devuelve *CONFLICTO* en vez de sobrescribir (evita la "actualización perdida"). Probado con dos sesiones simultáneas.
- **Restricciones UNIQUE como control de carrera:** si dos usuarios registran la misma nota o matrícula a la vez, PostgreSQL acepta una y rechaza la otra de forma atómica.
- **Transacciones ACID y MVCC de PostgreSQL:** cada operación es atómica; los lectores no bloquean a los escritores.
- **Concurrencia en el cliente:** JavaScript es de un solo hilo con *event loop*; las llamadas a la BD son asíncronas (`async/await`) para no congelar la interfaz. `Promise.all` ejecuta consultas en paralelo; el hook `useDatos` descarta respuestas obsoletas y los botones se deshabilitan mientras se guarda (evita doble envío).
- **Procesos:** en desarrollo corren dos procesos: el servidor de Vite (Node.js) en la máquina local y el servidor PostgreSQL en Supabase, que atiende a muchos clientes con un pool de conexiones.

## 6. Metodología y prácticas

- **Desarrollo incremental por fases** (enfoque ágil): 1) modelo de datos → 2) conexión y lectura → 3) CRUD por módulo → 4) validaciones y reglas → 5) concurrencia → 6) pruebas y documentación. Cada fase entrega algo funcionando.
- **Control de versiones con Git** (ramas por funcionalidad, commits descriptivos).
- **Separación de responsabilidades** y principio de responsabilidad única (componentes, servicios, utilidades).
- **Pruebas unitarias** (`npm test`) para reglas y validaciones; **análisis estático** con ESLint (`npm run lint`).
- **Configuración externa:** claves en `.env` (excluido de Git), plantilla en `.env.example`.
- **Script SQL versionado** (`database/`): la base se puede recrear en cualquier entorno.

## 7. Instalación y ejecución

Requisitos: Node.js 20+ y una cuenta gratuita de Supabase.

1. En Supabase: **New project** → **SQL Editor** → ejecutar `database/01_esquema.sql` y luego `database/02_datos_prueba.sql`.
2. Copiar `.env.example` como `.env` y colocar la URL y la *publishable key* (Project Settings → API).
3. En la terminal de VS Code:
   ```bash
   npm install
   npm run dev      # http://localhost:5173
   npm test         # pruebas unitarias
   npm run lint     # análisis estático
   ```

## 8. Despliegue

- **Build de producción:** `npm run build` genera la carpeta `dist/` (HTML, CSS y JS estáticos y minificados).
- **Nube (recomendado):** subir el repositorio a GitHub y conectarlo con Vercel o Netlify; definir `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` como variables de entorno. Cada `push` vuelve a desplegar (CI/CD).
- **Servidor local / institucional (teoría):** copiar `dist/` a un servidor web (Nginx, Apache o IIS). La base puede seguir en Supabase o migrarse a un PostgreSQL propio ejecutando los mismos scripts.
- **Contenedores (opcional):** una imagen Nginx con `dist/` y un contenedor PostgreSQL orquestados con Docker Compose.

## 9. Modificar la base sin perder datos

| Objeto | Cómo se edita (Supabase → SQL Editor) |
|---|---|
| Función | `CREATE OR REPLACE FUNCTION` con el código nuevo (mismos parámetros); si cambian, `DROP FUNCTION` y crearla |
| Trigger | `CREATE OR REPLACE TRIGGER`, o `DROP TRIGGER IF EXISTS ... ON tabla` y `CREATE TRIGGER` |
| Vista | `CREATE OR REPLACE VIEW` si las columnas no cambian |
| Restricción CHECK | `ALTER TABLE ... DROP CONSTRAINT` y `ADD CONSTRAINT` con la regla nueva |

Ejemplo: `database/04_cambio_escala_50.sql`, dentro de una transacción para que un error deshaga todo.

## 10. Seguridad y mejoras futuras

- La demo usa políticas RLS abiertas para el rol anónimo. En producción: **Supabase Auth** con roles (docente, secretaría) y políticas que limiten, por ejemplo, que un docente solo califique sus asignaturas.
- Auditoría de cambios de notas (tabla histórica con usuario y fecha).
- Reportes en PDF/Excel, paginación y búsqueda.
- Actualización en tiempo real con Supabase Realtime.

---
Autor: Mgtr. Esteban Gonzabay Jiménez
#   c l a s e - d e m o s t r a t i v a  
 