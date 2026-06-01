-- =============================================================================
-- BoviTrans — Esquema + datos semilla (v2: PRD completo)
-- Motor: PostgreSQL 16
-- Se ejecuta automáticamente en el primer arranque del contenedor de DB.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS citext;

-- Tipos enumerados ------------------------------------------------------------
CREATE TYPE rol_usuario AS ENUM ('cliente', 'operador');

CREATE TYPE estado_solicitud AS ENUM (
    'PENDIENTE', 'ASIGNADA', 'EN_TRANSITO', 'COMPLETADA', 'CANCELADA'
);

CREATE TYPE estado_pago    AS ENUM ('PENDIENTE', 'PROCESANDO', 'COMPLETADO', 'FALLIDO');
CREATE TYPE velocidad_pago AS ENUM ('NET_7', 'H48', 'H24');
CREATE TYPE metodo_pago    AS ENUM ('SPI', 'TIGO_MONEY');
CREATE TYPE tipo_documento AS ENUM ('GUIA_TRASLADO', 'POD', 'CERTIFICADO_SENACSA');
CREATE TYPE tipo_notificacion AS ENUM (
    'SOLICITUD_CREADA', 'SOLICITUD_ASIGNADA', 'EN_TRANSITO',
    'ENTREGADA', 'PAGO_LISTO', 'PAGO_COMPLETADO'
);

