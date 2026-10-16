from services.database import get_connection


def get_current_city_state():

    connection = get_connection()

    junction_query = """
        SELECT
            junction_id,
            junction_name,
            traffic_level,
            congestion_level,
            status
        FROM junctions
        ORDER BY junction_id;
    """

    sensor_query = """
        SELECT
            s.sensor_id,
            s.sensor_type,
            s.location_name,
            sr.reading_value,
            sr.unit
        FROM sensors s
        JOIN sensor_readings sr
            ON s.sensor_id = sr.sensor_id
        WHERE sr.recorded_at = (
            SELECT MAX(sr2.recorded_at)
            FROM sensor_readings sr2
            WHERE sr2.sensor_id = s.sensor_id
        )
        ORDER BY s.sensor_id;
    """

    cursor = connection.cursor()

    cursor.execute(junction_query)

    junctions = cursor.fetchall()

    cursor.execute(sensor_query)

    sensors = cursor.fetchall()

    cursor.close()
    connection.close()

    junction_data = []

    for row in junctions:

        junction_data.append({
            "junction_id": row[0],
            "junction_name": row[1],
            "traffic_level": float(row[2]),
            "congestion_level": float(row[3]),
            "status": row[4]
        })

    sensor_data = []

    for row in sensors:

        sensor_data.append({
            "sensor_id": row[0],
            "sensor_type": row[1],
            "location_name": row[2],
            "reading_value": float(row[3]),
            "unit": row[4]
        })

    return {
        "junctions": junction_data,
        "sensors": sensor_data
    }


def simulate_traffic_increase(increase_percent):

    state = get_current_city_state()

    affected_junctions = []

    multiplier = (
        1 + increase_percent / 100
    )

    for junction in state["junctions"]:

        simulated_traffic = min(
            100,
            junction["traffic_level"] *
            multiplier
        )

        simulated_congestion = min(
            100,
            junction["congestion_level"] *
            multiplier
        )

        if simulated_congestion >= 75:
            status = "CRITICAL"

        elif simulated_congestion >= 55:
            status = "CONGESTED"

        else:
            status = "NORMAL"

        affected_junctions.append({
            "junction_id":
                junction["junction_id"],

            "junction_name":
                junction["junction_name"],

            "current_traffic":
                round(
                    junction["traffic_level"],
                    2
                ),

            "simulated_traffic":
                round(
                    simulated_traffic,
                    2
                ),

            "current_congestion":
                round(
                    junction["congestion_level"],
                    2
                ),

            "simulated_congestion":
                round(
                    simulated_congestion,
                    2
                ),

            "simulated_status":
                status
        })

    critical_count = sum(
        1
        for junction in affected_junctions
        if junction["simulated_status"] == "CRITICAL"
    )

    congested_count = sum(
        1
        for junction in affected_junctions
        if junction["simulated_status"] == "CONGESTED"
    )

    return {
        "scenario":
            "TRAFFIC_INCREASE",

        "input_change_percent":
            increase_percent,

        "affected_junctions":
            affected_junctions,

        "critical_junctions":
            critical_count,

        "congested_junctions":
            congested_count,

        "message":
            f"Traffic increased by {increase_percent}%. "
            f"{critical_count} junctions reach critical congestion "
            f"and {congested_count} become congested."
    }
def simulate_extreme_rainfall(rainfall_increase_percent):

    state = get_current_city_state()

    flood_sensors = [
        sensor
        for sensor in state["sensors"]
        if sensor["unit"] == "cm"
    ]

    affected_locations = []

    multiplier = (
        1 + rainfall_increase_percent / 100
    )

    for sensor in flood_sensors:

        current_level = sensor["reading_value"]

        simulated_level = min(
            120,
            current_level * multiplier
        )

        if simulated_level >= 90:
            risk = "CRITICAL"

        elif simulated_level >= 75:
            risk = "HIGH"

        elif simulated_level >= 60:
            risk = "MODERATE"

        else:
            risk = "LOW"

        affected_locations.append({
            "sensor_id":
                sensor["sensor_id"],

            "location_name":
                sensor["location_name"],

            "current_water_level_cm":
                round(
                    current_level,
                    2
                ),

            "simulated_water_level_cm":
                round(
                    simulated_level,
                    2
                ),

            "flood_risk":
                risk
        })

    critical_count = sum(
        1
        for location in affected_locations
        if location["flood_risk"] == "CRITICAL"
    )

    high_count = sum(
        1
        for location in affected_locations
        if location["flood_risk"] == "HIGH"
    )

    return {
        "scenario":
            "EXTREME_RAINFALL",

        "input_change_percent":
            rainfall_increase_percent,

        "affected_locations":
            affected_locations,

        "critical_locations":
            critical_count,

        "high_risk_locations":
            high_count,

        "message":
            f"Rainfall impact increased by "
            f"{rainfall_increase_percent}%. "
            f"{critical_count} locations reach critical "
            f"flood risk and {high_count} reach high risk."
    }
