-- =============================================================================
-- BoviTrans MVP — Esquema inicial + datos semilla
-- Motor: PostgreSQL 16
-- Deriva de: docs/03-modelo-de-datos.md y los ADRs en docs/02-decisiones.md
--
-- Este archivo se ejecuta automáticamente en el primer arranque del contenedor
-- de base de datos (montado en /docker-entrypoint-initdb.d).
-- =============================================================================

-- Extensiones -----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS citext;  -- email case-insensitive (US-1.1)

-- Tipos enumerados (ADR-001, ADR-000) -----------------------------------------
CREATE TYPE rol_usuario AS ENUM ('cliente', 'operador');

CREATE TYPE estado_solicitud AS ENUM (
    'PENDIENTE',
    'ASIGNADA',
    'EN_TRANSITO',
    'COMPLETADA',
    'CANCELADA'
);

-- Función de trigger para mantener updated_at ---------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Tabla: usuarios (ADR-000, ADR-008)
-- =============================================================================
CREATE TABLE usuarios (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre        TEXT        NOT NULL,
    email         CITEXT      NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    rol           rol_usuario NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_usuarios_updated
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Tabla: camiones (dominio, ADR-004, ADR-007, ADR-008)
-- =============================================================================
CREATE TABLE camiones (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patente       TEXT         NOT NULL UNIQUE,                 -- inmutable (ADR-007)
    capacidad     INT          NOT NULL CHECK (capacidad > 0),  -- cabezas/viaje
    consumo_l_km  NUMERIC(8,4) NOT NULL CHECK (consumo_l_km > 0),
    activo        BOOLEAN      NOT NULL DEFAULT TRUE,           -- baja lógica (US-2.4)
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_camiones_updated
    BEFORE UPDATE ON camiones
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Tabla: configuracion (singleton) — precio del combustible (ADR-006)
-- =============================================================================
CREATE TABLE configuracion (
    id                       INT          PRIMARY KEY CHECK (id = 1),
    precio_combustible_litro NUMERIC(10,2) NOT NULL CHECK (precio_combustible_litro > 0),
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_configuracion_updated
    BEFORE UPDATE ON configuracion
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Tabla: solicitudes (ADR-001, ADR-002, ADR-003, ADR-008)
-- =============================================================================
CREATE TABLE solicitudes (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cliente_id          BIGINT       NOT NULL REFERENCES usuarios(id),
    operador_id         BIGINT       REFERENCES usuarios(id),
    camion_id           BIGINT       REFERENCES camiones(id),
    solicitante_nombre  TEXT         NOT NULL,
    cabezas             INT          NOT NULL CHECK (cabezas > 0),

    -- Geografía (origen / destino)
    origen_lat          NUMERIC(9,6) NOT NULL,
    origen_lng          NUMERIC(9,6) NOT NULL,
    origen_label        TEXT,
    destino_lat         NUMERIC(9,6) NOT NULL,
    destino_lng         NUMERIC(9,6) NOT NULL,
    destino_label       TEXT,

    estado              estado_solicitud NOT NULL DEFAULT 'PENDIENTE',

    -- Snapshot de cálculos al confirmar la asignación (ADR-003)
    distancia_km        NUMERIC(10,2),
    consumo_usado       NUMERIC(8,4),
    precio_litro_usado  NUMERIC(10,2),
    costo_por_viaje     NUMERIC(12,2),
    nro_viajes          INT CHECK (nro_viajes IS NULL OR nro_viajes >= 1),
    costo_total         NUMERIC(14,2),
    asignada_at         TIMESTAMPTZ,

    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Integridad de negocio (ADR-008) ----------------------------------------
    -- Origen y destino deben ser puntos distintos
    CONSTRAINT chk_origen_distinto_destino
        CHECK (origen_lat <> destino_lat OR origen_lng <> destino_lng),
    -- Toda solicitud no pendiente/cancelada debe tener camión asignado
    CONSTRAINT chk_estado_requiere_camion
        CHECK (estado IN ('PENDIENTE', 'CANCELADA') OR camion_id IS NOT NULL),
    -- Estados con asignación efectiva deben tener snapshot de costo
    CONSTRAINT chk_estado_requiere_costo
        CHECK (estado IN ('PENDIENTE', 'CANCELADA') OR costo_total IS NOT NULL)
);

CREATE TRIGGER trg_solicitudes_updated
    BEFORE UPDATE ON solicitudes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Índices (docs/03 §4)
-- =============================================================================
-- Exclusividad: un camión no puede estar en dos solicitudes activas (ADR-004)
CREATE UNIQUE INDEX uniq_camion_activo
    ON solicitudes (camion_id)
    WHERE estado IN ('ASIGNADA', 'EN_TRANSITO') AND camion_id IS NOT NULL;

CREATE INDEX idx_solicitudes_estado  ON solicitudes (estado);
CREATE INDEX idx_solicitudes_cliente ON solicitudes (cliente_id);
CREATE INDEX idx_solicitudes_camion  ON solicitudes (camion_id);

-- =============================================================================
-- Tabla: tracking_points (v2 — tracking GPS en vivo, docs/05)
-- Puntos inmutables emitidos durante un viaje EN_TRANSITO.
-- =============================================================================
CREATE TABLE tracking_points (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    solicitud_id  BIGINT       NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    lat           NUMERIC(9,6) NOT NULL,
    lng           NUMERIC(9,6) NOT NULL,
    velocidad_kmh NUMERIC(6,2),
    registrado_en TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_tracking_solicitud ON tracking_points (solicitud_id, registrado_en);

-- =============================================================================
-- DATOS SEMILLA (docs/03 §7)
-- =============================================================================
-- NOTA: los password_hash de ejemplo corresponden al hash bcrypt de la
-- contraseña "password123". En Fase 3, el endpoint de registro genera los
-- hashes reales; estos valores son solo para poder loguearse en desarrollo.
-- Si el algoritmo/cost difiere, regenerar con la utilidad de hashing de la app.

-- Configuración inicial (precio combustible) ---------------------------------
INSERT INTO configuracion (id, precio_combustible_litro)
VALUES (1, 1200.00);

-- Usuarios -------------------------------------------------------------------
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
    ('Operador BoviTrans', 'operador@bovitrans.com',
     '$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTUV', 'operador'),
    ('Estancia La Pradera', 'cliente1@bovitrans.com',
     '$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTUV', 'cliente'),
    ('Cabaña Don Pedro', 'cliente2@bovitrans.com',
     '$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTUV', 'cliente');

-- Camiones (capacidades y consumos variados para probar el caso "no cabe") ---
INSERT INTO camiones (patente, capacidad, consumo_l_km) VALUES
    ('ABC123', 20, 0.3500),   -- chico
    ('DEF456', 40, 0.4200),   -- mediano
    ('GHI789', 60, 0.5000),   -- grande
    ('JKL012', 30, 0.4000);   -- mediano

-- Solicitudes de ejemplo en distintos estados --------------------------------
-- (coordenadas aproximadas de Paraguay: Asunción, Ciudad del Este, Encarnación)

-- 1) PENDIENTE, cabe en un camión
INSERT INTO solicitudes
    (cliente_id, solicitante_nombre, cabezas,
     origen_lat, origen_lng, origen_label,
     destino_lat, destino_lng, destino_label, estado)
VALUES
    (2, 'Estancia La Pradera', 18,
     -25.263740, -57.575926, 'Asunción',
     -25.516350, -54.616570, 'Ciudad del Este', 'PENDIENTE');

-- 2) PENDIENTE, excede a TODOS los camiones (demuestra sugerencia de N viajes, ADR-005)
INSERT INTO solicitudes
    (cliente_id, solicitante_nombre, cabezas,
     origen_lat, origen_lng, origen_label,
     destino_lat, destino_lng, destino_label, estado)
VALUES
    (3, 'Cabaña Don Pedro', 150,
     -27.330833, -55.866944, 'Encarnación',
     -25.263740, -57.575926, 'Asunción', 'PENDIENTE');

-- 3) ASIGNADA con snapshot calculado (camión grande, 1 viaje)
--    distancia 327.50 km * consumo 0.50 * precio 1200 = 196500.00 por viaje
INSERT INTO solicitudes
    (cliente_id, operador_id, camion_id, solicitante_nombre, cabezas,
     origen_lat, origen_lng, origen_label,
     destino_lat, destino_lng, destino_label, estado,
     distancia_km, consumo_usado, precio_litro_usado,
     costo_por_viaje, nro_viajes, costo_total, asignada_at)
VALUES
    (2, 1, 3, 'Estancia La Pradera', 55,
     -25.263740, -57.575926, 'Asunción',
     -25.516350, -54.616570, 'Ciudad del Este', 'ASIGNADA',
     327.50, 0.5000, 1200.00,
     196500.00, 1, 196500.00, now());
