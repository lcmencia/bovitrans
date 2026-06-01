# 01 · Análisis de Negocio — BoviTrans MVP

> **Estado:** borrador en revisión
> **Propósito:** establecer la comprensión compartida del dominio antes de modelar datos
> o escribir código. Es la fuente de verdad de la que derivan el `BACKLOG.md`, el modelo
> de datos y la `DOCUMENTACION.md`.

---

## 1. El problema de negocio

En el sector ganadero, la coordinación de traslados terrestres de ganado vacuno se hace
hoy de forma informal (teléfono, mensajería, planillas sueltas). Esa informalidad produce
dos clases de error costosas:

1. **Errores de capacidad.** Se asigna un camión que no alcanza para todas las cabezas,
   lo que obliga a viajes extra no planificados o, peor, a sobrecargar el vehículo
   (riesgo para el bienestar animal y riesgo legal/operativo).
2. **Errores de costo.** No se conoce el gasto de combustible hasta después de realizado
   el viaje, lo que produce presupuestos imprecisos y pérdida de margen.

**BoviTrans convierte una coordinación intuitiva en una decisión calculada:** antes de
confirmar un traslado, el operador ve distancia, costo proyectado y si el camión elegido
da abasto.

---

## 2. Actores

| Actor | Descripción | Interactúa con el sistema |
|-------|-------------|---------------------------|
| **Cliente / Solicitante** | Persona o empresa que necesita mover ganado de un punto a otro. **Es un usuario con login**: se autentica y crea sus propias solicitudes de transporte. | Registro/login, alta de solicitudes, seguimiento del estado de sus solicitudes. |
| **Operador logístico** | Usuario de la aplicación con rol operativo. Administra la flota y asigna camiones a las solicitudes entrantes. Es quien **toma las decisiones** de logística y costo. | Dashboard, módulo de flotas, asignaciones. |

> **Decisión de alcance (ver ADR en `02-decisiones.md`):** el MVP modela **dos roles
> autenticados** (cliente y operador). El sistema de autenticación distingue el rol y
> habilita vistas/acciones distintas. Esto se eligió por sobre la alternativa de tratar al
> solicitante como simple dato, para reflejar de forma completa el objetivo del PDF de
> "unificar a los operadores logísticos con los clientes".
>
> **Implicancia:** se requiere una entidad **Usuario** (con rol), una **épica de
> autenticación/autorización** en el backlog, y reglas de visibilidad (un cliente solo ve
> sus propias solicitudes; el operador ve todas).

---

## 3. Entidades del dominio

### 3.1 Camión (Flota)
Representa un vehículo disponible para transporte. Sus atributos son **críticos e
inalterables** según la pauta:

- **Patente / matrícula** — identificador único del vehículo (clave natural).
- **Capacidad máxima de carga** — número de cabezas de ganado que transporta de forma
  segura en un solo viaje.
- **Coeficiente de consumo** — litros de combustible por kilómetro recorrido (`L/Km`).

> **Nota de diseño (a resolver en ADR):** "inalterable" implica que capacidad y consumo,
> una vez cargados, no deberían editarse libremente, porque romperían la coherencia de los
> cálculos históricos de viajes ya asignados. Decisión pendiente: bloquear edición vs.
> versionar el vehículo vs. snapshot del dato al momento de asignar.

### 3.2 Usuario
Representa a cualquier persona que se autentica en el sistema.

- **Credenciales** — email + contraseña (hash).
- **Rol** — `cliente` u `operador` (define vistas y permisos).
- **Datos de contacto** — nombre/razón social, etc.

### 3.3 Solicitud de transporte
Representa la necesidad de mover ganado. Es el objeto central del dashboard.

- **Solicitante** — referencia al **Usuario (rol cliente)** que la creó.
- **Cantidad de cabezas** — número de animales a mover.
- **Origen** — punto geográfico de partida (coordenadas).
- **Destino** — punto geográfico de llegada (coordenadas).
- **Camión asignado** — referencia al vehículo (puede ser nulo al inicio).
- **Estado** — situación de la solicitud en su ciclo de vida (a definir en ADR).

