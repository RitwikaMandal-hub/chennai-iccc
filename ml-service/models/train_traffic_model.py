import sys
import os
import joblib
import pandas as pd

sys.path.append(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

from services.database import get_connection
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
import numpy as np


def load_traffic_data():

    connection = get_connection()

    query = """
        SELECT
            sr.sensor_id,
            sr.reading_value,
            sr.recorded_at
        FROM sensor_readings sr
        JOIN sensors s
            ON sr.sensor_id = s.sensor_id
        WHERE s.sensor_type = 'TRAFFIC'
        ORDER BY sr.recorded_at ASC;
    """

    df = pd.read_sql_query(
        query,
        connection
    )

    connection.close()

    return df


def prepare_dataset(df):

    df["reading_value"] = pd.to_numeric(
        df["reading_value"]
    )

    df["recorded_at"] = pd.to_datetime(
        df["recorded_at"]
    )

    df["lag_1"] = (
        df.groupby("sensor_id")["reading_value"]
        .shift(1)
    )

    df["lag_2"] = (
        df.groupby("sensor_id")["reading_value"]
        .shift(2)
    )

    df["lag_3"] = (
        df.groupby("sensor_id")["reading_value"]
        .shift(3)
    )

    df["rolling_mean"] = (
        df.groupby("sensor_id")["reading_value"]
        .transform(
            lambda x:
            x.shift(1).rolling(3).mean()
        )
    )

    df["target"] = (
        df.groupby("sensor_id")["reading_value"]
        .shift(-1)
    )

    df = df.dropna()

    return df


def train_model():

    print("Loading traffic data...")

    df = load_traffic_data()

    print(
        "Traffic readings:",
        len(df)
    )

    df = prepare_dataset(df)

    print(
        "Training rows:",
        len(df)
    )

    features = [
        "lag_1",
        "lag_2",
        "lag_3",
        "rolling_mean"
    ]

    X = df[features]
    y = df["target"]

    split_index = int(
        len(df) * 0.8
    )

    X_train = X.iloc[:split_index]
    X_test = X.iloc[split_index:]

    y_train = y.iloc[:split_index]
    y_test = y.iloc[split_index:]

    print(
        "Training samples:",
        len(X_train)
    )

    print(
        "Testing samples:",
        len(X_test)
    )

    model = RandomForestRegressor(
        n_estimators=150,
        max_depth=12,
        random_state=42,
        n_jobs=-1
    )

    print("\nTraining Random Forest...")

    model.fit(
        X_train,
        y_train
    )

    predictions = model.predict(
        X_test
    )

    mae = mean_absolute_error(
        y_test,
        predictions
    )

    rmse = np.sqrt(
        mean_squared_error(
            y_test,
            predictions
        )
    )

    print("\nModel evaluation")
    print("------------------------")

    print(
        "MAE:",
        round(mae, 3)
    )

    print(
        "RMSE:",
        round(rmse, 3)
    )

    model_path = os.path.join(
        os.path.dirname(__file__),
        "traffic_model.joblib"
    )

    joblib.dump(
        model,
        model_path
    )

    print(
        "\nModel saved to:"
    )

    print(model_path)


if __name__ == "__main__":

    train_model()