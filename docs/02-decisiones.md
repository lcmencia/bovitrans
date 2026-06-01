# 02 · Decisiones de Arquitectura y Negocio (ADRs) — BoviTrans MVP

> **Formato:** cada decisión sigue la estructura ADR (Architecture Decision Record):
> **Contexto** (qué problema/ambigüedad), **Decisión** (qué elegimos), **Alternativas
> consideradas**, **Consecuencias** (qué implica).
> **Estado:** Aceptada salvo indicación contraria.
> Estas decisiones resuelven las ambigüedades listadas en
> [`01-analisis-de-negocio.md`](01-analisis-de-negocio.md) §6.

---

## ADR-000 · El cliente es un usuario autenticado

- **Estado:** Aceptada
- **Contexto:** El PDF habla de "unificar a los operadores logísticos con los clientes",
  pero describe el sistema como "de cara al operador" y al solicitante como "información"
  de la solicitud. No afirma explícitamente que el cliente tenga login.
- **Decisión:** El cliente **es un usuario con login**. El MVP modela **dos roles
  autenticados**: `cliente` y `operador`.
- **Alternativas consideradas:**
  - *Solicitante como simple dato (sin login):* MVP más chico y enfocado, pero deja afuera
    la mitad del objetivo de negocio ("unificar operadores con clientes").
- **Consecuencias:**
  - Se requiere entidad `Usuario` con rol y un módulo de autenticación/autorización.
  - Reglas de visibilidad: el cliente solo ve **sus** solicitudes; el operador ve **todas**.
  - Aparece una épica de Auth en el backlog.

---

## ADR-001 · Ciclo de vida de la solicitud como máquina de estados

- **Estado:** Aceptada
- **Contexto:** El PDF no define los estados de una solicitud. Sin un ciclo de vida claro
  no hay forma consistente de saber qué acciones son válidas en cada momento.
- **Decisión:** Modelar la solicitud como una **máquina de estados** con transiciones
  explícitas y validadas:

  ```
  PENDIENTE ──asignar camión──▶ ASIGNADA ──iniciar viaje──▶ EN_TRANSITO ──finalizar──▶ COMPLETADA
      │                             │                            │
      └──────────── CANCELADA ◀─────┴────────────────────────────┘
  ```

  - `PENDIENTE`: creada por el cliente, sin camión.
  - `ASIGNADA`: el operador asignó y confirmó un camión (snapshot de cálculos, ver ADR-003).
  - `EN_TRANSITO`: el viaje comenzó.
  - `COMPLETADA`: viaje finalizado (estado terminal).
  - `CANCELADA`: rama posible desde cualquier estado **no terminal** (estado terminal).
- **Alternativas consideradas:**
  - *Mínimo (pendiente/asignada):* insuficiente para narrar la operación logística real.
- **Consecuencias:**
  - Las transiciones inválidas se rechazan en API (HTTP 409/422) y se reflejan en la UI.
  - Al cancelarse/completarse, el camión queda liberado (ver ADR-004).

---

## ADR-002 · Costo total considera múltiples viajes

- **Estado:** Aceptada
- **Contexto:** La fórmula del PDF calcula el costo de **un** viaje. Pero si la carga
  excede la capacidad del camión, la operación real requiere varios viajes. ¿Qué costo se
  muestra?
- **Decisión:** Calcular y mostrar **ambos**:
  - `costo_por_viaje = distancia_km × consumo_l_km × precio_litro`
  - `nro_viajes = ceil(cabezas_solicitadas / capacidad_camion)`
  - `costo_total = costo_por_viaje × nro_viajes`
- **Supuesto:** Se contabiliza **solo la ida** (no ida+vuelta). Documentado como supuesto
  parametrizable; cambiarlo es trivial (factor ×2).
- **Alternativas consideradas:**
  - *Solo costo de un viaje:* engañoso, subestima el gasto real de la operación.