def simulate_road_closure(road_id):

    connection = get_connection()

    road_query = """
        SELECT
            road_id,
            road_name,
            road_type,
            traffic_level
        FROM roads
        WHERE road_id = %s;
    """

    junction_query = """
        SELECT
            junction_id,
            junction_name,
            traffic_level,
            congestion_level
        FROM junctions
        ORDER BY junction_id;
    """

    cursor = connection.cursor()

    cursor.execute(
        road_query,
        (road_id,)
    )

    road = cursor.fetchone()

    cursor.execute(junction_query)

    junctions = cursor.fetchall()

    cursor.close()
    connection.close()

    if road is None:
        return None

    (
        selected_road_id,
        road_name,
        road_type,
        traffic_level
    ) = road

    affected_junctions = []

    for junction in junctions:

        current_congestion = float(
            junction[3]
        )

        simulated_congestion = min(
            100,
            current_congestion + 20
        )

        current_traffic = float(
            junction[2]
        )

        simulated_traffic = min(
            100,
            current_traffic + 15
        )

        if simulated_congestion >= 75:
            status = "CRITICAL"

        elif simulated_congestion >= 55:
            status = "CONGESTED"

        else:
            status = "NORMAL"

        affected_junctions.append({
            "junction_id":
                junction[0],

            "junction_name":
                junction[1],

            "current_traffic":
                round(
                    current_traffic,
                    2
                ),

            "simulated_traffic":
                round(
                    simulated_traffic,
                    2
                ),

            "current_congestion":
                round(
                    current_congestion,
                    2
                ),

            "simulated_congestion":
                round(
                    simulated_congestion,
                    2
                ),

            "simulated_status":
                status
        })

    critical_count = sum(
        1
        for junction in affected_junctions
        if junction["simulated_status"] == "CRITICAL"
    )

    congested_count = sum(
        1
        for junction in affected_junctions
        if junction["simulated_status"] == "CONGESTED"
    )

    return {
        "scenario":
            "ROAD_CLOSURE",

        "road_id":
            selected_road_id,

        "road_name":
            road_name,

        "road_type":
            road_type,

        "original_traffic_level":
            float(traffic_level),

        "simulated_condition":
            "ROAD CLOSED",

        "affected_junctions":
            affected_junctions,

        "critical_junctions":
            critical_count,

        "congested_junctions":
            congested_count,

        "message":
            f"Road closure simulated on "
            f"{road_name}. "
            f"{critical_count} junctions reach critical "
            f"congestion and {congested_count} become congested."
    }
def simulate_sensor_failure(sensor_id, failure_value):

    connection = get_connection()

    sensor_query = """
        SELECT
            sensor_id,
            sensor_code,
            sensor_type,
            location_name
        FROM sensors
        WHERE sensor_id = %s;
    """

    cursor = connection.cursor()

    cursor.execute(
        sensor_query,
        (sensor_id,)
    )

    sensor = cursor.fetchone()

    cursor.close()
    connection.close()

    if sensor is None:
        return None

    (
        current_sensor_id,
        sensor_code,
        sensor_type,
        location_name
    ) = sensor

    validation_result = None

    try:

        from services.sensor_validation import (
            validate_sensor
        )

        validation_result = validate_sensor(
            sensor_id
        )

    except Exception as error:

        print(
            "[SENSOR VALIDATION ERROR]",
            error
        )

    comparison_average = None

    comparison_count = 0

    if validation_result:

        comparison_average = (
            validation_result.get(
                "comparison_average"
            )
        )

        comparison_count = (
            validation_result.get(
                "comparison_sensor_count",
                0
            )
        )

    if comparison_average is not None:

        difference = abs(
            float(failure_value) -
            float(comparison_average)
        )

        percentage_difference = (
            difference /
            max(
                abs(float(comparison_average)),
                0.01
            )
        ) * 100

    else:

        difference = 0

        percentage_difference = 0

    if percentage_difference >= 30:

        validation = "LIKELY_SENSOR_FAILURE"

    else:

        validation = "POSSIBLE_REAL_EVENT"

    return {
        "scenario":
            "SENSOR_FAILURE",

        "sensor_id":
            current_sensor_id,

        "sensor_code":
            sensor_code,

        "sensor_type":
            sensor_type,

        "location_name":
            location_name,

        "simulated_failure_value":
            round(
                float(failure_value),
                2
            ),

        "comparison_sensor_count":
            comparison_count,

        "comparison_average":
            (
                round(
                    float(comparison_average),
                    2
                )
                if comparison_average is not None
                else None
            ),

        "difference_from_average":
            round(
                difference,
                2
            ),

        "percentage_difference":
            round(
                percentage_difference,
                2
            ),

        "validation":
            validation,

        "message":
            (
                f"Sensor failure simulated for "
                f"{location_name}. "
                f"The simulated reading differs from "
                f"the comparison average by "
                f"{percentage_difference:.1f}%."
            )
    }