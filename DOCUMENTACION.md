# DOCUMENTACIÓN TÉCNICA — BoviTrans MVP

> Documentación de arquitectura, modelo de datos, API e instrucciones de
> ejecución. El análisis funcional y las decisiones de diseño están en
> [`BACKLOG.md`](BACKLOG.md) y [`docs/`](docs/) (análisis de negocio, ADRs y
> modelo de datos).

---

## 1. Visión general

**BoviTrans** es una plataforma logística para el transporte terrestre de ganado vacuno.
Conecta **clientes** (que solicitan traslados) con **operadores** (que administran una flota
y asignan camiones), calculando distancia, costo de combustible y viabilidad de capacidad
**antes** de confirmar cada viaje.

### Stack
- **Next.js 15** (App Router) + **TypeScript** — frontend y API REST en un solo proyecto.
- **PostgreSQL 16** — base relacional; `init.sql` es la fuente de verdad del esquema.
- **Prisma Client** — capa de acceso a datos tipada (no se usa `prisma migrate`; ver
  [ADR-009](docs/02-decisiones.md)).
- **Zod** — validación de payloads.
- **JWT (jose) + bcryptjs** — autenticación con cookie httpOnly.
- **Leaflet + OpenStreetMap + OSRM** — mapas y cálculo de ruta/distancia.
- **Tailwind CSS** — UI.
- **Docker Compose** — orquestación app + base de datos.

---

## 2. Arquitectura

### 2.1 Capas (separación de responsabilidades)

```
Cliente (React/Tailwind)
        │  fetch
        ▼
Route Handlers  (src/app/api/**)        ← validación (Zod), auth/guards, códigos HTTP
        │
        ▼
Services        (src/services/**)       ← lógica de negocio (máquina de estados, cálculo,
        │                                  asignación, reglas de capacidad)
        ▼
Prisma Client   (src/lib/db.ts)         ← acceso a datos tipado
        │
        ▼
PostgreSQL      (db/init.sql)           ← esquema, constraints, índice parcial único
```

**Principio rector:** las reglas de negocio viven en `services/`, no en los route handlers
ni en los componentes. Los handlers solo orquestan (validan, llaman al servicio, traducen
errores a HTTP). Las **invariantes duras** (exclusividad de camión, unicidades, rangos) se
garantizan además en la **base de datos**, no solo en la aplicación (defensa en profundidad).

### 2.2 Estructura de carpetas

```
src/
├── app/
│   ├── (auth)/                 login, register
│   ├── (operador)/             dashboard, flota, configuracion  (+ layout con guard)
│   ├── (cliente)/              mis-solicitudes, nueva-solicitud  (+ layout con guard)
│   └── api/                    endpoints REST (auth, camiones, solicitudes, configuracion)
├── components/                 UI (auth, dashboard, flota, map, solicitud, configuracion)
├── services/                   camiones, solicitudes, asignacion, configuracion
├── schemas/                    validación Zod por entidad
└── lib/                        db, auth, http, errors, calculo, routing, format, params
```

### 2.3 Manejo de errores y códigos HTTP

Todos los handlers se envuelven en `handle()` ([src/lib/http.ts](src/lib/http.ts)), que
traduce de forma uniforme:

| Situación | HTTP |
|-----------|------|
| Payload inválido (Zod) | `400` |
| No autenticado | `401` |
| Rol incorrecto | `403` |
| Recurso inexistente | `404` |
| Conflicto (patente duplicada, camión ya asignado) | `409` |
| Regla de negocio violada (transición inválida, origen=destino) | `422` |
| Error no controlado | `500` |

Formato de error consistente: `{ "error": { "code", "message", "details?" } }`.

---

## 3. Modelo de datos

Detalle completo (tipos, constraints, índices) en
[`docs/03-modelo-de-datos.md`](docs/03-modelo-de-datos.md). Resumen:

