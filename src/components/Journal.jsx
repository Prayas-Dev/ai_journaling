import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

function Journal({ hasAnimatedRef }) {
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [aiTyping, setAiTyping] = useState(false);

  // ✅ Predefined Sad Conversation Flow
  const sadConversationFlow = {
    "i feel sad": "I'm really sorry you're feeling this way. Want to talk about what’s on your mind? Sometimes sharing can lighten the burden.",
    "i don’t know why": "That’s okay. Emotions don’t always have clear reasons. Have you noticed any patterns when you feel this way?",
    "yes, i have": "That sounds tough. You’re not alone in this. Have you found anything in the past that made you feel even a little bit better?",
    "nothing helps": "I hear you. It can feel overwhelming when nothing seems to work. But sometimes, small steps—like writing or talking—can help more than we expect. Want to try?",
    "i feel empty": "Feeling empty can be confusing and exhausting. Have you been able to enjoy anything lately, even just a little?",
    "i feel alone": "You’re not alone in this. Even though it may feel that way, there are people who care about you. Would you like to talk about what’s making you feel this way?",
    "i don’t want to talk about it": "That’s okay. You don’t have to talk about it if you’re not ready. Just know that I’m here whenever you are.",
    "i feel anxious": "That’s understandable. Anxiety can be really tough. Would taking a few deep breaths or writing about what’s making you anxious help?",
  };
  

  // ✅ General AI Response Pool
  const getAIResponse = (userMessage) => {
    const lowerCaseMessage = userMessage.toLowerCase().trim();
    
    if (sadConversationFlow[lowerCaseMessage]) {
      return sadConversationFlow[lowerCaseMessage];
    }

    const responses = [
      "That’s really interesting. What’s making you think about this?",
      "I see! How do you feel about that?",
      "Have you ever experienced something similar before?",
      "That makes sense. What do you plan to do next?",
      "It sounds like this is really important to you. Want to dive deeper into it?",
      "Why do you think that is happening?",
      "Let’s explore this further—what else is on your mind?",
      "I totally understand. Do you want some advice on this?",
      "That sounds like a big deal. Do you think writing it down might help?",
      "Sometimes we just need a moment to breathe. Would a short break help?",
      "You’re handling this well. It’s okay to take things one step at a time.",
      "That’s a complex feeling. What do you think might help you move forward?",
      "You’re not alone in this. Have you spoken to someone about it?",
      "Life can be unpredictable. Do you feel like this situation will change over time?",
      "That’s a valid way to feel. What would be the best outcome for you right now?",
    ];
    

    return responses[Math.floor(Math.random() * responses.length)] || "Hmm, that's interesting! Tell me more.";
  };

  // ✅ Handle user message submission
  const handleAddEntry = (message) => {
    if (!message.trim()) return; // Prevent empty messages

    const userEntry = { id: Date.now(), role: "user", content: message };
    setDisplayedMessages((prev) => [...prev, userEntry]);
    setNewMessage(""); // Clear input field

    // Simulate AI typing delay
    setAiTyping(true);
    setTimeout(() => {
      const aiResponse = getAIResponse(message);
      const aiEntry = { id: Date.now() + Math.random(), role: "ai", content: aiResponse };
      setDisplayedMessages((prev) => [...prev, aiEntry]);
      setAiTyping(false);
    }, 1500); // Delay AI response by 1.5 seconds
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

// ✅ Typewriter Effect with Partial Color Styling
function TypingText({ text, messageId, hasAnimatedRef }) {
  const [displayedText, setDisplayedText] = useState(
    hasAnimatedRef.current.has(messageId) ? text : ""
  );

  useEffect(() => {
    if (hasAnimatedRef.current.has(messageId)) return; // Skip animation if already played

    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text[i]);
        i++;
      } else {
        clearInterval(interval);
        hasAnimatedRef.current.add(messageId); // Mark as animated
      }
    }, 30);

    return () => clearInterval(interval);
  }, [text, messageId, hasAnimatedRef]);

  // ✅ Make "What do you think?" and everything after it invisible
  const splitText = text.split("What do you think?");
  const visibleText = splitText[0]; // Everything before "What do you think?"
  const hiddenText = splitText[1] ? "What do you think?" + splitText[1] : "What do you think?";

  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-3 rounded-lg text-black text-base"
      style={{ backgroundColor: "transparent" }}
    >
      {visibleText}
      <span style={{ color: "white" }}>{hiddenText}</span> {/* Make it invisible */}
    </motion.p>
  );
}

export default Journal;
