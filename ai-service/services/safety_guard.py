# -----------------------------------
# AI Operations Safety Guard
# -----------------------------------

APPROVAL_REQUIRED_ACTIONS = [
    "DISPATCH_AMBULANCE",
    "CHANGE_SIGNAL_TIMING",
    "CREATE_GREEN_CORRIDOR",
    "REROUTE_TRAFFIC",
    "CLOSE_ROAD",
    "SEND_EMERGENCY_NOTIFICATION"
]


def check_action(action):

    if action not in APPROVAL_REQUIRED_ACTIONS:

        return {
            "action": action,
            "allowed": False,
            "approval_required": True,
            "reason": "Unknown action. Manual review required."
        }

    return {
        "action": action,
        "allowed": True,
        "approval_required": True,
        "reason": (
            "AI may recommend this action, "
            "but human approval is required "
            "before execution."
        )
    }


def create_action_plan():

    actions = [
        "DISPATCH_AMBULANCE",
        "CREATE_GREEN_CORRIDOR",
        "SEND_EMERGENCY_NOTIFICATION"
    ]

    plan = []

    for action in actions:

        plan.append(
            check_action(action)
        )

    return plan