from datetime import datetime


# ============================================================
# SIMULATED CITY EXECUTION STATE
# ============================================================

execution_state = {
    "last_execution_id": None,
    "status": "IDLE",
    "timestamp": None,
    "actions": []
}


# ============================================================
# SIMULATED ACTION EXECUTORS
# ============================================================

def simulate_dispatch_ambulance():

    return {
        "action": "DISPATCH_AMBULANCE",
        "status": "SIMULATED_EXECUTED",
        "details": {
            "ambulance_id": "AMB-07",
            "location": "Anna Nagar",
            "status": "DISPATCHED",
            "estimated_arrival_minutes": 11
        }
    }


def simulate_green_corridor():

    return {
        "action": "CREATE_GREEN_CORRIDOR",
        "status": "SIMULATED_EXECUTED",
        "details": {
            "route": [
                "Anna Nagar",
                "Poonamallee High Road",
                "Egmore",
                "Government General Hospital"
            ],
            "signal_priority": "SIMULATED",
            "duration_minutes": 15
        }
    }


def simulate_emergency_notification():

    return {
        "action": "SEND_EMERGENCY_NOTIFICATION",
        "status": "SIMULATED_EXECUTED",
        "details": {
            "recipient": "Chennai ICCC Emergency Operations",
            "notification_status": "SIMULATED_SENT",
            "message": (
                "Traffic accident reported near Anna Nagar. "
                "Emergency response plan activated in simulation."
            )
        }
    }


# ============================================================
# EXECUTION DISPATCHER
# ============================================================

def execute_action(action):

    if action == "DISPATCH_AMBULANCE":
        return simulate_dispatch_ambulance()

    if action == "CREATE_GREEN_CORRIDOR":
        return simulate_green_corridor()

    if action == "SEND_EMERGENCY_NOTIFICATION":
        return simulate_emergency_notification()

    return {
        "action": action,
        "status": "NOT_EXECUTED",
        "details": {
            "reason": "Unknown or unsupported action."
        }
    }


# ============================================================
# EXECUTE APPROVED PLAN
# ============================================================

def execute_approved_plan(action_plan):

    global execution_state

    execution_id = (
        f"SIM-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    )

    executed_actions = []

    for action in action_plan:

        action_name = action.get("action")

        result = execute_action(action_name)

        executed_actions.append(result)

    execution_state = {
        "last_execution_id": execution_id,
        "status": "SIMULATION_EXECUTED",
        "timestamp": datetime.now().isoformat(),
        "actions": executed_actions
    }

    return execution_state


# ============================================================
# GET CURRENT EXECUTION STATE
# ============================================================

def get_execution_state():

    return execution_state