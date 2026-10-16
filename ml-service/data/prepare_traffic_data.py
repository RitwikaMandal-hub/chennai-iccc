import sys
import os
import pandas as pd

sys.path.append(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

from services.database import get_connection


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


def prepare_dataset():

    df = load_traffic_data()

    print("Raw traffic readings:", len(df))

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
            lambda x: x.shift(1).rolling(3).mean()
        )
    )

    df["target"] = (
        df.groupby("sensor_id")["reading_value"]
        .shift(-1)
    )

    df = df.dropna()

    return df


if __name__ == "__main__":

    dataset = prepare_dataset()

    print(
        "Prepared training rows:",
        len(dataset)
    )

    print("\nColumns:")
    print(dataset.columns.tolist())

    print("\nSample:")
    print(
        dataset[
            [
                "sensor_id",
                "lag_1",
                "lag_2",
                "lag_3",
                "rolling_mean",
                "target"
            ]
        ].head(10)
    )