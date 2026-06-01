# BACKLOG — BoviTrans MVP

> **Entregable de la Fase 1** de la prueba técnica. Desglosa la visión de BoviTrans en
> épicas, historias de usuario (US), criterios de aceptación (CA) y tareas técnicas
> (Tasks). Deriva del análisis documentado en [`docs/`](docs/) y de los ADRs en
> [`docs/02-decisiones.md`](docs/02-decisiones.md).
>
> **Formatos usados**
> - US: *Como [rol], quiero [acción], para [beneficio].*
> - CA: *Dado que… Cuando… Entonces…* (Gherkin).
> - Trazabilidad: cada US referencia el/los ADR que la sustentan.
>
> **Roles:** `Cliente` (crea solicitudes), `Operador` (gestiona flota y asigna).

---

## Índice de épicas

| ID | Épica | Objetivo |
|----|-------|----------|
| E1 | Autenticación y autorización | Acceso seguro y diferenciado por rol |
| E2 | Gestión de flota | Alta y administración de camiones |
| E3 | Solicitudes de transporte | Creación y seguimiento de solicitudes |
| E4 | Asignación, cálculo y capacidad | Núcleo lógico del MVP |
| E5 | Dashboard y mapa interactivo | Visualización y trazado de rutas |
| E6 | Configuración del sistema | Parámetro de precio de combustible |
| E7 | Infraestructura y DevOps | Docker, base de datos, seed |

---

## E1 · Autenticación y autorización
> Sustento: ADR-000, ADR-008.

### US-1.1 — Registro de usuario
*Como* visitante, *quiero* registrarme indicando mi rol (cliente u operador), *para* acceder
a las funciones que me corresponden.

**Criterios de aceptación**
- *Dado que* ingreso email, contraseña y rol válidos, *Cuando* envío el registro, *Entonces*
  se crea mi cuenta con la contraseña almacenada como hash y recibo confirmación.
- *Dado que* el email ya existe, *Cuando* intento registrarme, *Entonces* recibo un error
  `409` y un mensaje claro.
- *Dado que* envío datos inválidos (email mal formado, contraseña corta), *Cuando* envío el
  formulario, *Entonces* recibo un error `400` con el detalle por campo.

**Tasks**
- [ ] T-1.1.1 Tabla `usuarios` con ENUM `rol_usuario` y email único (`CITEXT`).
- [ ] T-1.1.2 Endpoint `POST /api/auth/register` con validación de payload.
- [ ] T-1.1.3 Hash de contraseña (bcrypt/argon2).
- [ ] T-1.1.4 Formulario de registro con validación en cliente.

### US-1.2 — Inicio de sesión
*Como* usuario registrado, *quiero* iniciar sesión, *para* operar dentro del sistema.

**Criterios de aceptación**
- *Dado que* ingreso credenciales correctas, *Cuando* inicio sesión, *Entonces* obtengo una
  sesión válida (cookie/JWT) y soy redirigido a la vista de mi rol.
- *Dado que* ingreso credenciales incorrectas, *Cuando* inicio sesión, *Entonces* recibo un
  error `401` sin revelar si falló el email o la contraseña.

**Tasks**
- [ ] T-1.2.1 Endpoint `POST /api/auth/login`.
- [ ] T-1.2.2 Emisión y verificación de sesión (JWT o cookie de sesión).
- [ ] T-1.2.3 Middleware de protección de rutas por rol.

### US-1.3 — Autorización por rol
*Como* sistema, *quiero* restringir acciones según el rol, *para* que cada usuario solo
acceda a lo que le corresponde.

**Criterios de aceptación**
- *Dado que* soy `cliente`, *Cuando* intento acceder a la gestión de flota, *Entonces*
  recibo `403`.
- *Dado que* soy `cliente`, *Cuando* listo solicitudes, *Entonces* solo veo **las mías**.
- *Dado que* soy `operador`, *Cuando* listo solicitudes, *Entonces* veo **todas**.

**Tasks**
- [ ] T-1.3.1 Helper de autorización por rol reutilizable.
- [ ] T-1.3.2 Filtro de visibilidad de solicitudes según rol.

