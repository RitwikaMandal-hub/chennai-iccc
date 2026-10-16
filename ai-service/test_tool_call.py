import json

from services.gemini_service import (
    client,
    traffic_tool,
    get_traffic_prediction
)


prompt = """
You are the AI operations assistant for the
Chennai Urban Digital Twin.

A traffic operator asks:

"What is the current predicted traffic level
for sensor 1?"

Use the available traffic prediction tool to
obtain the actual prediction before answering.
"""


# -----------------------------------
# TURN 1 — Ask Gemini
# -----------------------------------

interaction = client.interactions.create(
    model="gemini-3.6-flash",
    input=prompt,
    tools=[traffic_tool]
)


# -----------------------------------
# Find Gemini's tool call
# -----------------------------------

function_call = None

for step in interaction.steps:

    if step.type == "function_call":

        function_call = step

        print("\nGemini requested tool:")
        print(step.name)

        print("\nArguments:")
        print(step.arguments)

        break


if function_call is None:

    print(
        "\nGemini did not request a tool."
    )

else:

    # -----------------------------------
    # Execute the requested function
    # -----------------------------------

    if function_call.name == "get_traffic_prediction":

        sensor_id = function_call.arguments[
            "sensor_id"
        ]

        result = get_traffic_prediction(
            sensor_id
        )

        print("\nTool execution result:")
        print(result)


        # -----------------------------------
        # TURN 2 — Send result back to Gemini
        # -----------------------------------

        final_interaction = (
            client.interactions.create(
                model="gemini-3.6-flash",
                previous_interaction_id=interaction.id,
                tools=[traffic_tool],
                input=[
                    {
                        "type": "function_result",
                        "name": function_call.name,
                        "call_id": function_call.id,
                        "result": [
                            {
                                "type": "text",
                                "text": json.dumps(result)
                            }
                        ]
                    }
                ]
            )
        )


        print("\nFinal Gemini response:")
        print(
            final_interaction.output_text
        )