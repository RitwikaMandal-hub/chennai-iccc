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


def prepare_ewaste_data():

    connection = get_connection()

    query = """
        SELECT
            point_id,
            current_load_kg,
            recorded_at
        FROM e_waste_readings
        ORDER BY point_id, recorded_at;
    """

    df = pd.read_sql_query(
        query,
        connection
    )

    connection.close()

    print(
        f"Raw e-waste readings: {len(df)}"
    )

    prepared = []

    for point_id, group in df.groupby("point_id"):

        group = group.sort_values(
            "recorded_at"
        ).copy()

        group["previous_load"] = (
            group["current_load_kg"].shift(1)
        )

        group["load_change"] = (
            group["current_load_kg"]
            - group["previous_load"]
        )

        group["rolling_mean"] = (
            group["current_load_kg"]
            .rolling(
                window=3,
                min_periods=3
            )
            .mean()
        )

        group["target"] = (
            group["current_load_kg"].shift(-1)
        )

        group = group.dropna()

        prepared.append(group)

    result = pd.concat(
        prepared,
        ignore_index=True
    )

    output_path = os.path.join(
        os.path.dirname(__file__),
        "ewaste_training.csv"
    )

    result.to_csv(
        output_path,
        index=False
    )

    print(
        f"Prepared training rows: {len(result)}"
    )

    print(
        f"Saved dataset to: {output_path}"
    )

    print("\nColumns:")
    print(result.columns.tolist())


if __name__ == "__main__":
    prepare_ewaste_data()