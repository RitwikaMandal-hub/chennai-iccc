from services.rag_service import retrieve_knowledge
from services.gemini_service import client


query = """
What should the control room do when a flood sensor
reaches a critical level?
"""


# -----------------------------------
# Retrieve relevant knowledge
# -----------------------------------

results = retrieve_knowledge(query)


context = "\n\n".join(results)


print("\nRetrieved RAG context:")
print("======================")
print(context)


# -----------------------------------
# Give retrieved context to Gemini
# -----------------------------------

prompt = f"""
You are the AI Operations Assistant for the
Chennai Urban Digital Twin.

Answer the operator's question using ONLY the
retrieved operational knowledge provided below.

If the knowledge does not contain enough
information, clearly say that additional
information is required.

Retrieved operational knowledge:

{context}


Operator question:

{query}

Provide a concise operational recommendation.
Do not claim that any action has been executed.
"""


interaction = client.interactions.create(
    model="gemini-3.6-flash",
    input=prompt
)


print("\nGemini grounded response:")
print("=========================")
print(
    interaction.output_text
)