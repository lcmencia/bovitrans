<div align="center">

# 🐂 BoviTrans — Gestión de Transporte Ganadero

Plataforma logística para digitalizar y optimizar el transporte terrestre de ganado vacuno.
Calcula distancia, costo de combustible y viabilidad de capacidad **antes** de confirmar cada
traslado.

</div>

---

## ⚡ Quick start

```bash
cp .env.example .env
docker-compose up --build
```

App en **http://localhost:3000**. La base se inicializa sola (esquema + datos semilla).
Registrá un usuario en `/register` (operador o cliente) para empezar.

## 🧱 Stack

Next.js 15 (App Router) · TypeScript · PostgreSQL 16 · Prisma Client · Zod · JWT (jose) ·
Leaflet + OpenStreetMap + OSRM · Tailwind CSS · Docker Compose.

## 🗺️ ¿Qué hace?

- **Cliente:** crea solicitudes de transporte marcando origen y destino en un mapa.
- **Operador:** ve todas las solicitudes en un dashboard, administra la flota de camiones y,
  al asignar un camión, obtiene:
  - la **distancia** de la ruta (real, por carretera),
  - el **costo de combustible** proyectado (`distancia × consumo × precio`),
  - el **costo total** considerando múltiples viajes si la carga excede la capacidad,
  - una **sugerencia** del mejor camión, con advertencias de capacidad.

## 📚 Documentación

| Documento | Contenido |
|-----------|-----------|
| [`DOCUMENTACION.md`](DOCUMENTACION.md) | Arquitectura, modelo de datos, API, cómo correr |
| [`BACKLOG.md`](BACKLOG.md) | Épicas, historias de usuario, criterios, tareas y prompts |
| [`docs/01-analisis-de-negocio.md`](docs/01-analisis-de-negocio.md) | Análisis del dominio |
| [`docs/02-decisiones.md`](docs/02-decisiones.md) | Decisiones de arquitectura (ADRs) |
| [`docs/03-modelo-de-datos.md`](docs/03-modelo-de-datos.md) | Modelo de datos SQL |

## 🤖 Desarrollo asistido por IA

Construido con Claude actuando como Analista de Negocios y Arquitecto. La configuración del
asistente está en [`.claude/custom_instructions.md`](.claude/custom_instructions.md) y el
proceso completo (análisis → ADRs → backlog → código) es trazable en `docs/` y `BACKLOG.md`.

## 🧪 Estado

Verificado end-to-end contra PostgreSQL real: autenticación, roles, CRUD de flota, ciclo de
vida de solicitudes, cálculo de costos, exclusividad de camión y manejo de exceso de
capacidad.