---

## E2 · Gestión de flota
> Sustento: dominio, ADR-004, ADR-007, ADR-008.

### US-2.1 — Registrar camión
*Como* operador, *quiero* registrar un camión con su patente, capacidad y consumo, *para*
poder asignarlo a solicitudes.

**Criterios de aceptación**
- *Dado que* ingreso patente única, capacidad > 0 y consumo > 0, *Cuando* guardo, *Entonces*
  el camión queda disponible en la flota.
- *Dado que* la patente ya existe, *Cuando* guardo, *Entonces* recibo error `409`.
- *Dado que* ingreso capacidad o consumo ≤ 0, *Cuando* guardo, *Entonces* recibo error `400`.

**Tasks**
- [ ] T-2.1.1 Tabla `camiones` con CHECK (`capacidad>0`, `consumo_l_km>0`) y patente única.
- [ ] T-2.1.2 Endpoint `POST /api/camiones`.
- [ ] T-2.1.3 Formulario de alta de camión.

### US-2.2 — Listar y ver camiones
*Como* operador, *quiero* ver la lista de camiones con sus características, *para* conocer mi
flota disponible.

**Criterios de aceptación**
- *Dado que* tengo camiones cargados, *Cuando* abro la flota, *Entonces* veo patente,
  capacidad, consumo y estado (disponible / en uso).

**Tasks**
- [ ] T-2.2.1 Endpoint `GET /api/camiones` (incluye disponibilidad derivada de ADR-004).
- [ ] T-2.2.2 Vista de listado de flota.

### US-2.3 — Editar camión con resguardo de integridad
*Como* operador, *quiero* corregir datos de un camión, *para* mantener la información al día
sin romper cálculos históricos.

**Criterios de aceptación**
- *Dado que* el camión no tiene solicitudes activas, *Cuando* edito capacidad o consumo,
  *Entonces* se actualiza correctamente.
- *Dado que* el camión tiene una solicitud activa, *Cuando* intento editar capacidad o
  consumo, *Entonces* la acción se rechaza con `409` y mensaje explicativo.
- *Dado que* intento cambiar la patente, *Cuando* guardo, *Entonces* la acción se rechaza
  (patente inmutable, ADR-007).

**Tasks**
- [ ] T-2.3.1 Endpoint `PATCH /api/camiones/:id` con verificación de viajes activos.
- [ ] T-2.3.2 Bloqueo de edición de patente.

### US-2.4 — Baja lógica de camión
*Como* operador, *quiero* dar de baja un camión que ya no uso, *para* que no aparezca como
disponible sin perder su historial.

**Criterios de aceptación**
- *Dado que* el camión no tiene viajes activos, *Cuando* lo doy de baja, *Entonces* queda
  `activo=false` y deja de ofrecerse para asignación, conservando su historial.

**Tasks**
- [ ] T-2.4.1 Columna `activo` y baja lógica en `DELETE /api/camiones/:id`.

---

## E3 · Solicitudes de transporte
> Sustento: ADR-000, ADR-001, ADR-008.

### US-3.1 — Crear solicitud de transporte
*Como* cliente, *quiero* crear una solicitud indicando cantidad de ganado y origen/destino,
*para* pedir el traslado de mis animales.

**Criterios de aceptación**
- *Dado que* indico cabezas > 0 y selecciono origen y destino distintos en el mapa, *Cuando*
  envío la solicitud, *Entonces* se crea en estado `PENDIENTE` asociada a mí.
- *Dado que* origen y destino son el mismo punto, *Cuando* envío, *Entonces* recibo error
  `422`.
- *Dado que* indico cabezas ≤ 0, *Cuando* envío, *Entonces* recibo error `400`.

**Tasks**
- [ ] T-3.1.1 Tabla `solicitudes` con estado, coordenadas y CHECK origen≠destino.
- [ ] T-3.1.2 Endpoint `POST /api/solicitudes`.
- [ ] T-3.1.3 Formulario con selección de puntos en mapa (origen/destino).

