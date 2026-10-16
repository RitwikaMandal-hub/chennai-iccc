from services.database import get_connection
from services.ewaste_predictor import get_latest_ewaste


def get_ewaste_risk(point_id):

    connection = get_connection()

    query = """
        SELECT
            point_id,
            point_name,
            capacity_kg,
            current_load_kg
        FROM e_waste_points
        WHERE point_id = %s;
    """

    cursor = connection.cursor()

    cursor.execute(
        query,
        (point_id,)
    )

    row = cursor.fetchone()

    cursor.close()
    connection.close()

    if row is None:
        return None

    (
        point_id,
        point_name,
        capacity_kg,
        current_load_kg
    ) = row

    prediction = get_latest_ewaste(
        point_id
    )

    if prediction is None:
        return None

    capacity_kg = float(
        capacity_kg
    )

    current_load_kg = float(
        current_load_kg
    )

    predicted_utilization = (
        prediction /
        capacity_kg
    ) * 100

    if predicted_utilization >= 90:
        risk = "CRITICAL"

    elif predicted_utilization >= 75:
        risk = "HIGH"

    elif predicted_utilization >= 50:
        risk = "MODERATE"

    else:
        risk = "LOW"

    return {
        "point_id": point_id,
        "point_name": point_name,
        "current_load_kg": round(
            current_load_kg,
            2
        ),
        "capacity_kg": round(
            capacity_kg,
            2
        ),
        "predicted_next_load_kg": round(
            prediction,
            2
        ),
        "predicted_utilization_percent": round(
            predicted_utilization,
            2
        ),
        "overflow_risk": risk
    }