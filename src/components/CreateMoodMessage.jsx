import React from "react";

function MoodMessage({ mood, moods, showMoodMessage, handleCloseMood }) {
  if (!showMoodMessage) return null;

  return (
    <div className="ml-6 p-4 max-w-sm bg-white shadow-lg rounded-lg transition-all duration-300 transform">
      <div className="flex justify-between items-center">
        <p className="text-gray-700 font-medium">
          {moods.find((m) => m.emoji === mood)?.message}
        </p>
        <button
          onClick={handleCloseMood}
          className="ml-3 text-gray-500 hover:text-gray-700 transition duration-300"
        >
          ✖
        </button>
      </div>
    </div>
  );
}

export default MoodMessage;