```
usuarios (id, nombre, email, password_hash, rol)
   │  rol ∈ {cliente, operador}
   │
   ├──< solicitudes (cliente_id)            (1 cliente → N solicitudes)
   └──< solicitudes (operador_id)           (1 operador → N solicitudes)

camiones (id, patente, capacidad, consumo_l_km, activo)
   └──< solicitudes (camion_id)             (1 camión → N solicitudes históricas)

configuracion (id=1, precio_combustible_litro)   ← singleton (precio global)

solicitudes (id, cliente_id, operador_id?, camion_id?, solicitante_nombre,
             cabezas, origen/destino lat/lng/label, estado,
             [snapshot] distancia_km, consumo_usado, precio_litro_usado,
                        costo_por_viaje, nro_viajes, costo_total, asignada_at)
```

### Decisiones de diseño destacadas
- **Snapshot de cálculos** (`distancia_km`, `consumo_usado`, `precio_litro_usado`,
  `costo_*`, `nro_viajes`) en `solicitudes`: al confirmar la asignación se congelan, para
  que cambios posteriores en el precio o el camión **no alteren** los costos históricos
  (ADR-003).
- **Tipos `NUMERIC`** para dinero y coeficientes: exactitud, sin errores de punto flotante.
- **ENUM nativos** para `rol` y `estado`: autovalidantes.
- **Índice parcial único** `uniq_camion_activo`: garantiza a nivel DB que un camión no esté
  en dos solicitudes activas a la vez (ADR-004). La app traduce la violación a `409`.

---

## 4. Reglas de negocio (núcleo)

### 4.1 Cálculo de costo (ADR-002)
```
costo_por_viaje = distancia_km × consumo_l_km × precio_litro
nro_viajes      = ceil(cabezas / capacidad)
costo_total     = costo_por_viaje × nro_viajes
```
La **distancia** proviene de OSRM (ruta real por carretera), con **fallback a Haversine** si
OSRM no responde — así el cálculo nunca queda bloqueado por la red.

### 4.2 Capacidad y degradación elegante (ADR-005)
Si la carga excede la capacidad del camión, no se bloquea: el sistema informa el número de
viajes necesarios y, si **ningún** camión cubre la carga en un viaje, **sugiere el de mayor
capacidad** (minimiza viajes). Si varios caben en un viaje, sugiere el **más barato**.

### 4.3 Ciclo de vida de la solicitud (ADR-001)
```
PENDIENTE ──asignar──▶ ASIGNADA ──iniciar──▶ EN_TRANSITO ──finalizar──▶ COMPLETADA
    │                      │                       │
    └─────────── CANCELADA ◀───────────────────────┘
```
Las transiciones inválidas se rechazan con `422`. Al completar/cancelar, el camión se libera
automáticamente (el índice de exclusividad solo cuenta estados activos).

---

## 5. API REST

Autenticación por cookie de sesión httpOnly (`bovitrans_session`). Roles: `cliente`,
`operador`.

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/auth/register` | público | Alta de usuario (cliente/operador) |
| POST | `/api/auth/login` | público | Inicio de sesión |
| POST | `/api/auth/logout` | auth | Cierre de sesión |
| GET | `/api/auth/me` | auth | Usuario actual |
| GET | `/api/camiones` | operador | Lista de flota (`?disponibles=true`) |
| POST | `/api/camiones` | operador | Registrar camión |
| PATCH | `/api/camiones/:id` | operador | Editar capacidad/consumo/activo |
| DELETE | `/api/camiones/:id` | operador | Baja lógica |
| GET | `/api/solicitudes` | auth | Lista (cliente: las suyas; operador: todas; `?estado=`) |
| POST | `/api/solicitudes` | cliente | Crear solicitud |
| GET | `/api/solicitudes/:id/previsualizar` | operador | Costo/capacidad por camión |
| POST | `/api/solicitudes/:id/asignar` | operador | Confirmar asignación (snapshot) |
| PATCH | `/api/solicitudes/:id/estado` | operador | Transición de estado |
| GET | `/api/configuracion` | operador | Precio de combustible vigente |
| PUT | `/api/configuracion` | operador | Actualizar precio |

### Ejemplo: previsualizar asignación
`GET /api/solicitudes/4/previsualizar`
```json
{
  "solicitud_id": "4", "cabezas": 25,
  "distancia_km": 329.07, "precio_litro": 1200,
  "opciones": [
    { "camion_id": "4", "patente": "JKL012", "capacidad": 30,
      "costo_por_viaje": 157953.6, "nro_viajes": 1, "costo_total": 157953.6,
      "excede_capacidad": false }
  ],
  "sugerencia_id": "4", "alguno_cabe_en_un_viaje": true
}
```

---

## 6. Cómo correr el proyecto

### 6.1 Con Docker (recomendado, un solo comando)

```bash
cp .env.example .env          # ajustar credenciales si se desea
docker-compose up --build
```

Esto levanta:
- **db** (PostgreSQL): ejecuta `db/init.sql` (esquema + datos semilla) en el primer arranque,
  con persistencia en el volumen `pgdata`.
- **app** (Next.js): disponible en `http://localhost:3000`.

