-- ============================================
-- CHENNAI AI ICCC
-- Urban Digital Twin Database
-- PostgreSQL + PostGIS
-- ============================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- 1. CITY ZONES
-- ============================================

CREATE TABLE city_zones (
    zone_id SERIAL PRIMARY KEY,
    zone_name VARCHAR(100) NOT NULL,
    zone_type VARCHAR(50),
    risk_level VARCHAR(30) DEFAULT 'NORMAL',
    geom GEOMETRY(POLYGON, 4326)
);

-- ============================================
-- 2. ROADS
-- ============================================

CREATE TABLE roads (
    road_id SERIAL PRIMARY KEY,
    road_name VARCHAR(150) NOT NULL,
    road_type VARCHAR(50),
    speed_limit INTEGER,
    lanes INTEGER,
    traffic_level INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'NORMAL',
    geom GEOMETRY(LINESTRING, 4326)
);

-- ============================================
-- 3. JUNCTIONS
-- ============================================

CREATE TABLE junctions (
    junction_id SERIAL PRIMARY KEY,
    junction_name VARCHAR(150) NOT NULL,
    traffic_level INTEGER DEFAULT 0,
    congestion_level INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'NORMAL',
    geom GEOMETRY(POINT, 4326)
);

-- ============================================
-- 4. SENSORS
-- ============================================

CREATE TABLE sensors (
    sensor_id SERIAL PRIMARY KEY,
    sensor_code VARCHAR(50) UNIQUE NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    location_name VARCHAR(150),
    status VARCHAR(30) DEFAULT 'ACTIVE',
    installation_date DATE,
    geom GEOMETRY(POINT, 4326)
);

-- ============================================
-- 5. TRAFFIC SIGNALS
-- ============================================

CREATE TABLE traffic_signals (
    signal_id SERIAL PRIMARY KEY,
    junction_id INTEGER REFERENCES junctions(junction_id),
    signal_status VARCHAR(30) DEFAULT 'RED',
    green_duration INTEGER DEFAULT 30,
    red_duration INTEGER DEFAULT 30,
    cycle_time INTEGER DEFAULT 60,
    adaptive_mode BOOLEAN DEFAULT FALSE
);

-- ============================================
-- 6. INCIDENTS
-- ============================================

CREATE TABLE incidents (
    incident_id SERIAL PRIMARY KEY,
    incident_type VARCHAR(50) NOT NULL,
    severity VARCHAR(30) NOT NULL,
    description TEXT,
    status VARCHAR(30) DEFAULT 'ACTIVE',
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    geom GEOMETRY(POINT, 4326)
);

-- ============================================
-- 7. SENSOR READINGS
-- ============================================

CREATE TABLE sensor_readings (
    reading_id BIGSERIAL PRIMARY KEY,
    sensor_id INTEGER REFERENCES sensors(sensor_id),
    reading_value NUMERIC(10,2),
    unit VARCHAR(30),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. AI PREDICTIONS
-- ============================================

CREATE TABLE ai_predictions (
    prediction_id BIGSERIAL PRIMARY KEY,
    prediction_type VARCHAR(50) NOT NULL,
    predicted_value NUMERIC(10,2),
    confidence NUMERIC(5,2),
    prediction_horizon INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_location GEOMETRY(POINT, 4326)
);

-- ============================================
-- 9. AI AGENT ACTIONS
-- ============================================

CREATE TABLE agent_actions (
    action_id BIGSERIAL PRIMARY KEY,
    action_type VARCHAR(100) NOT NULL,
    reason TEXT,
    target_entity VARCHAR(100),
    status VARCHAR(30) DEFAULT 'PLANNED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP
);

-- ============================================
-- 10. SIMULATION EVENTS
-- ============================================

CREATE TABLE simulation_events (
    event_id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(30),
    description TEXT,
    status VARCHAR(30) DEFAULT 'PENDING',
    event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location GEOMETRY(POINT, 4326)
);

-- ============================================
-- INDEXES FOR SPATIAL QUERIES
-- ============================================

CREATE INDEX idx_city_zones_geom
ON city_zones USING GIST (geom);

CREATE INDEX idx_roads_geom
ON roads USING GIST (geom);

CREATE INDEX idx_junctions_geom
ON junctions USING GIST (geom);

CREATE INDEX idx_sensors_geom
ON sensors USING GIST (geom);

CREATE INDEX idx_incidents_geom
ON incidents USING GIST (geom);

CREATE INDEX idx_predictions_location
ON ai_predictions USING GIST (reference_location);

CREATE INDEX idx_simulation_events_location
ON simulation_events USING GIST (location);

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

SELECT 'Chennai AI ICCC database schema created successfully!' AS message;
-- ============================================
-- 11. E-WASTE COLLECTION POINTS
-- (used by backend/simulation/eWasteSimulation.js)
-- ============================================

CREATE TABLE IF NOT EXISTS e_waste_points (
    point_id SERIAL PRIMARY KEY,
    point_name VARCHAR(100) NOT NULL,
    location_name VARCHAR(150),
    capacity_kg NUMERIC(10,2) NOT NULL,
    current_load_kg NUMERIC(10,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'NORMAL',
    last_collection TIMESTAMP,
    geom GEOMETRY(POINT, 4326)
);

CREATE TABLE IF NOT EXISTS e_waste_readings (
    reading_id BIGSERIAL PRIMARY KEY,
    point_id INTEGER REFERENCES e_waste_points(point_id),
    current_load_kg NUMERIC(10,2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
