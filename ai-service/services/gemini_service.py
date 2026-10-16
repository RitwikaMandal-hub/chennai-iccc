import os

from dotenv import load_dotenv
from google import genai

from services.city_tools import (
    get_traffic_prediction,
    get_nearest_ambulance,
    get_route
)


load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError(
        "GEMINI_API_KEY is not set in the .env file."
    )


client = genai.Client(
    api_key=API_KEY
)


# -----------------------------------
# Traffic Prediction Tool
# -----------------------------------

traffic_tool = {
    "type": "function",
    "name": "get_traffic_prediction",
    "description": (
        "Get the latest machine learning traffic "
        "prediction for a Chennai traffic sensor."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "sensor_id": {
                "type": "integer",
                "description": (
                    "The ID of the traffic sensor."
                )
            }
        },
        "required": [
            "sensor_id"
        ]
    }
}


# -----------------------------------
# Nearest Ambulance Tool
# -----------------------------------

ambulance_tool = {
    "type": "function",
    "name": "get_nearest_ambulance",
    "description": (
        "Find the nearest available ambulance "
        "to a specified location in Chennai."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "latitude": {
                "type": "number",
                "description": (
                    "Latitude of the incident location."
                )
            },
            "longitude": {
                "type": "number",
                "description": (
                    "Longitude of the incident location."
                )
            }
        },
        "required": [
            "latitude",
            "longitude"
        ]
    }
}


# -----------------------------------
# Route Tool
# -----------------------------------

route_tool = {
    "type": "function",
    "name": "get_route",
    "description": (
        "Find a recommended route between an "
        "origin and destination in Chennai."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "origin": {
                "type": "string",
                "description": (
                    "Starting location."
                )
            },
            "destination": {
                "type": "string",
                "description": (
                    "Destination location."
                )
            }
        },
        "required": [
            "origin",
            "destination"
        ]
    }
}


# -----------------------------------
# Gemini Request Function
# -----------------------------------

def ask_gemini(prompt):

    interaction = client.interactions.create(
        model="gemini-3.6-flash",
        input=prompt,
        tools=[
            traffic_tool,
            ambulance_tool,
            route_tool
        ]
    )

    return interaction