-- Trigger updated_at ----------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- usuarios (ADR-000) — con reputación (v2 reviews)
-- =============================================================================
CREATE TABLE usuarios (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre        TEXT        NOT NULL,
    email         CITEXT      NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    rol           rol_usuario NOT NULL,
    rating_avg    NUMERIC(3,2) NOT NULL DEFAULT 0,
    rating_count  INT          NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_usuarios_updated BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- camiones (ADR-004, ADR-007)
-- =============================================================================
CREATE TABLE camiones (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patente       TEXT         NOT NULL UNIQUE,
    capacidad     INT          NOT NULL CHECK (capacidad > 0),
    consumo_l_km  NUMERIC(8,4) NOT NULL CHECK (consumo_l_km > 0),
    activo        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_camiones_updated BEFORE UPDATE ON camiones
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- configuracion (singleton) — precio combustible (ADR-006)
-- =============================================================================
CREATE TABLE configuracion (
    id                       INT          PRIMARY KEY CHECK (id = 1),
    precio_combustible_litro NUMERIC(10,2) NOT NULL CHECK (precio_combustible_litro > 0),
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_configuracion_updated BEFORE UPDATE ON configuracion
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- solicitudes (ADR-001/002/003) — + reconciliación de cabezas (v2 POD)
-- =============================================================================
CREATE TABLE solicitudes (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cliente_id          BIGINT       NOT NULL REFERENCES usuarios(id),
    operador_id         BIGINT       REFERENCES usuarios(id),
    camion_id           BIGINT       REFERENCES camiones(id),
    solicitante_nombre  TEXT         NOT NULL,
    cabezas             INT          NOT NULL CHECK (cabezas > 0),

    origen_lat          NUMERIC(9,6) NOT NULL,
    origen_lng          NUMERIC(9,6) NOT NULL,
    origen_label        TEXT,
    destino_lat         NUMERIC(9,6) NOT NULL,
    destino_lng         NUMERIC(9,6) NOT NULL,
    destino_label       TEXT,

    estado              estado_solicitud NOT NULL DEFAULT 'PENDIENTE',

    distancia_km        NUMERIC(10,2),
    consumo_usado       NUMERIC(8,4),
    precio_litro_usado  NUMERIC(10,2),
    costo_por_viaje     NUMERIC(12,2),
    nro_viajes          INT CHECK (nro_viajes IS NULL OR nro_viajes >= 1),
    costo_total         NUMERIC(14,2),
    asignada_at         TIMESTAMPTZ,

    -- POD (v2): reconciliación de cabezas cargadas vs entregadas
    cabezas_entregadas  INT CHECK (cabezas_entregadas IS NULL OR cabezas_entregadas >= 0),
    entregada_at        TIMESTAMPTZ,

    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT chk_origen_distinto_destino
        CHECK (origen_lat <> destino_lat OR origen_lng <> destino_lng),
    CONSTRAINT chk_estado_requiere_camion
        CHECK (estado IN ('PENDIENTE', 'CANCELADA') OR camion_id IS NOT NULL),
    CONSTRAINT chk_estado_requiere_costo
        CHECK (estado IN ('PENDIENTE', 'CANCELADA') OR costo_total IS NOT NULL)
);
CREATE TRIGGER trg_solicitudes_updated BEFORE UPDATE ON solicitudes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX uniq_camion_activo ON solicitudes (camion_id)
    WHERE estado IN ('ASIGNADA', 'EN_TRANSITO') AND camion_id IS NOT NULL;
CREATE INDEX idx_solicitudes_estado  ON solicitudes (estado);
CREATE INDEX idx_solicitudes_cliente ON solicitudes (cliente_id);
CREATE INDEX idx_solicitudes_camion  ON solicitudes (camion_id);

-- =============================================================================
-- tracking_points (v2 — GPS en vivo)
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
-- pagos (v2 — billetera / payout)
-- =============================================================================
CREATE TABLE pagos (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    solicitud_id  BIGINT        NOT NULL UNIQUE REFERENCES solicitudes(id) ON DELETE CASCADE,
    operador_id   BIGINT        NOT NULL REFERENCES usuarios(id),
    monto         NUMERIC(14,2) NOT NULL CHECK (monto >= 0),
    comision_pct  NUMERIC(5,2)  NOT NULL DEFAULT 10,
    fee_pct       NUMERIC(5,2)  NOT NULL DEFAULT 0,
    neto          NUMERIC(14,2) NOT NULL CHECK (neto >= 0),
    velocidad     velocidad_pago NOT NULL,
    metodo        metodo_pago   NOT NULL DEFAULT 'SPI',
    estado        estado_pago   NOT NULL DEFAULT 'PENDIENTE',
    cuenta_last4  TEXT,
    externo_txn   TEXT,
    completado_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_pagos_operador ON pagos (operador_id, estado);

-- =============================================================================
-- documentos (v2 — Guía de traslado, POD, certificado SENACSA)
-- =============================================================================
CREATE TABLE documentos (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    solicitud_id  BIGINT         NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    tipo          tipo_documento NOT NULL,
    url           TEXT,
    codigo        TEXT,
    qr_payload    TEXT,
    metadata      JSONB,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX idx_documentos_solicitud ON documentos (solicitud_id, tipo);

-- =============================================================================
-- reviews (v2 — reputación bidireccional)
-- =============================================================================
CREATE TABLE reviews (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    solicitud_id  BIGINT  NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    autor_id      BIGINT  NOT NULL REFERENCES usuarios(id),
    objetivo_id   BIGINT  NOT NULL REFERENCES usuarios(id),
    rating        INT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comentario    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uniq_review_autor UNIQUE (solicitud_id, autor_id)
);
CREATE INDEX idx_reviews_objetivo ON reviews (objetivo_id);

-- =============================================================================
-- notificaciones (v2)
-- =============================================================================
CREATE TABLE notificaciones (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id    BIGINT            NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo          tipo_notificacion NOT NULL,
    titulo        TEXT              NOT NULL,
    cuerpo        TEXT              NOT NULL,
    data          JSONB,
    leida         BOOLEAN           NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ       NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_usuario ON notificaciones (usuario_id, leida);

-- =============================================================================
-- DATOS SEMILLA
-- Todas las cuentas de ejemplo usan la contraseña:  demo1234
-- =============================================================================
INSERT INTO configuracion (id, precio_combustible_litro) VALUES (1, 1200.00);

-- Usuarios (hash bcrypt real de "demo1234") ----------------------------------
INSERT INTO usuarios (nombre, email, password_hash, rol, rating_avg, rating_count) VALUES
    ('Operador BoviTrans',  'operador@bovitrans.com', '$2a$10$QB.Fp.DNLXZcNzj5n7WT6.DpQcttpexdXJ8LfVHoVkzwiel2v1ftu', 'operador', 4.80, 15),
    ('Estancia La Pradera', 'cliente1@bovitrans.com', '$2a$10$QB.Fp.DNLXZcNzj5n7WT6.DpQcttpexdXJ8LfVHoVkzwiel2v1ftu', 'cliente', 4.50, 6),
    ('Cabaña Don Pedro',    'cliente2@bovitrans.com', '$2a$10$QB.Fp.DNLXZcNzj5n7WT6.DpQcttpexdXJ8LfVHoVkzwiel2v1ftu', 'cliente', 4.20, 4),
    ('Frigorífico del Este','cliente3@bovitrans.com', '$2a$10$QB.Fp.DNLXZcNzj5n7WT6.DpQcttpexdXJ8LfVHoVkzwiel2v1ftu', 'cliente', 5.00, 2);

-- Camiones -------------------------------------------------------------------
INSERT INTO camiones (patente, capacidad, consumo_l_km) VALUES
    ('ABC123', 20, 0.3500),
    ('DEF456', 40, 0.4200),
    ('GHI789', 60, 0.5000),
    ('JKL012', 30, 0.4000),
    ('MNO345', 45, 0.4600),
    ('PQR678', 25, 0.3800);

-- Solicitudes en todos los estados -------------------------------------------
-- 1) PENDIENTE (cabe)
INSERT INTO solicitudes (cliente_id, solicitante_nombre, cabezas,
    origen_lat, origen_lng, origen_label, destino_lat, destino_lng, destino_label, estado)
VALUES (2, 'Estancia La Pradera', 18,
    -25.263740, -57.575926, 'Asunción', -25.516350, -54.616570, 'Ciudad del Este', 'PENDIENTE');

-- 2) PENDIENTE (excede a todos → múltiples viajes)
INSERT INTO solicitudes (cliente_id, solicitante_nombre, cabezas,
    origen_lat, origen_lng, origen_label, destino_lat, destino_lng, destino_label, estado)
VALUES (3, 'Cabaña Don Pedro', 150,
    -27.330833, -55.866944, 'Encarnación', -25.263740, -57.575926, 'Asunción', 'PENDIENTE');

-- 3) ASIGNADA (camión 3, 1 viaje)
INSERT INTO solicitudes (cliente_id, operador_id, camion_id, solicitante_nombre, cabezas,
    origen_lat, origen_lng, origen_label, destino_lat, destino_lng, destino_label, estado,
    distancia_km, consumo_usado, precio_litro_usado, costo_por_viaje, nro_viajes, costo_total, asignada_at)
VALUES (2, 1, 3, 'Estancia La Pradera', 55,
    -25.263740, -57.575926, 'Asunción', -25.516350, -54.616570, 'Ciudad del Este', 'ASIGNADA',
    327.50, 0.5000, 1200.00, 196500.00, 1, 196500.00, now() - interval '2 hours');

-- 4) EN_TRANSITO (camión 2) — con tracking
INSERT INTO solicitudes (cliente_id, operador_id, camion_id, solicitante_nombre, cabezas,
    origen_lat, origen_lng, origen_label, destino_lat, destino_lng, destino_label, estado,
    distancia_km, consumo_usado, precio_litro_usado, costo_por_viaje, nro_viajes, costo_total, asignada_at)
VALUES (4, 1, 2, 'Frigorífico del Este', 40,
    -25.263740, -57.575926, 'Asunción', -27.330833, -55.866944, 'Encarnación', 'EN_TRANSITO',
    370.00, 0.4200, 1200.00, 186480.00, 1, 186480.00, now() - interval '3 hours');

-- 5) COMPLETADA (camión 4) — entregada, con pago/review/docs
INSERT INTO solicitudes (cliente_id, operador_id, camion_id, solicitante_nombre, cabezas,
    origen_lat, origen_lng, origen_label, destino_lat, destino_lng, destino_label, estado,
    distancia_km, consumo_usado, precio_litro_usado, costo_por_viaje, nro_viajes, costo_total,
    asignada_at, cabezas_entregadas, entregada_at)
VALUES (2, 1, 4, 'Estancia La Pradera', 30,
    -25.516350, -54.616570, 'Ciudad del Este', -25.263740, -57.575926, 'Asunción', 'COMPLETADA',
    327.50, 0.4000, 1200.00, 157200.00, 1, 157200.00,
    now() - interval '2 days', 30, now() - interval '1 day');

-- 6) COMPLETADA (camión 1, 2 viajes) — merma de 1 cabeza
INSERT INTO solicitudes (cliente_id, operador_id, camion_id, solicitante_nombre, cabezas,
    origen_lat, origen_lng, origen_label, destino_lat, destino_lng, destino_label, estado,
    distancia_km, consumo_usado, precio_litro_usado, costo_por_viaje, nro_viajes, costo_total,
    asignada_at, cabezas_entregadas, entregada_at)
