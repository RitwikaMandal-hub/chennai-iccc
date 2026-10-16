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


def prepare_sensor_data():

    connection = get_connection()

    query = """
        SELECT
            sensor_id,
            reading_value,
            unit,
            recorded_at
        FROM sensor_readings
        ORDER BY sensor_id, recorded_at;
    """

    df = pd.read_sql_query(
        query,
        connection
    )

    connection.close()

    print(
        f"Raw sensor readings: {len(df)}"
    )

    df = df.dropna(
        subset=["reading_value"]
    )

    output_path = os.path.join(
        os.path.dirname(__file__),
        "sensor_readings.csv"
    )

    df.to_csv(
        output_path,
        index=False
    )

    print(
        f"Prepared sensor readings: {len(df)}"
    )

    print(
        f"Saved dataset to: {output_path}"
    )

    print("\nSensor types by unit:")

    print(
        df["unit"].value_counts()
    )


if __name__ == "__main__":
    prepare_sensor_data()