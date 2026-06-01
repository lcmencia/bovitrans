# 04 · Flujos de Usuario — BoviTrans MVP

> Diagramas de las acciones de cada rol y de los procesos clave. Los diagramas
> Mermaid se renderizan automáticamente en GitHub.

---

## 1. Flujo del Cliente

El cliente solicita traslados y hace seguimiento de su estado.

```mermaid
flowchart TD
    A([Inicio]) --> B{¿Tiene cuenta?}
    B -- No --> R[Registrarse como Cliente]
    B -- Sí --> L[Iniciar sesión]
    R --> MS
    L --> MS[Mis solicitudes]

    MS --> NEW[Nueva solicitud]
    NEW --> M1[Marcar ORIGEN en el mapa]
    M1 --> M2[Marcar DESTINO en el mapa]
    M2 --> M3[Indicar cantidad de cabezas]
    M3 --> V{Validación}
    V -- "origen = destino / cabezas ≤ 0" --> NEW
    V -- OK --> C[Solicitud creada en estado PENDIENTE]
    C --> MS

    MS --> SEG[Ver estado y costo de cada solicitud]
    SEG --> MS
```

**Acciones del cliente**
| Acción | Resultado |
|--------|-----------|
| Registrarse / iniciar sesión | Acceso a su panel |
| Crear solicitud (mapa + cabezas) | Solicitud `PENDIENTE` asociada a él |
| Ver "Mis solicitudes" | Solo las suyas, con estado y costo (si fue asignada) |

> El cliente **no** ve solicitudes de otros ni la flota (autorización por rol).

---

## 2. Flujo del Operador

El operador administra la flota, asigna camiones y gestiona el ciclo de vida.

```mermaid
flowchart TD
    A([Login como Operador]) --> NAV{Navegación}

    NAV --> DASH[Dashboard: todas las solicitudes]
    NAV --> FLOTA[Flota]
    NAV --> CONF[Configuración]

    %% Flota
    FLOTA --> F1[Registrar camión]
    FLOTA --> F2[Dar de baja camión]
    F2 -. "bloqueado si tiene viaje activo" .-> FLOTA

    %% Configuración
    CONF --> C1[Actualizar precio de combustible]

    %% Dashboard / ciclo de vida
    DASH --> P{Estado de la solicitud}
    P -- PENDIENTE --> AS[Asignar camión]
    AS --> PREV[Previsualizar:\ndistancia + costo por camión + sugerencia]
    PREV --> SEL[Seleccionar camión y confirmar]
    SEL --> CHK{¿Camión disponible?}
    CHK -- "no, en uso (409)" --> PREV
    CHK -- sí --> OKA[ASIGNADA + snapshot de costos]

    P -- ASIGNADA --> IT[Iniciar viaje → EN_TRANSITO]
    P -- EN_TRANSITO --> CO[Completar → COMPLETADA]
    P -- "ASIGNADA / EN_TRANSITO" --> CA[Cancelar → CANCELADA]

    OKA --> DASH
    IT --> DASH
    CO --> DASH
    CA --> DASH
```

**Acciones del operador**
| Acción | Resultado |
|--------|-----------|
| Ver dashboard | Todas las solicitudes, con filtro por estado |
| Asignar camión | Cálculo de costo/capacidad → `ASIGNADA` con snapshot |
| Iniciar / Completar / Cancelar | Avanza el ciclo de vida (transiciones válidas) |
| Registrar / dar de baja camión | Gestión de flota (baja bloqueada con viaje activo) |
| Configurar precio de combustible | Afecta los cálculos siguientes (no los ya asignados) |

---

## 3. Máquina de estados de la solicitud (ADR-001)

```mermaid
stateDiagram-v2
    [*] --> PENDIENTE
    PENDIENTE --> ASIGNADA: asignar camión (snapshot)
    PENDIENTE --> CANCELADA: cancelar
    ASIGNADA --> EN_TRANSITO: iniciar viaje
    ASIGNADA --> CANCELADA: cancelar
    EN_TRANSITO --> COMPLETADA: finalizar
    EN_TRANSITO --> CANCELADA: cancelar
    COMPLETADA --> [*]
    CANCELADA --> [*]
```

Cualquier transición fuera de estas flechas se rechaza con HTTP `422`. Al pasar a
`COMPLETADA` o `CANCELADA`, el camión queda **liberado** automáticamente (el índice de
exclusividad solo cuenta estados activos).

---

## 4. Secuencia de asignación (el núcleo)

```mermaid
sequenceDiagram
    actor OP as Operador
    participant API as API REST
    participant SVC as Service asignación
    participant OSRM as OSRM
    participant DB as PostgreSQL

    OP->>API: GET /solicitudes/:id/previsualizar
    API->>SVC: previsualizarAsignacion(id)
    SVC->>OSRM: distancia de la ruta (origen→destino)
    OSRM-->>SVC: km  (si falla → Haversine)
    SVC->>DB: camiones disponibles + precio vigente
    DB-->>SVC: datos
    SVC-->>OP: distancia + costo por camión + sugerencia

    OP->>API: POST /solicitudes/:id/asignar { camion_id }
    API->>SVC: asignarCamion(...)
    SVC->>DB: UPDATE estado=ASIGNADA + snapshot
    alt camión ya asignado (índice único)
        DB-->>SVC: error P2002
        SVC-->>OP: 409 Conflicto
    else ok
        DB-->>SVC: solicitud actualizada
        SVC-->>OP: 200 ASIGNADA con costos
    end
```

---

## 5. Interacción entre ambos roles

```mermaid
flowchart LR
    subgraph Cliente
      C1[Crea solicitud PENDIENTE]
    end
    subgraph Operador
      O1[Ve la solicitud en el dashboard]
      O2[Asigna camión y calcula costo]
      O3[Gestiona el viaje hasta COMPLETADA]
    end
    C1 --> O1 --> O2 --> O3
    O2 -. "estado/costo visibles" .-> C2[Cliente sigue el avance]
    O3 -. .-> C2
```