VALUES (3, 1, 1, 'Cabaña Don Pedro', 22,
    -27.330833, -55.866944, 'Encarnación', -25.516350, -54.616570, 'Ciudad del Este', 'COMPLETADA',
    297.00, 0.3500, 1200.00, 124740.00, 2, 249480.00,
    now() - interval '4 days', 21, now() - interval '3 days');

-- 7) CANCELADA
INSERT INTO solicitudes (cliente_id, solicitante_nombre, cabezas,
    origen_lat, origen_lng, origen_label, destino_lat, destino_lng, destino_label, estado)
VALUES (4, 'Frigorífico del Este', 12,
    -25.263740, -57.575926, 'Asunción', -27.330833, -55.866944, 'Encarnación', 'CANCELADA');

-- 8) ASIGNADA (camión 5)
INSERT INTO solicitudes (cliente_id, operador_id, camion_id, solicitante_nombre, cabezas,
    origen_lat, origen_lng, origen_label, destino_lat, destino_lng, destino_label, estado,
    distancia_km, consumo_usado, precio_litro_usado, costo_por_viaje, nro_viajes, costo_total, asignada_at)
VALUES (3, 1, 5, 'Cabaña Don Pedro', 28,
    -25.263740, -57.575926, 'Asunción', -27.330833, -55.866944, 'Encarnación', 'ASIGNADA',
    370.00, 0.4600, 1200.00, 204240.00, 1, 204240.00, now() - interval '40 minutes');

