from services.database import get_connection


try:
    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        "SELECT COUNT(*) FROM sensor_readings;"
    )

    result = cursor.fetchone()

    print("PostgreSQL connection successful")
    print("Sensor readings:", result[0])

    cursor.close()
    connection.close()

except Exception as error:
    print("Database connection failed")
    print(error)