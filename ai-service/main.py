import os
import json

from dotenv import load_dotenv

from fastapi import FastAPI
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

from services.execution_service import (
    execute_approved_plan,
    get_execution_state
)


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="Chennai AI ICCC Agent Service",
    description=(
        "AI Operations Agent for "
        "Chennai Urban Digital Twin"
    ),
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================
# GEMINI QUOTA STATE
# ============================================================

GEMINI_QUOTA_BLOCKED = False


# ============================================================
# BASIC ROUTES
# ============================================================

@app.get("/")
def root():

    return {
        "message":
            "Chennai AI ICCC Agent Service is running"
    }


@app.get("/health")
def health():

    return {
        "status": "online",
        "service":
            "Chennai AI ICCC AI Agent",
        "gemini_quota_blocked":
            GEMINI_QUOTA_BLOCKED
    }


# ============================================================
# GEMINI ERROR DETECTION
# ============================================================

def is_gemini_quota_error(error):

    error_text = str(error).lower()

    quota_keywords = [
        "429",
        "rate limit",
        "rate_limit",
        "quota exceeded",
        "quota_exceeded",
        "too_many_requests",
        "resource_exhausted"
    ]

    for keyword in quota_keywords:

        if keyword in error_text:
            return True

    return False


# ============================================================
# LOCAL SIMULATION FALLBACK
# ============================================================

