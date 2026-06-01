# 05 · Visión de Producto v2 — BoviTrans

> **Naturaleza de este documento:** es una **visión/roadmap a futuro**, no parte del MVP de
> la prueba técnica (ese MVP ya está entregado y verificado). Toma como inspiración un PRD de
> plataforma logística two-sided (estilo Uber Freight) y lo **adapta al dominio ganadero y al
> stack/decisiones reales de BoviTrans**, sin perder la esencia del proyecto original.
>
> **Esencia que se preserva (del primer PDF):** transporte terrestre de **ganado vacuno**;
> el **operador logístico** como orquestador que asigna su flota; el núcleo de **cálculo de
> costo de combustible y validación de capacidad**; y las decisiones ya tomadas
> ([ADRs](02-decisiones.md)).

---

## 1. De dónde partimos y hacia dónde vamos

| | MVP actual (v1) | Visión v2 |
|---|---|---|
| **Dominio** | Transporte de ganado vacuno | Igual (no se diluye a "carga genérica") |
| **Actores** | Cliente, Operador | + Transportista (opcional), Admin |
| **Core** | Solicitud → asignación → costo/capacidad | Igual, enriquecido con tracking, pagos y docs |
| **Alcance** | Dashboard, flota, mapa, cálculo | + Marketplace, tracking GPS, billetera, compliance |

El PRD de referencia es un **marketplace two-sided** donde transportistas independientes
eligen cargas. BoviTrans v1 es **operador-céntrico** (un operador asigna su propia flota).
**Decisión rectora de v2:** mantenemos el modelo operador-céntrico como base (es la esencia)
y habilitamos progresivamente capacidades de marketplace, sin forzar un giro de modelo de
negocio que rompería lo construido.

---

## 2. Reconciliación de terminología (PRD → BoviTrans)

| PRD (Uber Freight) | BoviTrans v2 | Nota |
|---|---|---|
| Dador de carga (shipper) | **Cliente** | Ya existe (rol `cliente`) |
| Transportista | **Operador** (y, a futuro, rol `transportista`) | v1 ya tiene `operador` |
| Load (carga) | **Solicitud de transporte** | Misma entidad, enriquecida |
| Commodity / toneladas | **Cabezas de ganado** | La unidad ganadera es la esencia |
| Carta Flete / DINATRAN / SIFEN (granos) | **Guía de traslado de ganado / SENACSA** | Compliance **ganadero** (no de granos) |

---

## 3. Reconciliación de stack (mantener la esencia técnica)

El PRD propone un stack; BoviTrans ya tomó decisiones. Aquí qué **mantenemos** y qué
**adoptamos**:

| Tema | PRD propone | Decisión v2 | Por qué |
|---|---|---|---|
| Esquema DB | `prisma migrate` | **Mantener `init.sql` autoritativo** (ADR-009) | Coherencia con lo entregado; SQL explícito |
| IDs | `cuid` (String) | **Mantener `BigInt` identity** | Ya implementado; consistente |
| Dinero | `Decimal` | **Mantener `NUMERIC`** | Ya implementado; exactitud |
| Auth | NextAuth/Lucia | **Mantener JWT propio** (ya funciona) | Evita reescritura; control total |
| Mapas | Mapbox (API key) | **Mantener Leaflet + OSM + OSRM** | Sin API key, sin costo; ya integrado |
| UI | shadcn/ui | **Tailwind** (adoptar shadcn incremental) | Ya hay base Tailwind; shadcn se puede sumar por componente |
| Tracking en vivo | SSE | **Adoptar SSE** | Encaja perfecto; es nuevo |
| Mutaciones | Server Actions | **Mantener Route Handlers REST** | La rúbrica original valora API REST; coexisten |
| Storage docs/POD | S3 / R2 | **Adoptar** (URLs firmadas) | Necesario para POD y documentos |

> Principio: **adaptar las ideas del PRD a nuestras decisiones**, no reemplazar nuestras
> decisiones por las del PRD.

