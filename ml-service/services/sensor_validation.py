import pandas as pd

from services.database import get_connection
from services.anomaly_predictor import detect_anomaly


def validate_sensor(sensor_id):

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

    if sensor is None:
        connection.close()
        return None

    (
        current_sensor_id,
        sensor_code,
        sensor_type,
        location_name
    ) = sensor

    reading_query = """
        SELECT
            s.sensor_id,
            sr.reading_value,
            sr.unit
        FROM sensors s
        JOIN sensor_readings sr
            ON s.sensor_id = sr.sensor_id
        WHERE s.sensor_type = %s
        AND sr.recorded_at = (
            SELECT MAX(sr2.recorded_at)
            FROM sensor_readings sr2
            WHERE sr2.sensor_id = s.sensor_id
        )
        ORDER BY s.sensor_id;
    """

    readings = pd.read_sql_query(
        reading_query,
        connection,
        params=(sensor_type,)
    )

    connection.close()

    anomaly_result = detect_anomaly(
        sensor_id
    )

    if anomaly_result is None:
        return None

    current_value = float(
        anomaly_result["reading_value"]
    )

    other_readings = readings[
        readings["sensor_id"] != sensor_id
    ]

    if other_readings.empty:

        return {
            **anomaly_result,
            "validation": "INSUFFICIENT_COMPARISON_DATA"
        }

    comparison_values = (
        other_readings["reading_value"]
        .astype(float)
    )

    comparison_mean = float(
        comparison_values.mean()
    )

    difference = abs(
        current_value -
        comparison_mean
    )

    percentage_difference = (
        difference /
        max(abs(comparison_mean), 0.01)
    ) * 100

    if anomaly_result["status"] == "NORMAL":

        validation = "CONSISTENT"

    elif percentage_difference >= 20:

        validation = "LIKELY_SENSOR_ISSUE"

    else:

        validation = "POSSIBLE_REAL_EVENT"

    return {
        **anomaly_result,
        "comparison_sensor_count": int(
            len(other_readings)
        ),
        "comparison_average": round(
            comparison_mean,
            2
        ),
        "difference_from_average": round(
            difference,
            2
        ),
        "percentage_difference": round(
            percentage_difference,
            2
        ),
        "validation": validation
    }