### US-3.2 — Seguimiento de mis solicitudes (cliente)
*Como* cliente, *quiero* ver el estado de mis solicitudes, *para* saber en qué etapa está mi
traslado.

**Criterios de aceptación**
- *Dado que* tengo solicitudes, *Cuando* abro mi panel, *Entonces* veo cada una con su estado
  actual y, si está asignada, el costo total proyectado.

**Tasks**
- [ ] T-3.2.1 Endpoint `GET /api/solicitudes` filtrado por `cliente_id`.
- [ ] T-3.2.2 Vista de seguimiento del cliente.

### US-3.3 — Transiciones de estado válidas
*Como* operador, *quiero* avanzar el estado de una solicitud (iniciar viaje, completar,
cancelar), *para* reflejar el progreso real de la operación.

**Criterios de aceptación**
- *Dado que* una solicitud está `ASIGNADA`, *Cuando* inicio el viaje, *Entonces* pasa a
  `EN_TRANSITO`.
- *Dado que* una solicitud está `EN_TRANSITO`, *Cuando* la finalizo, *Entonces* pasa a
  `COMPLETADA` y el camión se libera.
- *Dado que* una solicitud está `COMPLETADA`, *Cuando* intento cambiar su estado, *Entonces*
  la acción se rechaza con `422` (estado terminal).
- *Dado que* una solicitud no está completada, *Cuando* la cancelo, *Entonces* pasa a
  `CANCELADA` y el camión (si tenía) se libera.

**Tasks**
- [ ] T-3.3.1 Servicio de máquina de estados (transiciones válidas centralizadas).
- [ ] T-3.3.2 Endpoint `PATCH /api/solicitudes/:id/estado`.
- [ ] T-3.3.3 Liberación de camión al completar/cancelar.

---

## E4 · Asignación, cálculo y capacidad
> Núcleo del MVP. Sustento: ADR-002, ADR-003, ADR-004, ADR-005, ADR-006.

### US-4.1 — Previsualizar costo al proponer un camión
*Como* operador, *quiero* ver el costo de combustible al elegir un camión antes de confirmar,
*para* comparar opciones y decidir.

**Criterios de aceptación**
- *Dado que* selecciono una solicitud y propongo un camión, *Cuando* el sistema tiene la
  distancia de la ruta, *Entonces* muestra en vivo `costo_por_viaje = distancia × consumo ×
  precio`.
- *Dado que* cambio el camión propuesto, *Cuando* lo selecciono, *Entonces* el costo se
  recalcula dinámicamente.

**Tasks**
- [ ] T-4.1.1 Servicio de cálculo de costo (usa precio global vigente, ADR-006).
- [ ] T-4.1.2 Endpoint `POST /api/solicitudes/:id/previsualizar` (cálculo sin persistir).
- [ ] T-4.1.3 UI de previsualización dinámica.

### US-4.2 — Alerta y sugerencia por exceso de capacidad
*Como* operador, *quiero* ser alertado cuando la carga excede la capacidad del camión, *para*
decidir entre múltiples viajes o cambiar de vehículo.

**Criterios de aceptación**
- *Dado que* las cabezas exceden la capacidad del camión propuesto, *Cuando* lo selecciono,
  *Entonces* veo una alerta clara con `nro_viajes = ceil(cabezas/capacidad)` y el
  `costo_total = costo_por_viaje × nro_viajes`.
- *Dado que* ningún camón disponible cubre la carga en un viaje, *Cuando* abro la asignación,
  *Entonces* el sistema sugiere el camión de mayor capacidad (menos viajes) y muestra su
  costo total (ADR-005, degradación elegante).
- *Dado que* la carga cabe en un viaje, *Cuando* selecciono el camión, *Entonces* no se
  muestra alerta y `nro_viajes = 1`.

**Tasks**
- [ ] T-4.2.1 Lógica de capacidad y cálculo de `nro_viajes`.
- [ ] T-4.2.2 Sugerencia de mejor camión cuando no cabe.
- [ ] T-4.2.3 Componente de alerta/advertencia elegante en la UI.

### US-4.3 — Confirmar asignación con snapshot
*Como* operador, *quiero* confirmar la asignación de un camión, *para* fijar el traslado con
sus costos calculados.

