import React, { useState, useEffect, useRef } from "react";
import { Send, Square } from "lucide-react";

function JournalSection() {
  const [newEntry, setNewEntry] = useState("");
  const [messages, setMessages] = useState([]);
  const [aiTyping, setAiTyping] = useState(false);
  const [stopTyping, setStopTyping] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);
  const [mode, setMode] = useState("Stoic"); // Default mode
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingIntervalRef = useRef(null);
  const API_KEY = "AIzaSyC1NePYmTSlJgNtsQUrfmuZKaEXcoiS_34";

  useEffect(() => {
    if (!userScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        setUserScrolled(scrollTop + clientHeight < scrollHeight - 20);
      }
    };
    messagesContainerRef.current?.addEventListener("scroll", handleScroll);
    return () => messagesContainerRef.current?.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSendMessage = async () => {
    if (!newEntry.trim()) return;
  
    const userMessage = { text: newEntry, sender: "user" };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setNewEntry("");
    setUserScrolled(false);
  
    try {
      setAiTyping(true);
      setStopTyping(false);
  
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: `Mode: ${mode}. User: ${newEntry}` }] }] }),
        }
      );
  
      const data = await response.json();
      let aiReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm unable to generate a response right now.";
      aiReply = aiReply.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1");
  
      // Use the typing effect instead of setting the message instantly
      typeAiResponse(aiReply, updatedMessages);
  
      // ✅ Save to Database (Fixed structure)
      await fetch("http://localhost:5000/api/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_text: newEntry, response_text: aiReply }),
      });
  
    } catch (error) {
      console.error("Error fetching AI response:", error);
      setMessages([...updatedMessages, { text: "Oops! Something went wrong.", sender: "ai" }]);
      setAiTyping(false);
    }
  };
  
  
  

  const typeAiResponse = (text, updatedMessages) => {
    let index = 0;
    let currentText = "";
    typingIntervalRef.current = setInterval(() => {
      if (stopTyping || index >= text.length) {
        clearInterval(typingIntervalRef.current);
        setAiTyping(false);
      } else {
        currentText += text[index];
        setMessages([...updatedMessages, { text: currentText, sender: "ai" }]);
        index++;
      }
    }, 50);
  };
  

  const handleStopTyping = () => {
    clearInterval(typingIntervalRef.current);
    setStopTyping(true);
    setAiTyping(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100">
      <div className="w-full sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl h-auto bg-white p-8 rounded-xl shadow-xl flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold">Chat with AI</h1>
          <select
            className="p-2 border rounded-md bg-gray-100 text-gray-700"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="Stoic">Stoic</option>
            <option value="Sensitive">Sensitive</option>
            <option value="Creative">Creative</option>
            <option value="Analytical">Analytical</option>
          </select>
        </div>

        <div ref={messagesContainerRef} className="flex flex-col space-y-4 overflow-y-auto max-h-[400px] p-2 scrollbar-hide">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-3 max-w-xs md:max-w-sm lg:max-w-md text-white rounded-lg ${
                msg.sender === "user" ? "bg-blue-500 self-end" : "bg-green-500 self-start"
              }`}
            >
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef}></div>
        </div>

        <div className="mt-4 w-full flex items-center space-x-2">
          <textarea
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            placeholder="Ask something..."
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300 resize-none overflow-hidden"
            rows="1"
            style={{ height: "48px" }}
          />
          <button
            onClick={aiTyping ? handleStopTyping : handleSendMessage}
            className={`text-white px-6 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center ${
              aiTyping ? "bg-red-500 hover:bg-red-600" : "bg-gradient-to-r from-blue-500 to-indigo-500"
            }`}
            style={{ height: "48px" }}
          >
            {aiTyping ? <Square size={20} /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default JournalSection;