- **Consecuencias:**
  - El operador ve el costo real de la operación, no de un tramo.
  - `nro_viajes` y `costo_total` se persisten en la solicitud al confirmar (ADR-003).

---

## ADR-003 · Snapshot de cálculos al confirmar la asignación

- **Estado:** Aceptada
- **Contexto:** Distancia, consumo del camión y precio del combustible pueden cambiar con
  el tiempo. Si se recalculan siempre, los viajes ya confirmados mutarían su costo
  retroactivamente, rompiendo la consistencia histórica.
- **Decisión:** Distinguir dos momentos:
  - **Modo propuesta** (antes de confirmar): los cálculos se hacen **en vivo** y de forma
    dinámica a medida que el operador prueba camiones.
  - **Al confirmar la asignación:** se hace **snapshot**, persistiendo en la solicitud:
    `distancia_km`, `consumo_usado`, `precio_litro_usado`, `costo_por_viaje`, `nro_viajes`
    y `costo_total`.
- **Alternativas consideradas:**
  - *Recalcular siempre:* simple, pero inconsistente con el histórico.
- **Consecuencias:**
  - Los valores quedan congelados y son auditables.
  - Cambios posteriores en precio o camión no afectan solicitudes ya confirmadas.
  - Resuelve también el problema de los atributos "inalterables" del camión (ADR-007).

---

## ADR-004 · Exclusividad del camión mientras está activo

- **Estado:** Aceptada
- **Contexto:** Un mismo camión no puede realizar físicamente dos viajes simultáneos. El
  PDF no lo menciona, pero la consistencia de datos lo exige.
- **Decisión:** Un camión **no puede** estar asignado a dos solicitudes en estado activo
  (`ASIGNADA` o `EN_TRANSITO`) al mismo tiempo. Al pasar la solicitud a `COMPLETADA` o
  `CANCELADA`, el camión vuelve a estar **disponible**.
- **Alternativas consideradas:**
  - *Sin control de exclusividad:* permitiría estados imposibles en el mundo real.
- **Consecuencias:**
  - Validación en la API + restricción a nivel de base de datos (índice parcial único o
    verificación transaccional).
  - La UI solo ofrece camiones disponibles al momento de asignar.

---

## ADR-005 · Degradación elegante cuando ningún camión cubre la carga

- **Estado:** Aceptada
- **Contexto:** El PDF pide "alertar si el ganado excede la capacidad" y "sugerir de forma
  elegante múltiples viajes o cambiar de vehículo". ¿Bloquear o guiar?
- **Decisión:** **No bloquear.** El sistema informa la situación y **sugiere la mejor
  estrategia de múltiples viajes**, priorizando el camión de **mayor capacidad** (minimiza
  el número de viajes), y muestra el `costo_total` resultante. El operador decide.
- **Alternativas consideradas:**
  - *Error seco que impide asignar:* mala UX, no aporta valor de decisión.
- **Consecuencias:**
  - Convierte un caso de error en una recomendación accionable.
  - Es el "manejo interactivo de advertencias de carga" que evalúa la rúbrica (UI/UX 20%).

---

## ADR-006 · Precio del combustible como parámetro global configurable

- **Estado:** Aceptada
- **Contexto:** El PDF permite asumir el precio del combustible "fijo o parametrizable".
- **Decisión:** Modelar el precio como **parámetro global configurable** (tabla
  `configuracion` con un registro editable desde la app). Al confirmar una asignación, el
  valor vigente se **copia** a la solicitud (snapshot, ADR-003).
- **Alternativas consideradas:**
  - *Constante en código:* no configurable, poco realista.
  - *Precio por solicitud:* sobrecarga innecesaria de UI para el MVP.
- **Consecuencias:**
  - El operador puede ajustar el precio cuando cambia el mercado.
  - El histórico se preserva por el snapshot aunque el precio global cambie.

---

## ADR-007 · Atributos "inalterables" del camión

- **Estado:** Aceptada
- **Contexto:** El PDF describe patente, capacidad y consumo como "críticos e
  inalterables". Editarlos libremente rompería cálculos históricos.