**Criterios de aceptación**
- *Dado que* propongo un camión disponible, *Cuando* confirmo, *Entonces* la solicitud pasa a
  `ASIGNADA` y se persisten `distancia_km`, `consumo_usado`, `precio_litro_usado`,
  `costo_por_viaje`, `nro_viajes`, `costo_total` y `asignada_at` (snapshot, ADR-003).
- *Dado que* el camión ya está en una solicitud activa, *Cuando* confirmo, *Entonces* recibo
  `409` (exclusividad, ADR-004).
- *Dado que* cambia luego el precio global o el camión, *Cuando* consulto una solicitud ya
  asignada, *Entonces* sus costos no cambian (consistencia histórica).

**Tasks**
- [ ] T-4.3.1 Endpoint `POST /api/solicitudes/:id/asignar` (transaccional, con snapshot).
- [ ] T-4.3.2 Índice parcial único `uniq_camion_activo` y manejo de violación → `409`.
- [ ] T-4.3.3 Persistencia de campos snapshot.

---

## E5 · Dashboard y mapa interactivo
> Sustento: descripción del PDF, rúbrica UI/UX (20%).

### US-5.1 — Dashboard de solicitudes (operador)
*Como* operador, *quiero* un panel con todas las solicitudes entrantes, *para* gestionarlas
desde un solo lugar.

**Criterios de aceptación**
- *Dado que* hay solicitudes, *Cuando* abro el dashboard, *Entonces* veo tarjetas con
  solicitante, cabezas, origen/destino y estado.
- *Dado que* quiero enfocarme, *Cuando* filtro por estado, *Entonces* la lista se actualiza.

**Tasks**
- [ ] T-5.1.1 Vista dashboard con tarjetas y filtros por estado.
- [ ] T-5.1.2 Diseño responsivo y prolijo (mobile/desktop).

### US-5.2 — Trazado de ruta y distancia en mapa
*Como* operador, *quiero* ver la ruta entre origen y destino en un mapa con la distancia,
*para* entender el viaje y calcular su costo.

**Criterios de aceptación**
- *Dado que* abro una solicitud, *Cuando* se carga el mapa, *Entonces* veo origen, destino y
  la ruta trazada con la distancia total en km.
- *Dado que* la ruta se calculó, *Cuando* propongo un camión, *Entonces* esa distancia
  alimenta el cálculo de costo (US-4.1).

**Tasks**
- [ ] T-5.2.1 Integrar Leaflet + OpenStreetMap.
- [ ] T-5.2.2 Cálculo de ruta y distancia (servicio de routing OSRM/OSM).
- [ ] T-5.2.3 Selección de puntos origen/destino al crear solicitud.

---

## E6 · Configuración del sistema
> Sustento: ADR-006.

### US-6.1 — Configurar precio del combustible
*Como* operador, *quiero* ajustar el precio del combustible por litro, *para* que los
cálculos reflejen el mercado actual.

**Criterios de aceptación**
- *Dado que* ingreso un precio > 0, *Cuando* guardo, *Entonces* el nuevo precio se usa en los
  cálculos de previsualización siguientes.
- *Dado que* existen solicitudes ya asignadas, *Cuando* cambio el precio, *Entonces* sus
  costos no se alteran (snapshot, ADR-003).

**Tasks**
- [ ] T-6.1.1 Tabla `configuracion` singleton con CHECK `> 0`.
- [ ] T-6.1.2 Endpoints `GET/PUT /api/configuracion`.
- [ ] T-6.1.3 Vista de configuración.

---

## E7 · Infraestructura y DevOps
> Sustento: Fase 2 del PDF, rúbrica Dockerización (15%).

### US-7.1 — Levantar todo con un comando
*Como* evaluador, *quiero* iniciar la aplicación completa con un solo comando, *para*
probarla sin configuración manual.

**Criterios de aceptación**
- *Dado que* clono el repo, *Cuando* ejecuto `docker-compose up --build`, *Entonces* se
  levantan app y base de datos, y la app queda accesible en el puerto documentado.
