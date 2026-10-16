-- ============================================
-- CHENNAI AI ICCC
-- Initial Chennai Digital Twin Seed Data
-- ============================================

-- ============================================
-- CITY ZONES
-- ============================================

INSERT INTO city_zones
(zone_name, zone_type, risk_level, geom)
VALUES
('Central Chennai', 'Urban Core', 'NORMAL',
 ST_GeomFromText('POLYGON((80.25 13.09, 80.29 13.09, 80.29 13.06, 80.25 13.06, 80.25 13.09))', 4326)),

('Adyar', 'Mobility Zone', 'MODERATE',
 ST_GeomFromText('POLYGON((80.24 13.02, 80.28 13.02, 80.28 12.99, 80.24 12.99, 80.24 13.02))', 4326)),

('Velachery', 'Flood Zone', 'HIGH',
 ST_GeomFromText('POLYGON((80.20 13.00, 80.24 13.00, 80.24 12.96, 80.20 12.96, 80.20 13.00))', 4326)),

('Anna Nagar', 'Residential Zone', 'NORMAL',
 ST_GeomFromText('POLYGON((80.19 13.10, 80.23 13.10, 80.23 13.07, 80.19 13.07, 80.19 13.10))', 4326)),

('T. Nagar', 'Commercial Zone', 'HIGH',
 ST_GeomFromText('POLYGON((80.22 13.06, 80.25 13.06, 80.25 13.03, 80.22 13.03, 80.22 13.06))', 4326));


-- ============================================
-- ROADS
-- ============================================

INSERT INTO roads
(road_name, road_type, speed_limit, lanes, traffic_level, status, geom)
VALUES
('Anna Salai', 'Arterial', 50, 4, 72, 'NORMAL',
 ST_GeomFromText('LINESTRING(80.255 13.055, 80.270 13.070, 80.285 13.085)', 4326)),

('OMR', 'Arterial', 60, 6, 58, 'NORMAL',
 ST_GeomFromText('LINESTRING(80.225 12.965, 80.235 12.985, 80.250 13.010)', 4326)),

('GST Road', 'Highway', 70, 6, 65, 'NORMAL',
 ST_GeomFromText('LINESTRING(80.170 12.950, 80.190 12.980, 80.215 13.020)', 4326)),

('Poonamallee High Road', 'Arterial', 50, 4, 81, 'CONGESTED',
 ST_GeomFromText('LINESTRING(80.180 13.085, 80.205 13.095, 80.230 13.090)', 4326)),

('Sardar Patel Road', 'Arterial', 50, 4, 69, 'NORMAL',
 ST_GeomFromText('LINESTRING(80.245 13.025, 80.255 13.045, 80.265 13.065)', 4326));


-- ============================================
-- JUNCTIONS
-- ============================================

INSERT INTO junctions
(junction_name, traffic_level, congestion_level, status, geom)
VALUES
('Guindy Junction', 78, 72, 'CONGESTED',
 ST_SetSRID(ST_MakePoint(80.2209, 13.0067), 4326)),

('Teynampet Junction', 74, 68, 'CONGESTED',
 ST_SetSRID(ST_MakePoint(80.2496, 13.0418), 4326)),

('Adyar Signal', 61, 48, 'NORMAL',
 ST_SetSRID(ST_MakePoint(80.2572, 13.0067), 4326)),

('Anna Nagar Roundabout', 52, 35, 'NORMAL',
 ST_SetSRID(ST_MakePoint(80.2100, 13.0850), 4326)),

('Velachery Junction', 83, 76, 'CONGESTED',
 ST_SetSRID(ST_MakePoint(80.2180, 12.9815), 4326));


-- ============================================
-- SENSORS
-- ============================================

INSERT INTO sensors
(sensor_code, sensor_type, location_name, status, installation_date, geom)
VALUES
('TRF-GND-001', 'TRAFFIC', 'Guindy Junction', 'ACTIVE',
 '2026-01-15',
 ST_SetSRID(ST_MakePoint(80.2209, 13.0067), 4326)),

('FLD-VEL-001', 'FLOOD_LEVEL', 'Velachery', 'ACTIVE',
 '2026-01-20',
 ST_SetSRID(ST_MakePoint(80.2180, 12.9815), 4326)),

('AIR-TNG-001', 'AIR_QUALITY', 'T. Nagar', 'ACTIVE',
 '2026-02-01',
 ST_SetSRID(ST_MakePoint(80.2341, 13.0418), 4326)),

('TRF-ADY-001', 'TRAFFIC', 'Adyar', 'ACTIVE',
 '2026-02-05',
 ST_SetSRID(ST_MakePoint(80.2572, 13.0067), 4326)),