> En el primer arranque, la base se inicializa sola. Los datos persisten entre reinicios.

### 6.2 Desarrollo local (app fuera de Docker)

```bash
# 1) Levantar solo la base
docker-compose up -d db

# 2) Configurar el entorno (host = localhost para conexión local)
cp .env.example .env
#   DATABASE_URL=postgres://bovitrans:bovitrans@localhost:5432/bovitrans

# 3) Instalar, generar el client y correr
npm install
npx prisma generate
npm run dev                   # http://localhost:3000
```

### 6.3 Re-sincronizar Prisma con el esquema (tras editar init.sql)
```bash
docker-compose up -d db
npx prisma db pull            # introspección del esquema real
npx prisma generate
```

### 6.4 Usuarios de prueba
El seed crea cuentas listas para usar (contraseña **`demo1234`**):

- Operador: `operador@bovitrans.com`
- Clientes: `cliente1@bovitrans.com`, `cliente2@bovitrans.com`, `cliente3@bovitrans.com`

El seed incluye camiones, solicitudes en todos los estados, un viaje en tránsito con
tracking, pagos, documentos (Guía/POD), reseñas y notificaciones.

### 6.5 Endpoints v2 (PRD)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/solicitudes/:id/tracking` | operador | Emitir posición GPS |
| GET | `/api/solicitudes/:id/tracking` | auth | Historial de tracking |
| GET | `/api/solicitudes/:id/tracking/stream` | auth | **SSE** en vivo |
| POST | `/api/solicitudes/:id/entregar` | operador | POD + completar (reconciliación de cabezas) |
| GET | `/api/solicitudes/:id/documentos` | auth | Guía / POD / SENACSA |
| POST | `/api/solicitudes/:id/review` | auth | Calificar al otro participante |
| GET | `/api/pagos` | operador | Billetera (saldos, cobrables, historial) |
| POST | `/api/pagos` | operador | Cobrar un viaje (Net-7 / 48h / 24h) |
| GET | `/api/notificaciones` | auth | Notificaciones + no leídas |
| POST | `/api/notificaciones` | auth | Marcar todas como leídas |

---

## 7. Desarrollo asistido por IA

El proyecto se construyó con un flujo asistido por Claude documentado de forma trazable:

- **Configuración del asistente:** [`.claude/custom_instructions.md`](.claude/custom_instructions.md)
  define a Claude como Analista de Negocios + Arquitecto, con el contexto de dominio y las
  decisiones (ADRs) vigentes que no debe contradecir.
- **Análisis → decisiones → datos:** `docs/01` (negocio), `docs/02` (9 ADRs justificados),
  `docs/03` (modelo de datos).
- **Backlog:** [`BACKLOG.md`](BACKLOG.md) con épicas, historias de usuario, criterios de
  aceptación (Gherkin), tareas y el árbol de prompts utilizado.

Cada artefacto de código referencia, en comentarios, el ADR o la historia de usuario que lo
justifica, manteniendo la trazabilidad de punta a punta.
