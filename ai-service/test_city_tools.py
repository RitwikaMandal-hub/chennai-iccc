from services.city_tools import (
    get_traffic_prediction,
    get_nearest_ambulance,
    get_route
)


print("\nTraffic prediction:")

print(
    get_traffic_prediction(
        sensor_id=1
    )
)


print("\nNearest ambulance:")

print(
    get_nearest_ambulance()
)


print("\nRecommended route:")

print(
    get_route()
)