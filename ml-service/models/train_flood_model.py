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
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report


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


def prepare_dataset(df):

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


def train_model():

    print("Loading flood data...")

    df = load_flood_data()

    print(
        "Flood/water readings:",
        len(df)
    )

    df = prepare_dataset(df)

    print(
        "Training rows:",
        len(df)
    )

    features = [
        "reading_value",
        "rate_of_rise",
        "rolling_mean"
    ]

    X = df[features]
    y = df["risk"]

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

    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=10,
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

    accuracy = accuracy_score(
        y_test,
        predictions
    )

    print("\nModel evaluation")
    print("------------------------")

    print(
        "Accuracy:",
        round(accuracy, 4)
    )

    print("\nClassification report:")

    print(
        classification_report(
            y_test,
            predictions,
            target_names=[
                "LOW",
                "MODERATE",
                "HIGH"
            ]
        )
    )

    model_path = os.path.join(
        os.path.dirname(__file__),
        "flood_model.joblib"
    )

    joblib.dump(
        model,
        model_path
    )

    print(
        "Model saved to:"
    )

    print(model_path)


if __name__ == "__main__":

    train_model()