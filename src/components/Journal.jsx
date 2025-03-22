import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

function Journal({ hasAnimatedRef }) {
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [aiTyping, setAiTyping] = useState(false);

  // Fetch AI Response from Gemini API
  const fetchAIResponse = async (userMessage) => {
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyC1NePYmTSlJgNtsQUrfmuZKaEXcoiS_34",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userMessage }] }]
          }),
        }
      );
  
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  
      const data = await response.json();
      let aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  
      // Ensure aiText is a string and trim any unwanted characters
      if (typeof aiText !== "string") aiText = "I couldn't process that. Please try again.";
  
      // Remove "undefined" explicitly and trim whitespace
      return aiText.replace(/\bundefined\b/gi, "").trim();
  
    } catch (error) {
      console.error("Error fetching AI response:", error);
      return "Oops! Something went wrong. Please try again.";
    }
  };
  

  // Handle user message submission
  const handleAddEntry = async (message) => {
    if (!message.trim()) return;

    const userEntry = { 
      id: Date.now(), 
      role: "user", 
      content: message 
    };
    setDisplayedMessages((prev) => [...prev, userEntry]);
    setNewMessage("");
    setAiTyping(true);

    try {
      const aiResponse = await fetchAIResponse(message);
      const sanitizedResponse = typeof aiResponse === "string" 
        ? aiResponse.replace(/\bundefined\b/gi, '') 
        : "I couldn't process that. Please try again.";

      const aiEntry = { 
        id: Date.now() + Math.random(), 
        role: "ai", 
        content: sanitizedResponse 
      };
      
      setDisplayedMessages((prev) => [...prev, aiEntry]);
    } catch (error) {
      console.error("Error handling entry:", error);
      const errorEntry = {
        id: Date.now(),
        role: "ai",
        content: "Oops! Something went wrong. Please try again."
      };
      setDisplayedMessages((prev) => [...prev, errorEntry]);
    } finally {
      setAiTyping(false);
    }
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

      {aiTyping && <p className="text-gray-500 italic text-left">AI is thinking...</p>}

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

// Typewriter Effect Component
function TypingText({ text, messageId, hasAnimatedRef }) {
  const [displayedText, setDisplayedText] = useState("");
  const animationRef = useRef(null);

  useEffect(() => {
    // If we've already animated this message, show full text immediately.
    if (hasAnimatedRef.current.has(messageId)) {
      setDisplayedText(text);
      return;
    }

    let currentIndex = 0;

    const typeCharacter = () => {
      if (currentIndex < text.length - 1) {
        setDisplayedText((prev) => prev + text[currentIndex]);
        currentIndex++;
        animationRef.current = setTimeout(typeCharacter, 30);
      } else {
        hasAnimatedRef.current.add(messageId);
      }
    };

    typeCharacter();

    return () => clearTimeout(animationRef.current);
  }, [text, messageId, hasAnimatedRef]);

  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-3 rounded-lg text-black text-base"
    >
      {displayedText}
    </motion.p>
  );
}

export default Journal;