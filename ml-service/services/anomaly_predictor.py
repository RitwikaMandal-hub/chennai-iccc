import os

import joblib
import pandas as pd

from services.database import get_connection


MODEL_DIR = os.path.join(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    ),
    "models",
    "anomaly_models"
)


MODELS = {
    "traffic_index": joblib.load(
        os.path.join(
            MODEL_DIR,
            "traffic_index_model.joblib"
        )
    ),

    "cm": joblib.load(
        os.path.join(
            MODEL_DIR,
            "cm_model.joblib"
        )
    ),

    "AQI": joblib.load(
        os.path.join(
            MODEL_DIR,
            "AQI_model.joblib"
        )
    ),

    "C": joblib.load(
        os.path.join(
            MODEL_DIR,
            "C_model.joblib"
        )
    )
}


def detect_anomaly(sensor_id):

    connection = get_connection()

    query = """
        SELECT
            s.sensor_id,
            s.sensor_code,
            s.sensor_type,
            s.location_name,
            sr.reading_value,
            sr.unit,
            sr.recorded_at
        FROM sensors s
        JOIN sensor_readings sr
            ON s.sensor_id = sr.sensor_id
        WHERE s.sensor_id = %s
        ORDER BY sr.recorded_at DESC
        LIMIT 1;
    """

    df = pd.read_sql_query(
        query,
        connection,
        params=(sensor_id,)
    )

    connection.close()

    if df.empty:
        return None

    row = df.iloc[0]

    unit = row["unit"]

    if unit not in MODELS:
        return None

    reading_value = float(
        row["reading_value"]
    )

    model = MODELS[unit]

    prediction = model.predict(
        pd.DataFrame(
            [[reading_value]],
            columns=["reading_value"]
        )
    )[0]

    if prediction == -1:
        status = "ANOMALY"
    else:
        status = "NORMAL"

    return {
        "sensor_id": int(
            row["sensor_id"]
        ),
        "sensor_code": row["sensor_code"],
        "sensor_type": row["sensor_type"],
        "location_name": row["location_name"],
        "reading_value": round(
            reading_value,
            2
        ),
        "unit": unit,
        "status": status,
        "recorded_at": str(
            row["recorded_at"]
        )
    }