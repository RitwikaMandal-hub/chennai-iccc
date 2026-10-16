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
    "ewaste_model.joblib"
)


model = joblib.load(MODEL_PATH)


def get_latest_ewaste(point_id):

    connection = get_connection()

    query = """
        SELECT
            current_load_kg,
            recorded_at
        FROM e_waste_readings
        WHERE point_id = %s
        ORDER BY recorded_at DESC
        LIMIT 3;
    """

    df = pd.read_sql_query(
        query,
        connection,
        params=(point_id,)
    )

    connection.close()

    if len(df) < 3:
        return None

    df = df.sort_values(
        "recorded_at"
    )

    current_load = float(
        df.iloc[-1]["current_load_kg"]
    )

    previous_load = float(
        df.iloc[-2]["current_load_kg"]
    )

    load_change = (
        current_load -
        previous_load
    )

    rolling_mean = float(
        df["current_load_kg"].mean()
    )

    features = pd.DataFrame(
        [[
            current_load,
            previous_load,
            load_change,
            rolling_mean
        ]],
        columns=[
            "current_load_kg",
            "previous_load",
            "load_change",
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