def generate_simulation_response(prompt):

    print(
        "\n==================================="
    )

    print(
        "GEMINI UNAVAILABLE"
    )

    print(
        "SWITCHING TO SIMULATION MODE"
    )

    print(
        "===================================\n"
    )

    # --------------------------------------------------------
    # RAG
    # --------------------------------------------------------

    try:

        knowledge_sections = (
            retrieve_knowledge(prompt)
        )

    except Exception as error:

        print(
            "RAG error:",
            error
        )

        knowledge_sections = []

    # --------------------------------------------------------
    # Traffic prediction
    # --------------------------------------------------------

    try:

        traffic_result = (
            get_traffic_prediction(
                sensor_id=1
            )
        )

    except Exception as error:

        print(
            "Traffic tool error:",
            error
        )

        traffic_result = {
            "sensor_id": 1,
            "prediction": None,
            "unit": "traffic_index",
            "model": "Random Forest"
        }

    # --------------------------------------------------------
    # Ambulance
    # --------------------------------------------------------

    try:

        ambulance_result = (
            get_nearest_ambulance(
                latitude=13.085,
                longitude=80.2101
            )
        )

    except Exception as error:

        print(
            "Ambulance tool error:",
            error
        )

        ambulance_result = {
            "ambulance_id": "UNAVAILABLE",
            "location": "Unknown",
            "distance_km": None,
            "estimated_arrival_minutes": None,
            "status": "UNKNOWN"
        }

    # --------------------------------------------------------
    # Route
    # --------------------------------------------------------

    try:

        route_result = get_route(
            origin="Anna Nagar",
            destination=(
                "Government General Hospital"
            )
        )

    except Exception as error:

        print(
            "Route tool error:",
            error
        )

        route_result = {
            "origin": "Anna Nagar",
            "destination": (
                "Government General Hospital"
            ),
            "distance_km": None,
            "estimated_time_minutes": None,
            "traffic_condition": "UNKNOWN",
            "recommended_route": []
        }

    # --------------------------------------------------------
    # Safety
    # --------------------------------------------------------

    try:

        action_plan = create_action_plan()

    except Exception as error:

        print(
            "Safety guard error:",
            error
        )

        action_plan = []

    # --------------------------------------------------------
    # RAG text
    # --------------------------------------------------------

    if knowledge_sections:

        rag_text = "\n\n".join(
            knowledge_sections
        )

    else:

        rag_text = (
            "No directly matching "
            "knowledge-base section was retrieved."
        )

    # --------------------------------------------------------
    # Route formatting
    # --------------------------------------------------------

    route_list = route_result.get(
        "recommended_route",
        []
    )

    if route_list:

        route_text = " → ".join(
            route_list
        )

    else:

        route_text = "Route unavailable"

    # --------------------------------------------------------
    # Traffic formatting
    # --------------------------------------------------------

    traffic_prediction = (
        traffic_result.get(
            "prediction"
        )
    )

    if traffic_prediction is not None:

        traffic_text = (
            f"{traffic_prediction:.2f}"
        )

    else:

        traffic_text = "Unavailable"

    # --------------------------------------------------------
    # Action formatting
    # --------------------------------------------------------

    if action_plan:

        action_lines = []

        for index, action in enumerate(
            action_plan,
            start=1
        ):

            action_lines.append(
                f"{index}. "
                f"{action.get('action', 'UNKNOWN')}"
            )

        actions_text = "\n".join(
            action_lines
        )

    else:

        actions_text = (
            "No executable action plan generated."
        )

    # --------------------------------------------------------
    # Final response
    # --------------------------------------------------------

    response = f"""
### AI Operations Agent — Simulation Mode

Gemini API quota is currently unavailable.
The local Chennai AI ICCC pipeline has switched
to simulation mode.

The simulation continues using the project's:

• ML prediction service
• City tools
• RAG knowledge base
• Emergency-response logic
• Safety and human-approval layer

---

### Situation

{prompt}

---

### Traffic Intelligence

Traffic Sensor: {traffic_result.get("sensor_id", "Unknown")}

Predicted Traffic Index: {traffic_text}

Model: {traffic_result.get("model", "Unknown")}

---

### Emergency Resource

Ambulance: {ambulance_result.get("ambulance_id", "Unknown")}

Location: {ambulance_result.get("location", "Unknown")}

Distance: {ambulance_result.get("distance_km", "Unknown")} km

Estimated Arrival:
{ambulance_result.get("estimated_arrival_minutes", "Unknown")} minutes

Status: {ambulance_result.get("status", "Unknown")}

---

### Recommended Route

{route_text}

Distance:
{route_result.get("distance_km", "Unknown")} km

Estimated Travel Time:
{route_result.get("estimated_time_minutes", "Unknown")} minutes

Traffic Condition:
{route_result.get("traffic_condition", "Unknown")}

---

### AI Response Plan

1. Assess the reported incident location.
2. Check current traffic conditions.
3. Identify the nearest available emergency resource.
4. Evaluate the recommended emergency route.
5. Consider signal priority / green-corridor coordination.
6. Notify the relevant emergency-response team.
7. Continue monitoring the situation.

---

### Proposed Actions

{actions_text}

---

### Safety Status

These actions are recommendations only.

Human approval is required before any operational
action such as ambulance dispatch, signal changes,
green-corridor creation, traffic rerouting, road
closure, or emergency notification.

No real-world action has been executed.

---

### Retrieved Operational Knowledge

{rag_text}

---

### System Mode

SIMULATION

Gemini agentic reasoning will automatically resume
when the Gemini API quota becomes available again.
"""

    return response.strip()


# ============================================================
# SIMPLE GEMINI ENDPOINT
# ============================================================

@app.get("/ask")
def ask(prompt: str):

    global GEMINI_QUOTA_BLOCKED

    if GEMINI_QUOTA_BLOCKED:

        return {
            "prompt": prompt,
            "status": "SIMULATION",
            "response":
                generate_simulation_response(
                    prompt
                )
        }

    try:

        interaction = client.interactions.create(
            model="gemini-3.6-flash",
            input=prompt
        )

        output_text = getattr(
            interaction,
            "output_text",
            None
        )

        if output_text:

            return {
                "prompt": prompt,
                "status": "LIVE_GEMINI",
                "response": output_text
            }

        return {
            "prompt": prompt,
            "status": "SIMULATION",
            "response":
                generate_simulation_response(
                    prompt
                )
        }

    except Exception as error:

        print(
            "\nGemini request failed:",
            error
        )

        if is_gemini_quota_error(error):

            GEMINI_QUOTA_BLOCKED = True

            print(
                "\nGemini quota/rate limit detected."
            )

            print(
                "Future requests will use "
                "local simulation mode."
            )

        return {
            "prompt": prompt,
            "status": "SIMULATION",
            "response":
                generate_simulation_response(
                    prompt
                )
        }


