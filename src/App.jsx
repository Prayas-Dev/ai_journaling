import React, { useState } from "react";

function App() {
  const [userInput, setUserInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");

  const handleSubmit = async () => {
    // Placeholder function for sending the prompt to the backend.
    // Replace this with your actual backend API call when ready.
    try {
      const response = await fetch("http://localhost:5000/api/ai-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: userInput }),
      });

      const data = await response.json();
      setAiResponse(data.answer || "Error: No response from AI.");
    } catch (error) {
      console.error("Error communicating with backend:", error);
      setAiResponse("Error: Could not connect to the backend.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
      <div className="max-w-3xl w-full bg-white shadow-lg rounded-2xl p-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-4">AI Journaling</h1>

        {/* Text Editor */}
        <textarea
          className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
          placeholder="Write your thoughts or prompts here..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
        ></textarea>

        <button
          onClick={handleSubmit}
          className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-all"
        >
          Submit to AI
        </button>

        {/* AI Response */}
        {aiResponse && (
          <div className="mt-6 bg-gray-100 p-4 rounded-lg border border-gray-300">
            <h2 className="text-xl font-semibold text-gray-700">AI Response:</h2>
            <p className="mt-2 text-gray-600 whitespace-pre-wrap">{aiResponse}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
