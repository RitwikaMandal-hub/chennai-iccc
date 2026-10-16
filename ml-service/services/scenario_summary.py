from services.scenario_engine import (
    simulate_traffic_increase,
    simulate_extreme_rainfall,
    simulate_road_closure,
    simulate_sensor_failure
)


def generate_scenario_summary(
    scenario_type,
    value=40,
    target_id=1
):

    if scenario_type == "TRAFFIC":

        result = simulate_traffic_increase(
            value
        )

        return {
            "scenario_type": "TRAFFIC",
            "scenario_name": "Traffic Increase",
            "input": {
                "traffic_increase_percent": value
            },
            "impact": {
                "critical_locations":
                    result["critical_junctions"],

                "congested_locations":
                    result["congested_junctions"]
            },
            "details":
                result["affected_junctions"],

            "message":
                result["message"]
        }

    if scenario_type == "FLOOD":

        result = simulate_extreme_rainfall(
            value
        )

        return {
            "scenario_type": "FLOOD",
            "scenario_name": "Extreme Rainfall",
            "input": {
                "rainfall_increase_percent": value
            },
            "impact": {
                "critical_locations":
                    result["critical_locations"],

                "high_risk_locations":
                    result["high_risk_locations"]
            },
            "details":
                result["affected_locations"],

            "message":
                result["message"]
        }

    if scenario_type == "ROAD_CLOSURE":

        result = simulate_road_closure(
            target_id
        )

        if result is None:
            return None

        return {
            "scenario_type": "ROAD_CLOSURE",
            "scenario_name": "Major Road Closure",
            "input": {
                "road_id": target_id,
                "road_name": result["road_name"]
            },
            "impact": {
                "critical_locations":
                    result["critical_junctions"],

                "congested_locations":
                    result["congested_junctions"]
            },
            "details":
                result["affected_junctions"],

            "message":
                result["message"]
        }

    if scenario_type == "SENSOR_FAILURE":

        result = simulate_sensor_failure(
            target_id,
            value
        )

        if result is None:
            return None

        return {
            "scenario_type": "SENSOR_FAILURE",
            "scenario_name": "Sensor Failure",
            "input": {
                "sensor_id": target_id,
                "simulated_failure_value": value
            },
            "impact": {
                "validation":
                    result["validation"],

                "difference_percent":
                    result["percentage_difference"]
            },
            "details": {
                "sensor_code":
                    result["sensor_code"],

                "sensor_type":
                    result["sensor_type"],

                "location_name":
                    result["location_name"],

                "comparison_average":
                    result["comparison_average"]
            },

            "message":
                result["message"]
        }

    return None