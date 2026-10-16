import os

import pandas as pd
import joblib

from sklearn.ensemble import IsolationForest


DATA_PATH = os.path.join(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    ),
    "data",
    "sensor_readings.csv"
)

MODEL_DIR = os.path.join(
    os.path.dirname(__file__),
    "anomaly_models"
)


os.makedirs(
    MODEL_DIR,
    exist_ok=True
)


df = pd.read_csv(
    DATA_PATH
)


sensor_units = [
    "traffic_index",
    "cm",
    "AQI",
    "C"
]


for unit in sensor_units:

    unit_data = df[
        df["unit"] == unit
    ].copy()

    unit_data = unit_data[
        ["reading_value"]
    ].dropna()

    print(
        f"\nTraining anomaly model: {unit}"
    )

    print(
        f"Readings: {len(unit_data)}"
    )

    X = unit_data[
        ["reading_value"]
    ]

    model = IsolationForest(
        n_estimators=150,
        contamination=0.05,
        random_state=42
    )

    model.fit(X)

    predictions = model.predict(X)

    anomalies = (
        predictions == -1
    ).sum()

    print(
        f"Detected anomalies: {anomalies}"
    )

    model_path = os.path.join(
        MODEL_DIR,
        f"{unit}_model.joblib"
    )

    joblib.dump(
        model,
        model_path
    )

    print(
        f"Saved: {model_path}"
    )


print(
    "\nAll unit-specific anomaly models trained successfully."
)