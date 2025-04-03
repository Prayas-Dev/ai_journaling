import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FaEdit } from "react-icons/fa";
import PropTypes from "prop-types";
import { toast, ToastContainer } from "react-toastify";
import Modal from "react-modal";

function Journal(props) {
  console.log("Journal component props:", props);
  const { hasAnimatedRef, initialJournalId } = props;
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedMessage, setEditedMessage] = useState("");
  const [currentJournalId, setCurrentJournalId] = useState(initialJournalId || null);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [errorLoadingEntry, setErrorLoadingEntry] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState("././images/8.png");
  // Emotion analysis state: an array of objects { emotion, emoji }
  const [emotionAnalysis, setEmotionAnalysis] = useState([]);

  // Helper function to check if an image exists
  const checkImageExists = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  };

  // Save conversation to backend
  const handleSaveJournal = async () => {
    try {
      toast.info("Saving journal...", {
        position: "top-right",
        autoClose: 2000,
      });

      const storedUser = localStorage.getItem("userData");
      const userData = storedUser && JSON.parse(storedUser);
      const userId = userData?.sub || userData?.id;
      if (!userId) {
        throw new Error("User is not signed in.");
      }

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
      const entryDate = new Date().toISOString().split("T")[0];

      const payload = {
        userId: userId,
        entryText: fullConversationText,
        entry_date: entryDate,
        journalId: currentJournalId,
      };

      console.log("Saving payload:", payload);

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

      // Update journal id if it was newly created
      if (!currentJournalId && data?.journalId) {
        setCurrentJournalId(data.journalId);
      }
      // Set emotion analysis if provided by backend
      if (data.emotions) {
        setEmotionAnalysis(data.emotions);
      }

      // Construct candidate image URL
      const journalIdForImage = currentJournalId || data?.journalId;
      const candidateImage = journalIdForImage
        ? `././images/${journalIdForImage}.png`
        : "././images/8.png";

      const exists = await checkImageExists(candidateImage);
      if (exists) {
        setModalImageSrc(candidateImage);
      } else {
        // Generate random number between 1 and 11 (inclusive)
        const randomNumber = Math.floor(Math.random() * 11) + 1;
        console.log(`Using fallback image: ././default_images/${randomNumber}.jpeg`);
        setModalImageSrc(`././default_images/${randomNumber}.jpeg`);
      }

      toast.success("Journal saved!", {
        position: "top-right",
        autoClose: 2000,
      });
      setIsImageModalOpen(true);
    } catch (error) {
      console.error("Error saving journal entry:", error);
      toast.error("Save Failed!", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  useEffect(() => {
    console.log("initialJournalId:", initialJournalId);
    if (initialJournalId) {
      const fetchJournalEntry = async () => {
        setLoadingEntry(true);
        try {
          const storedUser = localStorage.getItem("userData");
          const userData = storedUser && JSON.parse(storedUser);
          const userId = userData?.sub || userData?.id;
          if (!userId) {
            setErrorLoadingEntry("User not signed in.");
            return;
          }
          const response = await fetch(
            `http://localhost:5000/api/journals/entry/${initialJournalId}/${userId}`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch journal entry details.");
          }
          const data = await response.json();
          console.log("Fetched data:", data);
          const parsedMessages = data.entry_text
            .split("\n")
            .map((line) => {
              if (line.startsWith("User:")) {
                return {
                  id: Date.now() + Math.random(),
                  role: "user",
                  content: line.substring(5).trim(),
                };
              } else if (line.startsWith("Prompt:")) {
                return {
                  id: Date.now() + Math.random(),
                  role: "ai",
                  content: line.substring(7).trim(),
                };
              }
              return null; // Ignore lines that don't start with "User:" or "Prompt:"
            })
            .filter((message) => message !== null);
          setDisplayedMessages(parsedMessages);
          setCurrentJournalId(data.journal_id);
        } catch (error) {
          setErrorLoadingEntry(error.message);
        } finally {
          setLoadingEntry(false);
        }
      };
      fetchJournalEntry();
    } else {
      // New journal entry
      setDisplayedMessages([]);
      setCurrentJournalId(null);
    }
  }, [initialJournalId]);

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
      console.log("AI response data:", data);
      let aiText = data?.prompt ?? "No prompt received.";
      return aiText.trim();
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

  const handleEditMessage = (messageId, content) => {
    setEditingMessageId(messageId);
    setEditedMessage(content);
  };

  const handleSaveEditedMessage = async () => {
    if (!editedMessage.trim()) return;

    const updatedMessages = displayedMessages.map((msg) =>
      msg.id === editingMessageId ? { ...msg, content: editedMessage } : msg
    );
    setDisplayedMessages(updatedMessages);
    setEditingMessageId(null);
    setEditedMessage("");

    // Fetch new AI response for the edited message
    const editedMessageObj = updatedMessages.find(
      (msg) => msg.id === editingMessageId
    );
    if (editedMessageObj && editedMessageObj.role === "user") {
      setAiTyping(true);
      try {
        const aiResponse = await fetchAIResponse(editedMessageObj.content);
        const updatedMessagesWithAI = updatedMessages.map((msg, index) => {
          if (
            msg.role === "ai" &&
            updatedMessages[index - 1]?.id === editedMessageObj.id
          ) {
            return { ...msg, content: aiResponse };
          }
          return msg;
        });
        setDisplayedMessages(updatedMessagesWithAI);
      } catch (error) {
        console.error("Error handling edited entry:", error);
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
    }
  };

  return (
    <div className="space-y-4 p-6 min-h-screen bg-white">
      <ToastContainer />
      <h1 className="text-2xl font-semibold text-center mb-4">
        Journal Entries
      </h1>
      {loadingEntry ? (
        <p className="text-center text-gray-500">Loading journal entry...</p>
      ) : errorLoadingEntry ? (
        <p className="text-center text-red-500">
          Error loading entry: {errorLoadingEntry}
        </p>
      ) : displayedMessages.length === 0 && !initialJournalId ? (
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
            <div
              key={message.id}
              className="relative group p-3 rounded-lg text-black font-bold text-lg"
              style={{ backgroundColor: "transparent" }}
            >
              {editingMessageId === message.id ? (
                <textarea
                  value={editedMessage}
                  onChange={(e) => setEditedMessage(e.target.value)}
                  className="p-2 w-full resize-none focus:ring-0 outline-none bg-transparent"
                />
              ) : (
                <p>{message.content}</p>
              )}
              <FaEdit
                className="absolute top-0 right-4 opacity-0 group-hover:opacity-100 cursor-pointer"
                onClick={() => handleEditMessage(message.id, message.content)}
              />
            </div>
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
          {editingMessageId && (
            <button
              onClick={handleSaveEditedMessage}
              className="bg-gradient-to-r from-black to-gray-500 text-white px-4 py-2 rounded-md hover:opacity-90 transition-all"
            >
              Save Edited Message
            </button>
          )}
        </div>
      </div>
      <Modal
        isOpen={isImageModalOpen}
        onRequestClose={() => setIsImageModalOpen(false)}
        contentLabel="Saved Successfully"
        style={{
          overlay: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
          content: {
            width: "auto",
            height: "auto",
            maxWidth: "90vw",
            maxHeight: "90vh",
            margin: "auto",
            padding: "0px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            overflow: "hidden",
          },
        }}
      >
        {(() => {
          const [slideIndex, setSlideIndex] = useState(0);
          const totalSlides = 2;

          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                width: "100%",
                height: "100%",
              }}
            >
              {/* Left Arrow Button */}
              <button
                style={{
                  position: "absolute",
                  left: "10px",
                  background: "rgba(0, 0, 0, 0.5)",
                  color: "white",
                  border: "none",
                  padding: "10px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  display: slideIndex > 0 ? "block" : "none",
                }}
                onClick={() => setSlideIndex(slideIndex - 1)}
              >
                ◀
              </button>

              {/* Slide 0: Image */}
              {slideIndex === 0 && currentJournalId && (
                <img
                  src={modalImageSrc}
                  alt="Saved Successfully"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              )}

              {/* Slide 1: Emotion Dump */}
              {slideIndex === 1 && (
                <div className="p-6">
                  <h2 className="text-3xl font-bold mb-4 text-center">
                    Emotion Analysis
                  </h2>
                  {emotionAnalysis.length > 0 ? (
                    <ul className="space-y-2">
                      {emotionAnalysis.map((item, index) => (
                        <li
                          key={index}
                          className="text-xl text-center"
                        >
                          {item.emotion} -> {item.emoji}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-lg text-center">
                      No emotion data available.
                    </p>
                  )}
                </div>
              )}

              {/* Right Arrow Button */}
              <button
                style={{
                  position: "absolute",
                  right: "10px",
                  background: "rgba(0, 0, 0, 0.5)",
                  color: "white",
                  border: "none",
                  padding: "10px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  display: slideIndex < totalSlides - 1 ? "block" : "none",
                }}
                onClick={() => setSlideIndex(slideIndex + 1)}
              >
                ▶
              </button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

Journal.propTypes = {
  hasAnimatedRef: PropTypes.shape({
    current: PropTypes.instanceOf(Set).isRequired,
  }).isRequired,
  initialJournalId: PropTypes.string, // Or use number if your IDs are numeric
};

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

TypingText.propTypes = {
  text: PropTypes.string.isRequired,
  messageId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
  hasAnimatedRef: PropTypes.shape({
    current: PropTypes.shape({
      has: PropTypes.func.isRequired,
      add: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
};

export default Journal;
