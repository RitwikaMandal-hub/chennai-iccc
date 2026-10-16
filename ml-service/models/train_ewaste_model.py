import os
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib


DATA_PATH = os.path.join(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    ),
    "data",
    "ewaste_training.csv"
)

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "ewaste_model.joblib"
)


df = pd.read_csv(DATA_PATH)

features = [
    "current_load_kg",
    "previous_load",
    "load_change",
    "rolling_mean"
]

target = "target"

X = df[features]
y = df[target]

split_index = int(
    len(df) * 0.8
)

X_train = X.iloc[:split_index]
X_test = X.iloc[split_index:]

y_train = y.iloc[:split_index]
y_test = y.iloc[split_index:]


model = RandomForestRegressor(
    n_estimators=150,
    max_depth=10,
    random_state=42,
    n_jobs=-1
)

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

rmse = mean_squared_error(
    y_test,
    predictions
) ** 0.5


print(
    f"E-Waste readings: {len(df)}"
)

print(
    f"Training samples: {len(X_train)}"
)

print(
    f"Testing samples: {len(X_test)}"
)

print(
    f"MAE: {mae:.3f} kg"
)

print(
    f"RMSE: {rmse:.3f} kg"
)


joblib.dump(
    model,
    MODEL_PATH
)

print(
    f"Model saved to: {MODEL_PATH}"
)