- **Decisión:**
  - **Patente:** inmutable siempre (identidad del vehículo).
  - **Capacidad y consumo:** editables **solo** si el camión no tiene viajes activos; los
    cálculos históricos quedan protegidos por el snapshot (ADR-003).
- **Alternativas consideradas:**
  - *Bloqueo total de edición:* poco práctico (errores de carga no se podrían corregir).
  - *Versionado completo del vehículo:* exceso de complejidad para un MVP.
- **Consecuencias:**
  - "Inalterable" se respeta donde importa (la integridad de los costos ya calculados).
  - Edición controlada por estado del camión.

---

## ADR-008 · Validaciones de integridad en doble capa

- **Estado:** Aceptada
- **Contexto:** La rúbrica premia "restricciones lógicas, llaves y consistencia de datos".
- **Decisión:** Validar en **base de datos (constraints)** y en **API (validación de
  payload)** — defensa en profundidad:
  - `capacidad > 0`, `consumo > 0`, `cabezas > 0`, `precio_litro > 0`
  - `patente` única y con formato válido
  - origen ≠ destino (coordenadas distintas)
  - no asignar un camión no disponible (liga con ADR-004)
  - solo transiciones de estado válidas (liga con ADR-001)
- **Alternativas consideradas:**
  - *Validar solo en frontend:* inseguro, se evade fácilmente.
  - *Validar solo en API:* pierde la garantía estructural de la DB.
- **Consecuencias:**
  - Datos consistentes incluso ante errores de cliente o llamadas directas a la API.
  - Errores devueltos con códigos HTTP correctos (400/409/422).

---

## ADR-009 · Prisma como capa de acceso a datos, con `init.sql` autoritativo

- **Estado:** Aceptada
- **Contexto:** Se eligió **Prisma** como capa de datos de la app (Fase 3). Pero la Fase 2
  exige que `init.sql` cree el esquema y el seed automáticamente en Docker. Prisma, por
  defecto, gestiona el esquema vía `prisma migrate`, lo que generaría **doble fuente de
  verdad** del modelo de datos.
- **Decisión:**
  - **`init.sql` es la única fuente de verdad del esquema** (tablas, ENUMs, CHECKs e índice
    parcial único de ADR-004, que Prisma no modela de forma nativa).
  - **Prisma se usa solo como Prisma Client** (acceso tipado a datos), **no** como gestor de
    migraciones. **No se usa `prisma migrate`.**
  - `schema.prisma` se obtiene por **introspección** (`prisma db pull`) de la base ya
    inicializada por `init.sql`, seguido de `prisma generate`.
- **Alternativas consideradas:**
  - *Prisma dueño del esquema (`prisma migrate`):* mejor DX de migraciones, pero rompe el
    requisito de `init.sql` y oculta el SQL que evalúa la rúbrica.
  - *`pg` crudo (sin ORM):* máxima visibilidad de SQL, pero el usuario prefirió Prisma por DX.
- **Consecuencias:**
  - El SQL crítico (constraints, índice parcial) permanece explícito y versionado en `init.sql`.
  - El flujo de arranque es: `docker-compose up` → `init.sql` crea esquema/seed →
    `prisma db pull` + `prisma generate` producen el client tipado.
  - La invariante de exclusividad (ADR-004) la garantiza la **DB**, no Prisma; la app traduce
    el error de unicidad a HTTP 409.

---

## Impacto consolidado en el modelo de datos

Estas decisiones determinan las siguientes entidades (detalle en `03-modelo-de-datos.md`):

| Entidad | Aparece por |
|---------|-------------|
| `usuarios` (con rol) | ADR-000 |
| `camiones` | dominio + ADR-004, ADR-007 |
| `solicitudes` (con campos snapshot y estado) | ADR-001, ADR-002, ADR-003 |
| `configuracion` (precio combustible) | ADR-006 |
| Constraint de exclusividad camión ↔ solicitud activa | ADR-004 |