---

## 4. Mapeo de funcionalidades (reusar / adaptar / diferir / descartar)

Leyenda: ♻️ Reusar (ya está) · 🔧 Adaptar al ganado · ⏳ Diferir · ❌ Descartar.

### 4.1 Core
| Feature PRD | Estado | Nota ganadera |
|---|---|---|
| Auth + roles | ♻️ | Ya: cliente/operador. v2 suma rol `transportista` opcional |
| Marketplace de cargas | 🔧 | El dashboard del operador ya lista solicitudes; v2 agrega vista navegable/filtros avanzados |
| Posteo de carga (wizard) | 🔧 | `nueva-solicitud` evoluciona a wizard multi-paso (carga → ruta → cronograma → confirmación) |
| Reserva "book it now" | ⏳ | Solo si se habilita el rol transportista self-serve |

### 4.2 Enriquecimiento prioritario
| Feature PRD | Estado | Adaptación al dominio ganadero |
|---|---|---|
| **Tracking GPS en vivo (SSE)** | 🔧 P0 | Mapa en vivo del viaje + ETA. Ángulo ganadero: **alerta de tiempo de viaje** (bienestar animal: límites de horas y paradas de descanso/agua) |
| **POD digital** | 🔧 P1 | Confirmación de entrega con **reconciliación de cabezas** (cargadas vs entregadas) + fotos. Desbloquea el pago |
| **Compliance documental** | 🔧 P1 | **Guía de traslado de ganado + certificado SENACSA** (sanidad animal, Paraguay), no Carta Flete de granos |
| **Pago rápido / billetera** | 🔧 P2 | Billetera del operador/transportista, velocidades de cobro. **Integración financiera real es pesada** → mockear primero |
| **Pricing dinámico** | 🔧 P2 | Extiende el cálculo actual: factor por **zafra/estacionalidad**, demanda, tipo de ruta. Hoy ya tenemos `distancia × consumo × precio` |
| **Backhaul / retornos** | ⏳ P2 | Matching de viajes de retorno (camiones jaula vuelven vacíos) |
| **Reviews bidireccionales** | 🔧 P3 | Cliente ↔ operador califican post-entrega; reputación |
| **Reportes / analytics** | 🔧 P3 | **Costo por cabeza**, por km, evolución mensual, top operadores |
| **Notificaciones** | 🔧 P3 | In-app (nueva solicitud, asignación, entrega); push/SMS a futuro |

### 4.3 Específico del PRD que se descarta o difiere
| Feature PRD | Estado | Razón |
|---|---|---|
| DINATRAN (habilitación granos) | ❌ | Es compliance de **granos**; se reemplaza por SENACSA (ganado) |
| SIFEN factura electrónica | ⏳ | Útil pero fuera del núcleo; fase tardía |
| Tigo Money / SPI reales | ⏳ | Integración financiera real; mockear hasta tener partner |
| Cisterna / Volcador / Flatbed (tipos de vehículo) | ❌ | No aplican a ganado; el camión jaula es el relevante (capacidad en cabezas) |

---

## 5. Delta del modelo de datos (conceptual)

Manteniendo `init.sql` autoritativo (ADR-009), `BigInt` y `NUMERIC`. Nuevas entidades:

| Entidad nueva | Para qué (feature) | Campos clave |
|---|---|---|
| `tracking_points` | Tracking GPS (SSE) | `solicitud_id`, `lat`, `lng`, `velocidad`, `registrado_en` |
| `documentos` | Guía de traslado, POD, SENACSA | `solicitud_id`, `tipo`, `url`, `codigo`, `qr_payload` |
| `pagos` | Billetera / payout | `solicitud_id`, `operador_id`, `monto`, `fee_pct`, `neto`, `velocidad`, `metodo`, `estado` |
| `reviews` | Reputación bidireccional | `solicitud_id`, `autor_id`, `objetivo_id`, `rating`, `comentario` |
| `notificaciones` | Avisos in-app | `usuario_id`, `tipo`, `titulo`, `cuerpo`, `data`, `leida` |

