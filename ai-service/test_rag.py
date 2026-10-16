from services.rag_service import (
    retrieve_knowledge
)


query = """
What should the control room do when
a flood sensor reaches a critical level?
"""


results = retrieve_knowledge(
    query
)


print("\nRetrieved knowledge:")
print("====================")


for result in results:

    print("\n")
    print(result)