-- 9) COMPLETADA sin cobrar (queda "disponible para cobrar" en la billetera)
INSERT INTO solicitudes (cliente_id, operador_id, camion_id, solicitante_nombre, cabezas,
    origen_lat, origen_lng, origen_label, destino_lat, destino_lng, destino_label, estado,
    distancia_km, consumo_usado, precio_litro_usado, costo_por_viaje, nro_viajes, costo_total,
    asignada_at, cabezas_entregadas, entregada_at)
VALUES (4, 1, 6, 'Frigorífico del Este', 20,
    -25.263740, -57.575926, 'Asunción', -25.516350, -54.616570, 'Ciudad del Este', 'COMPLETADA',
    327.50, 0.3800, 1200.00, 149340.00, 1, 149340.00,
    now() - interval '1 day', 20, now() - interval '12 hours');

-- Tracking del viaje 4 (EN_TRANSITO): recorrido parcial Asunción → Encarnación
INSERT INTO tracking_points (solicitud_id, lat, lng, velocidad_kmh, registrado_en) VALUES
    (4, -25.263740, -57.575926, 0,  now() - interval '3 hours'),
    (4, -25.650000, -57.150000, 78, now() - interval '2 hours 30 minutes'),
    (4, -26.100000, -56.700000, 82, now() - interval '2 hours'),
    (4, -26.600000, -56.200000, 75, now() - interval '1 hour 20 minutes'),
    (4, -26.950000, -56.000000, 80, now() - interval '40 minutes');