Extensiones a entidades existentes:
- `usuarios`: agregar (a futuro) rol `transportista`, `rating_avg`, `rating_count`.
- `camiones`: `tipo` (jaula simple/doble), `permisos` sanitarios, vencimientos.
- `solicitudes`: nuevos estados intermedios (`EN_CARGA`, `ENTREGADA` esperando confirmación),
  `eta`, datos de contacto en origen/destino, ventana de carga.

> El **snapshot de costos** (ADR-003) y el **índice de exclusividad** (ADR-004) se mantienen
> tal cual; las nuevas features se construyen alrededor, no encima.

---

## 6. Roadmap incremental (sobre la base v1)

> **Estado:** las Fases A–D fueron implementadas en gran parte (✅). Lo pendiente queda
> marcado como ⏳.

**Fase A — Operación en vivo** ✅
- ✅ Tracking GPS con SSE + mapa en vivo para el cliente/operador.
- ✅ Notificaciones in-app (campana con no leídas).
- ✅ KPIs + mapa de flota en vivo en el dashboard.

**Fase B — Confianza y compliance ganadero** ✅
- ✅ POD digital con **reconciliación de cabezas** (mermas). ⏳ Fotos a S3/R2.
- ✅ Guía de traslado + certificado SENACSA (registro con código/QR; ⏳ PDF real).
- ✅ Reviews bidireccionales y reputación (rating_avg).

**Fase C — Economía de la plataforma** ✅ (mock financiero)
- ✅ Billetera + payout con 3 velocidades (Net-7 / 48h / 24h). ⏳ SPI/Tigo reales.
- ⏳ Pricing dinámico (reglas por zafra/demanda).
- ⏳ Backhaul / retornos.

**Fase D — Inteligencia** ✅ (analytics base)
- ✅ Reportes (costo por cabeza, ingresos, top clientes, distribución por estado).
- ⏳ Rol `transportista` self-serve y marketplace navegable.

---

## 7. Diferenciadores propios del dominio ganadero (no están en el PRD)

Lo que hace a BoviTrans **único** frente a un freight genérico, y que conviene capitalizar:

1. **Bienestar animal como restricción de primera clase:** límites de horas de viaje,
   densidad por cabeza, paradas de descanso/agua → alertas y validaciones.
2. **Reconciliación de cabezas:** cargadas vs entregadas (mermas, mortandad) en el POD.
3. **Compliance sanitario (SENACSA):** guía de traslado y certificados, equivalente ganadero
   de la Carta Flete.
4. **Capacidad en cabezas y múltiples viajes:** ya resuelto en el núcleo (ADR-002/005); es un
   diferenciador frente a freight por toneladas.

---

## 8. Checklist de "esencia preservada"

- [x] El dominio sigue siendo **ganado vacuno** (no carga genérica).
- [x] El **operador** sigue siendo el orquestador que asigna su flota.
- [x] El **núcleo costo/capacidad** (ADR-002/005) se mantiene y se extiende, no se reemplaza.
- [x] **`init.sql` autoritativo** (ADR-009), `BigInt`, `NUMERIC`, defensa en profundidad.
- [x] **Leaflet/OSM/OSRM** sin API keys; **API REST** (no se abandona por Server Actions).
- [x] Las nuevas features rodean el modelo existente; los ADRs vigentes no se rompen.

---

## 9. Relación con la prueba técnica

Este documento es **prospectivo**. El entregable de la prueba (MVP v1) está completo y
verificado. Esta visión sirve para: (a) demostrar pensamiento de producto senior, (b) mostrar
cómo el diseño actual **habilita** la evolución sin reescritura, y (c) ofrecer un backlog v2
priorizado. Cualquier feature de aquí se puede implementar de forma incremental sobre la base
entregada.
