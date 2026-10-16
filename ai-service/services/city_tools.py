import os

import requests

from dotenv import load_dotenv


load_dotenv()


ML_SERVICE_URL = os.getenv(
    "ML_SERVICE_URL",
    "http://localhost:8000"
)


def get_traffic_prediction(
    sensor_id=1
):

    response = requests.get(
        f"{ML_SERVICE_URL}/predict/traffic",
        params={
            "sensor_id": sensor_id
        },
        timeout=10
    )

    response.raise_for_status()

    return response.json()


def get_nearest_ambulance(
    latitude=13.0827,
    longitude=80.2707
):

    # Simulated ambulance availability
    # for the Chennai digital twin.

    return {
        "ambulance_id": "AMB-07",
        "location": "Anna Nagar",
        "distance_km": 4.2,
        "estimated_arrival_minutes": 11,
        "status": "AVAILABLE"
    }


def get_route(
    origin="Anna Nagar",
    destination="Government General Hospital"
):

    # Simulated route result.
    # This will later connect to the
    # digital-twin road network.

    return {
        "origin": origin,
        "destination": destination,
        "distance_km": 7.8,
        "estimated_time_minutes": 19,
        "traffic_condition": "MODERATE",
        "recommended_route": [
            "Anna Nagar",
            "Poonamallee High Road",
            "Egmore",
            "Government General Hospital"
        ]
    }
