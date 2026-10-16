from services.safety_guard import (
    check_action,
    create_action_plan
)


print("\nSingle action check:")

print(
    check_action(
        "DISPATCH_AMBULANCE"
    )
)


print("\nComplete AI action plan:")

plan = create_action_plan()

for action in plan:

    print(action)