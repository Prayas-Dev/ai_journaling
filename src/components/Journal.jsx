import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

function Journal({ hasAnimatedRef }) {
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [aiTyping, setAiTyping] = useState(false);

  // ✅ Fetch AI Response from API
  const fetchAIResponse = async (userMessage) => {
    try {
      const response = await fetch("http://localhost:5000/api/journals/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entryText: userMessage }),
      });
      const data = await response.json();
      const prompt = data.prompt;
      console.log(prompt);
      return prompt || "I couldn't process that, try again.";
    } catch (error) {
      console.error("Error fetching AI response:", error);
      return "Oops! Something went wrong.";
    }
  };

  // ✅ Handle user message submission
  const handleAddEntry = async (message) => {
    if (!message.trim()) return;

    const userEntry = { id: Date.now(), role: "user", content: message };
    setDisplayedMessages((prev) => [...prev, userEntry]);
    setNewMessage("");
    setAiTyping(true);

    const aiResponse = await fetchAIResponse(message);
    const cleanResponse = (aiResponse ?? "I couldn't process that, try again.")
    .replace(/undefined/g, "")
    .trim();
  
  const aiEntry = { id: Date.now() + Math.random(), role: "ai", content: cleanResponse };
  

      
    setDisplayedMessages((prev) => [...prev, aiEntry]);
    setAiTyping(false);
  };

  return (
    <div className="space-y-4 p-6 min-h-screen bg-white">
      <h1 className="text-2xl font-semibold text-center mb-4">Journal Entries</h1>

      {displayedMessages.length === 0 ? (
        <p className="text-gray-500 text-center">No journal entries yet.</p>
      ) : (
        displayedMessages.map((message) =>
          message.role === "ai" ? (
            <TypingText
              key={message.id}
              text={message.content}
              messageId={message.id}
              hasAnimatedRef={hasAnimatedRef}
            />
          ) : (
            <p
              key={message.id}
              className="p-3 rounded-lg text-black font-bold text-lg"
              style={{ backgroundColor: "transparent" }}
            >
              {message.content}
            </p>
          )
        )
      )}

      {aiTyping && (
        <p className="text-gray-500 italic text-left">AI is thinking...</p>
      )}

      {/* User Input Section */}
      <div className="mt-6 flex flex-col items-start gap-2 w-full">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="p-2 w-full resize-none focus:ring-0 outline-none bg-transparent"
          placeholder="Write your thoughts..."
        />
        <button
          onClick={() => handleAddEntry(newMessage)}
          className="bg-gradient-to-r from-black to-gray-500 text-white px-4 py-2 rounded-md hover:opacity-90 transition-all"
        >
          Go Deeper
        </button>
      </div>
    </div>
  );
}

// ✅ Typewriter Effect for AI Responses
function TypingText({ text, messageId, hasAnimatedRef }) {
  const [displayedText, setDisplayedText] = useState(
    hasAnimatedRef.current.has(messageId) ? text : ""
  );
console.log(`displayedText: ${displayedText}`);
console.log(`text: ${text}`)

useEffect(() => {
  if (hasAnimatedRef.current.has(messageId)) return;

  let i = 0;
  const interval = setInterval(() => {
    if (i < (text.length-1)) {
      setDisplayedText((prev) => prev + text[i]);
      console.log(text[i]);
      i++;
    } else {
      clearInterval(interval);
      hasAnimatedRef.current.add(messageId);
    }
  }, 30);

  return () => clearInterval(interval);
}, [text, messageId, hasAnimatedRef]);


  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-3 rounded-lg text-black text-base"
      style={{ backgroundColor: "transparent" }}
    >
      {displayedText}
    </motion.p>
  );
}

export default Journal;