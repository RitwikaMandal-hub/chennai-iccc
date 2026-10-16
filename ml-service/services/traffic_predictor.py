import os
import joblib
import pandas as pd

from services.database import get_connection


MODEL_PATH = os.path.join(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    ),
    "models",
    "traffic_model.joblib"
)


model = joblib.load(MODEL_PATH)


def get_latest_traffic(sensor_id):

    connection = get_connection()

    query = """
        SELECT reading_value
        FROM sensor_readings
        WHERE sensor_id = %s
        ORDER BY recorded_at DESC
        LIMIT 3;
    """

    df = pd.read_sql_query(
        query,
        connection,
        params=(sensor_id,)
    )

    connection.close()

    if len(df) < 3:
        return None

    values = df["reading_value"].astype(float).tolist()

    lag_1 = values[0]
    lag_2 = values[1]
    lag_3 = values[2]

    rolling_mean = (
        lag_1 +
        lag_2 +
        lag_3
    ) / 3

    features = pd.DataFrame(
        [[
            lag_1,
            lag_2,
            lag_3,
            rolling_mean
        ]],
        columns=[
            "lag_1",
            "lag_2",
            "lag_3",
            "rolling_mean"
        ]
    )

    prediction = model.predict(
        features
    )[0]

    return round(
        float(prediction),
        2
    )