- *Dado que* es el primer arranque, *Cuando* inicia la DB, *Entonces* se crean tablas y datos
  semilla automáticamente vía `init.sql`.
- *Dado que* reinicio los contenedores, *Cuando* vuelven a levantar, *Entonces* los datos
  persisten (volumen).

**Tasks**
- [ ] T-7.1.1 `Dockerfile` de la app Next.js.
- [ ] T-7.1.2 `docker-compose.yml` (servicios app + db, red, volumen, variables de entorno).
- [ ] T-7.1.3 `init.sql` con esquema + seed (alineado con `docs/03-modelo-de-datos.md`).
- [ ] T-7.1.4 Archivo `.env.example` y documentación de variables.

### US-7.2 — Documentación de arquitectura (Fase 4)
*Como* evaluador, *quiero* documentación rigurosa de la solución, *para* entender la
arquitectura, el modelo de datos y cómo correrla.

**Criterios de aceptación**
- *Dado que* abro `DOCUMENTACION.md`, *Cuando* lo leo, *Entonces* encuentro arquitectura,
  decisiones de modelo de datos, contrato de API y pasos para correr con Docker.

**Tasks**
- [ ] T-7.2.1 Redactar `DOCUMENTACION.md` (asistido por Claude).

---

## Mapa de trazabilidad US ↔ ADR

| US | ADR(s) |
|----|--------|
| US-1.x | ADR-000, ADR-008 |
| US-2.x | ADR-004, ADR-007, ADR-008 |
| US-3.x | ADR-001, ADR-008 |
| US-4.1 | ADR-003, ADR-006 |
| US-4.2 | ADR-002, ADR-005 |
| US-4.3 | ADR-003, ADR-004 |
| US-5.x | descripción PDF |
| US-6.x | ADR-006 |
| US-7.x | Fase 2/4 PDF |

---

## Apéndice · Prompts y árbol de conversación con Claude

> La pauta exige documentar los prompts / el árbol de conversación usado para llegar a este
> backlog. Se resume el flujo real seguido con Claude actuando como BA + Arquitecto.

### Hilo 1 — Comprensión del dominio
- **Prompt:** *"Revisá el PDF de la prueba y explicame la lógica de negocio antes de
  cualquier código."*
- **Resultado:** identificación de actores, entidades (camión, solicitud, asignación), las
  dos reglas núcleo (costo y capacidad) y el flujo del operador. Se detectaron 8
  ambigüedades del enunciado. → `docs/01-analisis-de-negocio.md`.

### Hilo 2 — Resolución de ambigüedades (decisiones)
- **Prompt:** *"Hacé una recomendación fundamentada para cada ambigüedad detectada."*
- **Decisión clave del usuario:** el cliente **es** un usuario con login (Opción B).
- **Resultado:** 9 decisiones documentadas como ADRs (contexto, decisión, alternativas,
  consecuencias). → `docs/02-decisiones.md`.

### Hilo 3 — Modelo de datos
- **Prompt:** *"Traducí las entidades y ADRs a un modelo de datos PostgreSQL."*
- **Resultado:** diagrama ER, tablas con tipos/constraints/índices, elección de motor y la
  estrategia de exclusividad camión↔solicitud (índice parcial único).
  → `docs/03-modelo-de-datos.md`.

### Hilo 4 — Entorno de IA y backlog
- **Prompt:** *"Configurá el entorno de IA y generá el BACKLOG.md con épicas, US, criterios
  y tareas."*
- **Resultado:** `.claude/custom_instructions.md` (rol BA + Arquitecto, contexto, ADRs
  vigentes, convenciones) y este `BACKLOG.md` con trazabilidad US ↔ ADR.

### Principios de prompting aplicados
- **Rol explícito** (BA + Arquitecto senior) para elevar la calidad del análisis.
- **No resolver ambigüedades en silencio:** se listaron y se decidieron con el usuario.
- **Trazabilidad forzada:** cada artefacto referencia su origen (PDF / ADR).
- **Decisiones con trade-offs** (formato ADR) en lugar de respuestas sin fundamento.
