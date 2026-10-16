from services.safety_guard import (
    create_action_plan
)

from services.approval_service import (
    request_approval
)


# -----------------------------------
# Generate AI action plan
# -----------------------------------

action_plan = create_action_plan()


# -----------------------------------
# Request human approval
# -----------------------------------

result = request_approval(
    action_plan
)


# -----------------------------------
# Display final decision
# -----------------------------------

print("\n===================================")
print("FINAL DECISION")
print("===================================")

print(
    "Status:",
    result["status"]
)

print(
    "Approved actions:",
    result["approved_actions"]
)