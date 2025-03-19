// src/Journal.jsx
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

function Journal({ hasAnimatedRef }) {
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [aiTyping, setAiTyping] = useState(false);

  // Fetch AI Response from Backend API
  const fetchAIResponse = async (userMessage) => {
    try {
      const response = await fetch("http://localhost:5000/api/journals/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryText: userMessage }),
      });
      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      console.log(data);
      let aiText = data?.prompt ?? "No prompt received.";
      return aiText.trim();
    } catch (error) {
      console.error("Error fetching AI response:", error);
      return "Oops! Something went wrong. Please try again.";
    }
  };

  // Handle user message submission: adds the user message and then fetches an AI response.
  const handleAddEntry = async (message) => {
    if (!message.trim()) return;

    const userEntry = {
      id: Date.now(),
      role: "user",
      content: message,
    };
    setDisplayedMessages((prev) => [...prev, userEntry]);
    setNewMessage("");
    setAiTyping(true);

    try {
      const aiResponse = await fetchAIResponse(message);
      const aiEntry = {
        id: Date.now() + Math.random(),
        role: "ai",
        content: aiResponse,
      };
      setDisplayedMessages((prev) => [...prev, aiEntry]);
    } catch (error) {
      console.error("Error handling entry:", error);
      setDisplayedMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "ai",
          content: "Oops! Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setAiTyping(false);
    }
  };

  // Save the entire conversation to the backend using the createOrUpdateJournalEntry endpoint.
  const handleSaveJournal = async () => {
    try {
      // Retrieve user data from localStorage
      const storedUser = localStorage.getItem("userData");
      const userData = storedUser && JSON.parse(storedUser);
      // Use either sub or id from the token payload
      const userId = userData?.sub || userData?.id;
      if (!userId) {
        throw new Error("User is not signed in.");
      }
  
      // Combine all messages into one string with labels: "User:" for user messages and "Prompt:" for AI responses.
      const conversationText = displayedMessages
        .map((msg) => {
          const label = msg.role === "user" ? "User:" : "Prompt:";
          return `${label} ${msg.content}`;
        })
        .join("\n");
  

        const finalText = newMessage.trim();

        const fullConversationText = finalText
        ? `${conversationText}\nUser: ${finalText}`
        : conversationText;
      // Use only the date portion (YYYY-MM-DD) for entry_date, because your table column is a DATE.
      const entryDate = new Date().toISOString().split("T")[0];
  
      // Construct payload for createOrUpdateJournalEntry
      const payload = {
        userId: userId,
        entryText: fullConversationText,
        entry_date: entryDate,
      };

      console.log(payload);
  
      // POST the payload to the backend endpoint
      const response = await fetch("http://localhost:5000/api/journals/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to save journal entry.");
      const data = await response.json();
      console.log("Journal saved successfully:", data);
    } catch (error) {
      console.error("Error saving journal entry:", error);
    }
  };
  

  return (
    <div className="space-y-4 p-6 min-h-screen bg-white">
      <h1 className="text-2xl font-semibold text-center mb-4">Journal Entries</h1>
      {displayedMessages.length === 0 ? (
        <p className="text-gray-500 text-center">Start writing</p>
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
      <div className="mt-6 flex flex-col items-start gap-2 w-full">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="p-2 w-full resize-none focus:ring-0 outline-none bg-transparent"
          placeholder="Write your thoughts..."
        />
        <div className="flex gap-2">
          <button
            onClick={() => handleAddEntry(newMessage)}
            className="bg-gradient-to-r from-black to-gray-500 text-white px-4 py-2 rounded-md hover:opacity-90 transition-all"
          >
            Go Deeper
          </button>
          <button
            onClick={handleSaveJournal}
            className="bg-gradient-to-r from-black to-gray-500 text-white px-4 py-2 rounded-md hover:opacity-90 transition-all"
          >
            Save Journal
          </button>
        </div>
      </div>
    </div>
  );
}

// Typewriter Effect Component for AI responses
function TypingText({ text, messageId, hasAnimatedRef }) {
  const [displayedText, setDisplayedText] = useState("");
  const animationRef = useRef(null);

  useEffect(() => {
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
