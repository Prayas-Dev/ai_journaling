import React from "react";

function MoodSelector({ moods, mood, handleMoodSelection }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm text-gray-600 mb-2">How are you feeling today?</h3>
      <div className="flex justify-center space-x-3">
        {moods.map((m) => (
          <button
            key={m.emoji}
            className={`text-2xl transition transform hover:scale-110 ${
              mood === m.emoji ? "border border-gray-500 p-1 rounded-lg bg-gray-200" : ""
            }`}
            onClick={() => handleMoodSelection(m)}
          >
            {m.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export default MoodSelector;
