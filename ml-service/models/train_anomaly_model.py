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

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "anomaly_model.joblib"
)


if not os.path.exists(DATA_PATH):

    print(
        f"Dataset not found: {DATA_PATH}"
    )

    raise SystemExit


df = pd.read_csv(DATA_PATH)


df = df[
    [
        "reading_value"
    ]
].dropna()


print(
    f"Sensor readings: {len(df)}"
)


X = df[
    [
        "reading_value"
    ]
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
    f"Detected training anomalies: {anomalies}"
)


joblib.dump(
    model,
    MODEL_PATH
)


print(
    f"Model saved to: {MODEL_PATH}"
)