-- Pagos (billetera) ----------------------------------------------------------
-- 5) COMPLETADO (H48, fee 2%)  bruto 157200 - 10% comisión - 2% fee
INSERT INTO pagos (solicitud_id, operador_id, monto, comision_pct, fee_pct, neto,
    velocidad, metodo, estado, cuenta_last4, externo_txn, completado_at)
VALUES (5, 1, 157200.00, 10, 2, 138650.40, 'H48', 'SPI', 'COMPLETADO',
    '4421', 'SPI-7F3A91', now() - interval '20 hours');

-- 6) PROCESANDO (NET_7, sin fee)
INSERT INTO pagos (solicitud_id, operador_id, monto, comision_pct, fee_pct, neto,
    velocidad, metodo, estado, cuenta_last4)
VALUES (6, 1, 249480.00, 10, 0, 224532.00, 'NET_7', 'SPI', 'PROCESANDO', '4421');

-- Documentos -----------------------------------------------------------------
INSERT INTO documentos (solicitud_id, tipo, codigo, qr_payload, metadata) VALUES
    (4, 'GUIA_TRASLADO', 'GT-2026-0004', 'bovitrans:gt:4', '{"vehiculo":"DEF456"}'),
    (4, 'CERTIFICADO_SENACSA', 'SEN-88231', 'bovitrans:sen:4', '{"vigente":true}'),
    (5, 'GUIA_TRASLADO', 'GT-2026-0005', 'bovitrans:gt:5', '{"vehiculo":"JKL012"}'),
    (5, 'POD', 'POD-2026-0005', 'bovitrans:pod:5', '{"cabezas_cargadas":30,"cabezas_entregadas":30}'),
    (6, 'GUIA_TRASLADO', 'GT-2026-0006', 'bovitrans:gt:6', '{"vehiculo":"ABC123"}'),
    (6, 'POD', 'POD-2026-0006', 'bovitrans:pod:6', '{"cabezas_cargadas":22,"cabezas_entregadas":21}'),
    (9, 'GUIA_TRASLADO', 'GT-2026-0009', 'bovitrans:gt:9', '{"vehiculo":"PQR678"}'),
    (9, 'POD', 'POD-2026-0009', 'bovitrans:pod:9', '{"cabezas_cargadas":20,"cabezas_entregadas":20}');

-- Reviews (bidireccional) ----------------------------------------------------
INSERT INTO reviews (solicitud_id, autor_id, objetivo_id, rating, comentario) VALUES
    (5, 2, 1, 5, 'Excelente, el ganado llegó en perfectas condiciones.'),
    (5, 1, 2, 5, 'Carga bien organizada, todo en regla.'),
    (6, 3, 1, 4, 'Buen servicio, hubo una merma menor.');

-- Notificaciones -------------------------------------------------------------
INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, data, leida) VALUES
    (1, 'SOLICITUD_CREADA',  'Nueva solicitud',     'Estancia La Pradera solicitó un traslado de 18 cabezas.', '{"solicitud_id":1}', false),
    (1, 'SOLICITUD_CREADA',  'Nueva solicitud',     'Cabaña Don Pedro solicitó un traslado de 150 cabezas.',   '{"solicitud_id":2}', false),
    (1, 'PAGO_LISTO',        'Pago disponible',     'El viaje #6 está listo para cobrar.',                     '{"solicitud_id":6}', false),
    (4, 'EN_TRANSITO',       'Tu ganado está en viaje', 'El traslado a Encarnación está en tránsito.',          '{"solicitud_id":4}', false),
    (2, 'ENTREGADA',         'Entrega confirmada',  'Tu traslado a Asunción fue entregado (30/30 cabezas).',   '{"solicitud_id":5}', true),
    (3, 'ENTREGADA',         'Entrega confirmada',  'Tu traslado a Ciudad del Este fue entregado (21/22).',    '{"solicitud_id":6}', false);
