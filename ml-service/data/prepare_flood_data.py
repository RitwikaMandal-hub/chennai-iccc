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


def load_flood_data():

    connection = get_connection()

    query = """
        SELECT
            sr.sensor_id,
            sr.reading_value,
            sr.recorded_at
        FROM sensor_readings sr
        JOIN sensors s
            ON sr.sensor_id = s.sensor_id
        WHERE s.sensor_type IN ('FLOOD_LEVEL', 'WATER_LEVEL')
        ORDER BY sr.sensor_id, sr.recorded_at ASC;
    """

    df = pd.read_sql_query(
        query,
        connection
    )

    connection.close()

    return df


def prepare_dataset():

    df = load_flood_data()

    print(
        "Raw flood/water readings:",
        len(df)
    )

    df["reading_value"] = pd.to_numeric(
        df["reading_value"]
    )

    df["recorded_at"] = pd.to_datetime(
        df["recorded_at"]
    )

    df["previous_level"] = (
        df.groupby("sensor_id")["reading_value"]
        .shift(1)
    )

    df["rate_of_rise"] = (
        df["reading_value"] -
        df["previous_level"]
    )

    df["rolling_mean"] = (
        df.groupby("sensor_id")["reading_value"]
        .transform(
            lambda x:
            x.shift(1).rolling(3).mean()
        )
    )

    df = df.dropna()

    # Simulated flood-risk label
    # 0 = LOW
    # 1 = MODERATE
    # 2 = HIGH

    def calculate_risk(row):

        level = row["reading_value"]
        rise = row["rate_of_rise"]

        if level >= 75 or rise >= 5:
            return 2

        if level >= 60 or rise >= 3:
            return 1

        return 0

    df["risk"] = df.apply(
        calculate_risk,
        axis=1
    )

    return df


if __name__ == "__main__":

    dataset = prepare_dataset()

    print(
        "Prepared flood training rows:",
        len(dataset)
    )

    print("\nRisk distribution:")

    print(
        dataset["risk"]
        .value_counts()
        .sort_index()
    )

    print("\nSample:")

    print(
        dataset[
            [
                "sensor_id",
                "reading_value",
                "rate_of_rise",
                "rolling_mean",
                "risk"
            ]
        ].head(10)
    )