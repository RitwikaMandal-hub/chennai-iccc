from fastapi import FastAPI, HTTPException

from services.traffic_predictor import (
    get_latest_traffic
)

from services.ewaste_predictor import (
    get_latest_ewaste
)

from services.ewaste_risk import (
    get_ewaste_risk
)

from services.anomaly_predictor import (
    detect_anomaly
)

from services.sensor_validation import (
    validate_sensor
)

from services.scenario_engine import (
    simulate_traffic_increase,
    simulate_extreme_rainfall,
    simulate_road_closure,
    simulate_sensor_failure
)
from services.scenario_summary import (
    generate_scenario_summary
)

app = FastAPI(
    title="Chennai AI ICCC ML Service",
    description="Machine Learning service for the Chennai Urban Digital Twin",
    version="1.0.0"
)


@app.get("/")
def root():

    return {
        "status": "online",
        "service": "Chennai AI ICCC ML Service"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


@app.get("/predict/traffic")
def predict_traffic(
    sensor_id: int = 1
):

    prediction = get_latest_traffic(
        sensor_id
    )

    if prediction is None:

        raise HTTPException(
            status_code=400,
            detail="Not enough traffic data for prediction"
        )

    return {
        "sensor_id": sensor_id,
        "prediction": prediction,
        "unit": "traffic_index",
        "model": "Random Forest"
    }


@app.get("/predict/e-waste")
def predict_ewaste(
    point_id: int = 1
):

    prediction = get_latest_ewaste(
        point_id
    )

    if prediction is None:

        raise HTTPException(
            status_code=400,
            detail="Not enough e-waste data for prediction"
        )

    return {
        "point_id": point_id,
        "predicted_next_load_kg": prediction,
        "model": "Random Forest Regressor"
    }


@app.get("/predict/e-waste-risk")
def predict_ewaste_risk(
    point_id: int = 1
):

    risk_data = get_ewaste_risk(
        point_id
    )

    if risk_data is None:

        raise HTTPException(
            status_code=400,
            detail="Unable to calculate e-waste risk"
        )

    return risk_data


@app.get("/predict/anomaly")
def predict_anomaly(
    sensor_id: int = 1
):

    result = detect_anomaly(
        sensor_id
    )

    if result is None:

        raise HTTPException(
            status_code=400,
            detail="Unable to detect sensor anomaly"
        )

    return result


@app.get("/predict/sensor-validation")
def predict_sensor_validation(
    sensor_id: int = 1
):

    result = validate_sensor(
        sensor_id
    )

    if result is None:

        raise HTTPException(
            status_code=400,
            detail="Unable to validate sensor"
        )

    return result


@app.get("/predict/scenario/traffic")
def scenario_traffic(
    increase_percent: float = 40
):

    if increase_percent < 0:

        raise HTTPException(
            status_code=400,
            detail="Traffic increase cannot be negative"
        )

    if increase_percent > 200:

        raise HTTPException(
            status_code=400,
            detail="Traffic increase cannot exceed 200 percent"
        )

    return simulate_traffic_increase(
        increase_percent
    )


@app.get("/predict/scenario/flood")
def scenario_flood(
    rainfall_increase_percent: float = 50
):

    if rainfall_increase_percent < 0:

        raise HTTPException(
            status_code=400,
            detail="Rainfall increase cannot be negative"
        )

    if rainfall_increase_percent > 300:

        raise HTTPException(
            status_code=400,
            detail="Rainfall increase cannot exceed 300 percent"
        )

    return simulate_extreme_rainfall(
        rainfall_increase_percent
    )


@app.get("/predict/scenario/road-closure")
def scenario_road_closure(
    road_id: int = 1
):

    result = simulate_road_closure(
        road_id
    )

    if result is None:

        raise HTTPException(
            status_code=404,
            detail="Road not found"
        )

    return result


@app.get("/predict/scenario/sensor-failure")
def scenario_sensor_failure(
    sensor_id: int = 1,
    failure_value: float = 99
):

    result = simulate_sensor_failure(
        sensor_id,
        failure_value
    )

    if result is None:

        raise HTTPException(
            status_code=404,
            detail="Sensor not found"
        )

    return result
@app.get("/predict/scenario-summary")
def scenario_summary(
    scenario_type: str = "TRAFFIC",
    value: float = 40,
    target_id: int = 1
):

    scenario_type = scenario_type.upper()

    allowed_scenarios = [
        "TRAFFIC",
        "FLOOD",
        "ROAD_CLOSURE",
        "SENSOR_FAILURE"
    ]

    if scenario_type not in allowed_scenarios:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid scenario type. "
                "Use TRAFFIC, FLOOD, "
                "ROAD_CLOSURE or SENSOR_FAILURE."
            )
        )

    if value < 0:

        raise HTTPException(
            status_code=400,
            detail="Scenario value cannot be negative"
        )

    result = generate_scenario_summary(
        scenario_type,
        value,
        target_id
    )

    if result is None:

        raise HTTPException(
            status_code=404,
            detail="Unable to generate scenario"
        )

    return result