# ============================================================
# AGENTIC WORKFLOW
# ============================================================

@app.get("/agent")
def agent(prompt: str):

    global GEMINI_QUOTA_BLOCKED

    print(
        "\n==================================="
    )

    print(
        "AI OPERATIONS AGENT"
    )

    print(
        "==================================="
    )

    print(
        "Prompt:",
        prompt
    )

    # --------------------------------------------------------
    # Gemini already known to be unavailable
    # --------------------------------------------------------

    if GEMINI_QUOTA_BLOCKED:

        print(
            "Gemini quota blocked."
        )

        print(
            "Using local simulation mode."
        )

        return {
            "prompt": prompt,
            "status": "SIMULATION",
            "response":
                generate_simulation_response(
                    prompt
                )
        }

    # --------------------------------------------------------
    # Gemini agentic workflow
    # --------------------------------------------------------

    try:

        interaction = client.interactions.create(
            model="gemini-3.6-flash",
            input=prompt,
            tools=[
                traffic_tool,
                ambulance_tool,
                route_tool
            ]
        )

        print(
            "\nInitial Gemini interaction created."
        )

        max_rounds = 5

        for round_number in range(
            max_rounds
        ):

            print(
                f"\n========== AGENT ROUND "
                f"{round_number + 1} =========="
            )

            steps = getattr(
                interaction,
                "steps",
                []
            )

            tool_outputs = []

            # ------------------------------------------------
            # Inspect Gemini steps
            # ------------------------------------------------

            for step in steps:

                step_type = getattr(
                    step,
                    "type",
                    None
                )

                if step_type == "tool_use":

                    tool_name = getattr(
                        step,
                        "name",
                        None
                    )

                    arguments = getattr(
                        step,
                        "arguments",
                        {}
                    )

                    print(
                        "\nAI requested tool:"
                    )

                    print(
                        tool_name
                    )

                    print(
                        "Arguments:"
                    )

                    print(
                        arguments
                    )

                    # ----------------------------------------
                    # Traffic
                    # ----------------------------------------

                    if (
                        tool_name
                        == "get_traffic_prediction"
                    ):

                        sensor_id = arguments.get(
                            "sensor_id",
                            1
                        )

                        result = (
                            get_traffic_prediction(
                                sensor_id=sensor_id
                            )
                        )

                    # ----------------------------------------
                    # Ambulance
                    # ----------------------------------------

                    elif (
                        tool_name
                        == "get_nearest_ambulance"
                    ):

                        latitude = arguments.get(
                            "latitude",
                            13.0827
                        )

                        longitude = arguments.get(
                            "longitude",
                            80.2707
                        )

                        result = (
                            get_nearest_ambulance(
                                latitude=latitude,
                                longitude=longitude
                            )
                        )

                    # ----------------------------------------
                    # Route
                    # ----------------------------------------

                    elif (
                        tool_name
                        == "get_route"
                    ):

                        origin = arguments.get(
                            "origin",
                            "Anna Nagar"
                        )

                        destination = arguments.get(
                            "destination",
                            "Government General Hospital"
                        )

                        result = get_route(
                            origin=origin,
                            destination=destination
                        )

                    # ----------------------------------------
                    # Unknown
                    # ----------------------------------------

                    else:

                        result = {
                            "error":
                                "Unknown tool requested."
                        }

                    print(
                        "Tool result:"
                    )

                    print(
                        result
                    )

                    tool_outputs.append(
                        {
                            "tool_name": tool_name,
                            "result": result
                        }
                    )

            # ------------------------------------------------
            # No tools requested
            # ------------------------------------------------

            if not tool_outputs:

                output_text = getattr(
                    interaction,
                    "output_text",
                    None
                )

                print(
                    "\nFinal Gemini output:"
                )

                print(
                    output_text
                )

                if output_text:

                    return {
                        "prompt": prompt,
                        "status": "LIVE_AGENT",
                        "response": output_text
                    }

                print(
                    "\nGemini returned empty output."
                )

                return {
                    "prompt": prompt,
                    "status": "SIMULATION",
                    "response":
                        generate_simulation_response(
                            prompt
                        )
                }

            # ------------------------------------------------
            # Send tool results back
            # ------------------------------------------------

            tool_result_inputs = []

            for tool_output in tool_outputs:

                tool_result_inputs.append(
                    {
                        "type": "function_result",
                        "name":
                            tool_output[
                                "tool_name"
                            ],
                        "result":
                            json.dumps(
                                tool_output["result"]
                            )
                    }
                )

            print(
                "\nSending tool results back "
                "to Gemini..."
            )

            interaction = client.interactions.create(
                model="gemini-3.6-flash",
                input=tool_result_inputs,
                previous_interaction_id=(
                    interaction.id
                ),
                tools=[
                    traffic_tool,
                    ambulance_tool,
                    route_tool
                ]
            )

        # ----------------------------------------------------
        # Maximum rounds
        # ----------------------------------------------------

        print(
            "\nMaximum agent rounds reached."
        )

        output_text = getattr(
            interaction,
            "output_text",
            None
        )

        if output_text:

            return {
                "prompt": prompt,
                "status": "LIVE_AGENT",
                "response": output_text
            }

        return {
            "prompt": prompt,
            "status": "SIMULATION",
            "response":
                generate_simulation_response(
                    prompt
                )
        }

    # ========================================================
    # GEMINI FAILURE
    # ========================================================

    except Exception as error:

        print(
            "\n==================================="
        )

        print(
            "Gemini agent unavailable:"
        )

        print(
            error
        )

        print(
            "==================================="
        )

        if is_gemini_quota_error(error):

            GEMINI_QUOTA_BLOCKED = True

            print(
                "\nGemini quota/rate limit detected."
            )

            print(
                "Switching future requests "
                "to local simulation mode."
            )

        return {
            "prompt": prompt,
            "status": "SIMULATION",
            "response":
                generate_simulation_response(
                    prompt
                )
        }