### 3.4 Asignación (el cruce de ambos módulos)
No es un dato pasivo: es el **acto** de vincular un camión a una solicitud, y es lo que
**dispara los cálculos y validaciones** del MVP. Es el corazón del desafío.

Datos derivados de la asignación:
- **Distancia (Km)** — proviene de la ruta calculada en el mapa, no la carga el usuario.
- **Costo de combustible proyectado** — calculado (ver Regla 1).
- **Viabilidad de capacidad** — validada (ver Regla 2).

---

## 4. Reglas de negocio

Toda la lógica del MVP gira en torno a la **intersección** de los dos módulos
(solicitudes × flota). Son dos reglas.

### Regla 1 — Cálculo de costo de combustible

```
Costo Combustible = Distancia (Km) × Consumo del vehículo (L/Km) × Precio del combustible por litro
```

- **Distancia** se obtiene del trazado de ruta en el mapa (origen → destino).
- **Consumo** proviene del camión asignado → por eso el costo es **dinámico**: al cambiar
  el camión propuesto, el costo se recalcula al instante.
- **Precio por litro** es un parámetro **configurable** ("fijo o parametrizable" según la
  pauta).

### Regla 2 — Validación de capacidad

Al asignar, se compara:

```
cabezas_solicitadas   vs.   capacidad_del_camión
```

- Si la cantidad solicitada **excede** la capacidad → **alerta inmediata y elegante**.
- El sistema debe **sugerir** la salida: realizar **múltiples viajes** o **cambiar de
  vehículo**.
- Lógica derivada: número mínimo de viajes = `ceil(cabezas_solicitadas / capacidad)`.

---

## 5. Flujo principal (operador)

1. **Entra una solicitud** → aparece como tarjeta en el dashboard, sin camión, en estado
   inicial ("pendiente").
2. El operador la abre y ve **origen/destino trazados en el mapa** → el sistema muestra los
   **kilómetros** de la ruta.
3. El operador **propone asignar un camión** → el sistema:
   - calcula el **costo de combustible** (Regla 1),
   - valida la **capacidad** (Regla 2).
4. Desenlaces:
   - **Cabe:** confirma la asignación; costo proyectado visible; la solicitud cambia de
     estado a "asignada".
   - **No cabe:** alerta + sugerencia (N viajes o cambiar de camión); el operador decide.

---

## 6. Ambigüedades detectadas (entran a la Parte 2 · Decisiones)

La pauta es conceptual a propósito. Estas preguntas no tienen respuesta en el enunciado y
se resolverán como ADRs justificados (`02-decisiones.md`):

Todas resueltas en [`02-decisiones.md`](02-decisiones.md):

0. ✅ ¿El cliente es un usuario con login? → **ADR-000** (sí, dos roles autenticados).
1. ✅ ¿Estados del ciclo de vida de una solicitud? → **ADR-001** (máquina de estados).
2. ✅ ¿El costo se multiplica por la cantidad de viajes? → **ADR-002** (costo total = costo × N viajes).
3. ✅ ¿Distancia y costo se congelan (snapshot) o se recalculan? → **ADR-003** (snapshot al confirmar).
4. ✅ ¿Un camión en más de una solicitud a la vez? → **ADR-004** (exclusividad si está activo).
5. ✅ ¿Qué pasa si ningún camión tiene capacidad? → **ADR-005** (degradación elegante con sugerencia).
6. ✅ ¿Precio del combustible global o por solicitud? → **ADR-006** (parámetro global configurable).
7. ✅ ¿Atributos "inalterables" del camión? → **ADR-007** (patente inmutable, snapshot protege histórico).
8. ✅ ¿Validaciones de integridad? → **ADR-008** (doble capa: DB + API).

---

## 7. Fuera de alcance del MVP (supuestos)

- Sin facturación ni cobros reales.
- Sin tracking GPS en tiempo real del viaje.
- Sin optimización multi-parada ni ruteo avanzado (solo origen → destino).
- Sin multi-empresa / multi-tenant.