('ENV-ANN-001', 'ENVIRONMENT', 'Anna Nagar', 'ACTIVE',
 '2026-02-10',
 ST_SetSRID(ST_MakePoint(80.2100, 13.0850), 4326)),

('WSM-VEL-001', 'WATER_LEVEL', 'Velachery', 'ACTIVE',
 '2026-02-15',
 ST_SetSRID(ST_MakePoint(80.2180, 12.9815), 4326));


-- ============================================
-- TRAFFIC SIGNALS
-- ============================================

INSERT INTO traffic_signals
(junction_id, signal_status, green_duration, red_duration,
 cycle_time, adaptive_mode)
VALUES
(1, 'GREEN', 45, 35, 80, TRUE),
(2, 'RED', 30, 45, 75, TRUE),
(3, 'GREEN', 40, 30, 70, FALSE),
(4, 'GREEN', 35, 25, 60, FALSE),
(5, 'RED', 25, 50, 75, TRUE);


-- ============================================
-- INCIDENTS
-- ============================================

INSERT INTO incidents
(incident_type, severity, description, status, geom)
VALUES
('ACCIDENT', 'HIGH',
 'Two-vehicle collision near Guindy Junction',
 'ACTIVE',
 ST_SetSRID(ST_MakePoint(80.2209, 13.0067), 4326)),

('FLOOD_ALERT', 'MEDIUM',
 'Rising water level detected in Velachery',
 'ACTIVE',
 ST_SetSRID(ST_MakePoint(80.2180, 12.9815), 4326)),

('TRAFFIC_CONGESTION', 'MEDIUM',
 'Heavy traffic detected on Anna Salai',
 'ACTIVE',
 ST_SetSRID(ST_MakePoint(80.2550, 13.0550), 4326));


-- ============================================
-- SENSOR READINGS
-- ============================================

INSERT INTO sensor_readings
(sensor_id, reading_value, unit)
VALUES
(1, 78, 'traffic_index'),
(2, 62, 'cm'),
(3, 86, 'AQI'),
(4, 61, 'traffic_index'),
(5, 31, 'C'),
(6, 48, 'cm');


-- ============================================
-- AI PREDICTIONS
-- ============================================

INSERT INTO ai_predictions
(prediction_type, predicted_value, confidence,
 prediction_horizon, reference_location)
VALUES
('TRAFFIC_CONGESTION', 89, 91.50, 30,
 ST_SetSRID(ST_MakePoint(80.2209, 13.0067), 4326)),

('FLOOD_RISK', 76, 87.20, 60,
 ST_SetSRID(ST_MakePoint(80.2180, 12.9815), 4326));


-- ============================================
-- INITIAL SIMULATION EVENTS
-- ============================================

INSERT INTO simulation_events
(event_type, severity, description, status, location)
VALUES
('ACCIDENT_DETECTED', 'HIGH',
 'Simulated accident detected near Guindy Junction',
 'PENDING',
 ST_SetSRID(ST_MakePoint(80.2209, 13.0067), 4326)),

('FLOOD_RISK_RISING', 'MEDIUM',
 'Simulated water level increase detected in Velachery',
 'PENDING',
 ST_SetSRID(ST_MakePoint(80.2180, 12.9815), 4326));


SELECT 'Chennai AI ICCC seed data inserted successfully!' AS message;
-- ============================================
-- E-WASTE COLLECTION POINTS
-- ============================================

INSERT INTO e_waste_points
(point_name, location_name, capacity_kg, current_load_kg, status, last_collection, geom)
VALUES
('EW-ANN-01', 'Anna Nagar', 500, 210, 'NORMAL', NOW() - INTERVAL '5 hours',
 ST_SetSRID(ST_MakePoint(80.2085, 13.0878), 4326)),
('EW-TNG-01', 'T. Nagar', 650, 455, 'FILLING', NOW() - INTERVAL '5 hours',
 ST_SetSRID(ST_MakePoint(80.2338, 13.0405), 4326)),
('EW-ADY-01', 'Adyar', 400, 150, 'NORMAL', NOW() - INTERVAL '5 hours',
 ST_SetSRID(ST_MakePoint(80.2565, 13.0012), 4326)),
('EW-VEL-01', 'Velachery', 450, 370, 'HIGH', NOW() - INTERVAL '5 hours',
 ST_SetSRID(ST_MakePoint(80.2205, 12.9788), 4326)),
('EW-GND-01', 'Guindy Industrial Estate', 800, 520, 'FILLING', NOW() - INTERVAL '5 hours',
 ST_SetSRID(ST_MakePoint(80.2125, 13.0115), 4326));