# ============================================================
# APPROVAL PLAN
# ============================================================

@app.get("/approval-plan")
def approval_plan():

    try:

        plan = create_action_plan()

        return {
            "status": "PENDING_APPROVAL",
            "actions": plan
        }

    except Exception as error:

        print(
            "Approval plan error:",
            error
        )

        return {
            "status": "ERROR",
            "actions": []
        }


# ============================================================
# APPROVE + EXECUTE SIMULATION
# ============================================================

@app.post("/approval/approve")
def approve_actions():

    try:

        # -----------------------------------------------
        # Generate the currently approved action plan
        # -----------------------------------------------

        plan = create_action_plan()

        # -----------------------------------------------
        # Execute the approved plan in simulation
        # -----------------------------------------------

        execution_result = (
            execute_approved_plan(
                plan
            )
        )

        return {
            "status": "APPROVED",
            "message": (
                "Actions approved by operator "
                "and executed in simulation."
            ),
            "approved_actions": plan,
            "execution": execution_result
        }

    except Exception as error:

        print(
            "Approval execution error:",
            error
        )

        return {
            "status": "ERROR",
            "message": (
                "The approved simulation "
                "could not be executed."
            ),
            "approved_actions": [],
            "execution": None
        }


# ============================================================
# REJECT ACTIONS
# ============================================================

@app.post("/approval/reject")
def reject_actions():

    return {
        "status": "REJECTED",
        "message": (
            "Operator rejected the proposed "
            "AI actions. No simulated execution "
            "was performed."
        ),
        "approved_actions": [],
        "execution": None
    }


# ============================================================
# CURRENT EXECUTION STATE
# ============================================================

@app.get("/execution-state")
def execution_state():

    try:

        return get_execution_state()

    except Exception as error:

        print(
            "Execution state error:",
            error
        )

        return {
            "status": "ERROR",
            "last_execution_id": None,
            "timestamp": None,
            "actions": []
        }