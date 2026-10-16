# -----------------------------------
# Human Approval Service
# -----------------------------------

def request_approval(action_plan):

    print("\n===================================")
    print("AI ACTION PLAN")
    print("===================================")

    for index, action in enumerate(
        action_plan,
        start=1
    ):

        print(
            f"{index}. {action['action']}"
        )

        print(
            f"   Approval required: "
            f"{action['approval_required']}"
        )

        print(
            f"   Reason: "
            f"{action['reason']}"
        )

    print("\n===================================")
    print("HUMAN APPROVAL REQUIRED")
    print("===================================")

    decision = input(
        "\nApprove these actions? (yes/no): "
    )

    decision = decision.strip().lower()

    if decision == "yes":

        return {
            "status": "APPROVED",
            "approved_actions": action_plan
        }

    return {
        "status": "REJECTED",
        "approved_actions": []
    }