import os
import json

from dotenv import load_dotenv

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from services.rag_service import retrieve_knowledge
from services.safety_guard import create_action_plan

from services.gemini_service import (
    client,
    traffic_tool,
    ambulance_tool,
    route_tool
)

from services.city_tools import (
    get_traffic_prediction,
    get_nearest_ambulance,
    get_route
)


load_dotenv()


FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)


app = FastAPI(
    title="Chennai AI ICCC AI Service",
    description="Gemini-powered AI service for the Chennai Urban Digital Twin",
    version="1.0.0"
)


# -----------------------------------
# CORS
# -----------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------
# Basic endpoints
# -----------------------------------

@app.get("/")
def root():

    return {
        "status": "online",
        "service": "Chennai AI ICCC AI Service"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


# -----------------------------------
# Simple Gemini endpoint
# -----------------------------------

@app.get("/ask")
def ask(
    prompt: str = Query(
        ...,
        min_length=1
    )
):

    from services.gemini_service import ask_gemini

    try:

        interaction = ask_gemini(prompt)

        response_text = (
            interaction.output_text
            or ""
        )

        if not response_text.strip():

            return {
                "prompt": prompt,
                "status": "AI_UNAVAILABLE",
                "response": (
                    "Gemini returned an empty response. "
                    "Please try again."
                )
            }

        return {
            "prompt": prompt,
            "status": "success",
            "response": response_text
        }

    except Exception as error:

        print("\nGemini /ask error:")
        print(error)

        return {
            "prompt": prompt,
            "status": "AI_UNAVAILABLE",
            "response": (
                "The Gemini AI service is temporarily "
                "unavailable. Please try again later."
            )
        }


# -----------------------------------
# Agentic AI endpoint
# -----------------------------------

@app.get("/agent")
def agent(
    prompt: str = Query(
        ...,
        min_length=1
    )
):

    tools = [
        traffic_tool,
        ambulance_tool,
        route_tool
    ]


    # -----------------------------------
    # Retrieve relevant RAG knowledge
    # -----------------------------------

    try:

        relevant_knowledge = retrieve_knowledge(
            prompt
        )

    except Exception as error:

        print("\nRAG retrieval error:")
        print(error)

        relevant_knowledge = []


    knowledge_text = "\n\n".join(
        relevant_knowledge
    )


    if not knowledge_text:

        knowledge_text = (
            "No specific operational knowledge "
            "was retrieved for this request."
        )


    # -----------------------------------
    # Build agent prompt
    # -----------------------------------

    agent_prompt = f"""
You are the AI Operations Agent for the
Chennai AI Urban Digital Twin & Next-Generation ICCC.

The system is a 2.5D digital twin of Chennai.

It combines:
- simulated live IoT sensor data
- simulated traffic data
- machine learning predictions
- emergency response information
- operational knowledge
- AI reasoning
- function/tool calling

Important:

Live city values used by this project may be
simulated for demonstration purposes.

Retrieved operational knowledge:

{knowledge_text}


User request:

{prompt}


When live information is required, use the available
tools before producing your final answer.

After receiving tool results, you MUST produce a
clear textual response for the control-room operator.

Your final response should include relevant information
such as:

- current traffic condition
- ambulance information
- recommended route
- estimated arrival time
- important operational considerations
- concise emergency response recommendations

Do not finish the interaction with an empty response.


Safety rules:

1. Use the retrieved knowledge when it is relevant.

2. Use available tools when live city information
   is required.

3. AI may recommend operational actions.

4. Human approval is required before operational
   actions are executed.

5. Never claim that an ambulance was dispatched,
   a signal was changed, a road was closed,
   traffic was rerouted, or a notification was sent
   unless an execution service explicitly confirms it.

6. Clearly distinguish between:
   - observed or simulated data
   - ML predictions
   - AI recommendations
   - simulated scenarios
   - actions actually executed

7. Do not present simulated data as real-time
   government data.

8. If the retrieved knowledge is insufficient,
   state that clearly instead of inventing
   an operational procedure.

9. If recommending an operational action, clearly
   state that it requires authorized human approval.

Provide a concise but useful control-room response.
"""


    # -----------------------------------
    # Turn 1 — Gemini agent
    # -----------------------------------

    try:

        interaction = client.interactions.create(
            model="gemini-3.6-flash",
            input=agent_prompt,
            tools=tools
        )

    except Exception as error:

        print("\nGemini agent unavailable:")
        print(error)

        return {
            "prompt": prompt,
            "status": "SIMULATION",
            "response": generate_demo_agent_response(
                prompt,
                relevant_knowledge
            )
        }


    print("\nAgent interaction status:")
    print(interaction.status)


    # -----------------------------------
    # Execute requested tools
    # -----------------------------------

    tool_results = []


    for step in interaction.steps:

        if step.type != "function_call":
            continue


        print("\nAI requested tool:")
        print(step.name)

        print("Arguments:")
        print(step.arguments)


        if step.name == "get_traffic_prediction":

            sensor_id = step.arguments.get(
                "sensor_id",
                1
            )

            result = get_traffic_prediction(
                sensor_id
            )


        elif step.name == "get_nearest_ambulance":

            latitude = step.arguments.get(
                "latitude",
                13.0827
            )

            longitude = step.arguments.get(
                "longitude",
                80.2707
            )

            result = get_nearest_ambulance(
                latitude,
                longitude
            )


        elif step.name == "get_route":

            origin = step.arguments.get(
                "origin",
                "Anna Nagar"
            )

            destination = step.arguments.get(
                "destination",
                "Government General Hospital"
            )

            result = get_route(
                origin,
                destination
            )


        else:

            continue


        print("Tool result:")
        print(result)


        tool_results.append(
            {
                "type": "function_result",
                "name": step.name,
                "call_id": step.id,
                "result": [
                    {
                        "type": "text",
                        "text": json.dumps(result)
                    }
                ]
            }
        )


    # -----------------------------------
    # Turn 2 — Gemini final reasoning
    # -----------------------------------

    if tool_results:

        try:

            final_interaction = (
                client.interactions.create(
                    model="gemini-3.6-flash",
                    previous_interaction_id=interaction.id,
                    tools=tools,
                    input=tool_results
                )
            )


            response_text = (
                final_interaction.output_text
                or ""
            )


            # -----------------------------------
            # Prevent empty LIVE_AGENT responses
            # -----------------------------------

            if not response_text.strip():

                print(
                    "\nGemini returned an empty "
                    "final response."
                )

                return {
                    "prompt": prompt,
                    "status": "SIMULATION",
                    "response": generate_demo_agent_response(
                        prompt,
                        relevant_knowledge
                    )
                }


            return {
                "prompt": prompt,
                "status": "LIVE_AGENT",
                "response": response_text
            }


        except Exception as error:

            print(
                "\nGemini final response unavailable:"
            )

            print(error)

            return {
                "prompt": prompt,
                "status": "SIMULATION",
                "response": generate_demo_agent_response(
                    prompt,
                    relevant_knowledge
                )
            }


    # -----------------------------------
    # No tools requested
    # -----------------------------------

    response_text = (
        interaction.output_text
        or ""
    )


    if not response_text.strip():

        return {
            "prompt": prompt,
            "status": "SIMULATION",
            "response": generate_demo_agent_response(
                prompt,
                relevant_knowledge
            )
        }


    return {
        "prompt": prompt,
        "status": "LIVE_AGENT",
        "response": response_text
    }


# -----------------------------------
# Demo agent fallback
# -----------------------------------

def generate_demo_agent_response(
    prompt,
    relevant_knowledge
):

    traffic = get_traffic_prediction(
        1
    )


    ambulance = get_nearest_ambulance(
        13.0878,
        80.217
    )


    route = get_route(
        "Anna Nagar",
        "Government General Hospital"
    )


    knowledge_summary = "\n\n".join(
        relevant_knowledge
    )


    if not knowledge_summary:

        knowledge_summary = (
            "No specific RAG guidance was retrieved."
        )


    return f"""
### AI Operations Agent — Simulation Mode

Gemini is temporarily unavailable or returned
an empty response.

The Digital Twin can still demonstrate the
agent workflow using current simulated city data.

### Retrieved Operational Knowledge

{knowledge_summary}


### Traffic Condition

Traffic sensor 1 predicted index:

{traffic["prediction"]}

Prediction model:

{traffic["model"]}


### Ambulance

Ambulance:

{ambulance["ambulance_id"]}

Location:

{ambulance["location"]}

Status:

{ambulance["status"]}

Distance:

{ambulance["distance_km"]} km

Estimated arrival:

{ambulance["estimated_arrival_minutes"]} minutes


### Recommended Route

{route["origin"]}

→ Poonamallee High Road

→ Egmore

→ Government General Hospital

Distance:

{route["distance_km"]} km

Estimated travel time:

{route["estimated_time_minutes"]} minutes

Traffic condition:

{route["traffic_condition"]}


### Recommended Response

1. Review the incident location.

2. Validate relevant sensor and incident information.

3. Evaluate the recommended emergency route.

4. Coordinate the nearest available emergency
   resource after authorized human approval.

5. Consider signal priority if operationally required.

6. Monitor traffic and sensor conditions during
   the response.

7. Notify the appropriate emergency team after
   authorization.


### Safety

These are AI-generated recommendations and
simulation results.

Human approval is required before operational
actions.

No ambulance dispatch, signal change,
road closure, traffic rerouting, or emergency
notification has actually been executed.
"""


# -----------------------------------
# Human approval endpoint
# -----------------------------------

@app.get("/approval-plan")
def approval_plan():

    action_plan = create_action_plan()


    return {
        "status": "PENDING_APPROVAL",
        "message": (
            "AI recommendations require human "
            "approval before execution."
        ),
        "actions": action_plan
    }


# -----------------------------------
# Human approval decision endpoints
# -----------------------------------

@app.post("/approval/approve")
def approve_actions():

    return {
        "status": "APPROVED",
        "message": (
            "Human approval received. "
            "Actions are authorized for the next "
            "execution stage."
        )
    }


@app.post("/approval/reject")
def reject_actions():

    return {
        "status": "REJECTED",
        "message": (
            "Human approval rejected. "
            "No operational actions will be executed."
        )
    }
