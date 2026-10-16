from services.gemini_service import ask_gemini


response = ask_gemini(
    "Explain what a smart city digital twin is in two simple sentences."
)

print("\nGemini response:")
print(response)