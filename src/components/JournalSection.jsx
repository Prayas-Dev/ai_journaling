import React, { useState, useEffect } from "react";
import { Send } from "lucide-react";
import MoodSelector from "./MoodSelector";
import QuoteDisplay from "./QuoteDisplay";
import JournalEntry from "./JournalEntry";
import MoodMessage from "./MoodMessage";

function JournalSection() {
  const [newEntry, setNewEntry] = useState("");
  const [mood, setMood] = useState("");
  const [showMoodMessage, setShowMoodMessage] = useState(false);
  const [aiResponses, setAiResponses] = useState([]);
  const [hideExtras, setHideExtras] = useState(false);

  const moods = [
    { emoji: "😃", message: "You're feeling great! Keep up the positive energy!" },
    { emoji: "😊", message: "You seem content! Reflect on the good moments." },
    { emoji: "😐", message: "Neutral day? Maybe a new activity will spice it up!" },
    { emoji: "😔", message: "Feeling low? Writing can help you process emotions." },
    { emoji: "😢", message: "It's okay to be sad. Remember, tough times pass!" },
  ];

  useEffect(() => {
    sessionStorage.clear();
  }, []);

  const handleAddEntry = async () => {
    if (!newEntry.trim()) return;

    setHideExtras(true);
    setAiResponses((prev) => [...prev, { role: "user", text: newEntry }]);
    setNewEntry("");

    try {
      const response = await fetch("http://localhost:5000/api/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_text: newEntry, mood }),
      });

      if (response.ok) {
        setTimeout(() => {
          setAiResponses((prev) => [...prev, { role: "ai", text: "That's a great thought! How do you feel about it?" }]);
        }, 1500);
      } else {
        alert("Failed to add entry");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error adding entry");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100">
      <div className="w-full sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl h-auto bg-white p-8 rounded-xl shadow-xl transition-all duration-500 transform hover:scale-105 flex flex-col">
        {!hideExtras && <QuoteDisplay />}
        {!hideExtras && <MoodSelector moods={moods} mood={mood} />}
        <JournalEntry newEntry={newEntry} setNewEntry={setNewEntry} handleAddEntry={handleAddEntry} />
        
        {/* Chat Section */}
        <div className="mt-6 flex flex-col space-y-3 overflow-y-auto max-h-96">
          {aiResponses.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg max-w-xs md:max-w-md lg:max-w-lg shadow-md ${
                msg.role === "user" ? "bg-blue-500 text-white self-end" : "bg-gray-200 text-gray-800 self-start"
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>
        
        <div className="mt-auto w-full flex justify-center pt-4">
          <button
            onClick={handleAddEntry}
            className="w-full max-w-xs flex bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 px-6 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 items-center justify-center space-x-2"
          >
            <Send size={20} />
            <span>Send</span>
          </button>
        </div>
      </div>
      <MoodMessage mood={mood} moods={moods} showMoodMessage={showMoodMessage} />
    </div>
  );
}

export default JournalSection;
