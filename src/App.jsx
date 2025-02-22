import React, { useState, useEffect, useRef } from "react";
import { History, BookOpen, Settings, Menu, Notebook } from "lucide-react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import NavItem from "./components/NavItem";
import HistorySection from "./components/HistorySection";
import JournalSection from "./components/JournalSection";
import SettingsSection from "./components/SettingSection";
import Journal from "./components/Journal";
import { v4 as uuidv4 } from "uuid";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [entries, setEntries] = useState([]); // Entries managed from PostgreSQL
  const [newEntry, setNewEntry] = useState("");
  const [aiResponses, setAiResponses] = useState([]); // Stores user and AI responses
  const hasAnimatedRef = useRef(new Set()); // Track already animated messages
  const navigate = useNavigate(); // Hook for navigation

  // ✅ Fetch journal entries from the database on mount
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/journal-entries");
        if (!response.ok) throw new Error("Failed to fetch entries.");
        const data = await response.json();
        setEntries(data);
      } catch (error) {
        console.error("Error fetching entries:", error);
      }
    };

    fetchEntries();
  }, []);

  // ✅ Function to add an entry and save it to PostgreSQL
  async function handleAddEntry() {
    if (!newEntry.trim()) return;

    try {
      const response = await fetch("http://localhost:5000/api/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_text: newEntry }),
      });

      if (!response.ok) throw new Error("Failed to save entry.");

      const savedEntry = await response.json();
      
      const userEntry = {
        id: savedEntry.entry.id, // Use ID from the database
        role: "user",
        content: newEntry,
      };

      // Simulated AI response
      const aiResponse = {
        id: uuidv4(),
        role: "ai",
        content: "That's a great thought! How do you feel about it?",
      };

      // ✅ Update local state with new entry and AI response
      setEntries((prev) => [savedEntry.entry, ...prev]);
      setAiResponses((prev) => [...prev, userEntry, aiResponse]);
      setNewEntry(""); // Clear input
      navigate("/journal"); // Navigate to Journal page
    } catch (error) {
      console.error("Error saving entry:", error);
    }
  }

  return (
    <div className="flex h-screen bg-neutral-50 text-neutral-800 font-sans">
      {/* Sidebar */}
      <aside
        className={`bg-white shadow-md flex flex-col items-center py-8 space-y-8 transition-all duration-300 ${
          isSidebarOpen ? "w-40" : "w-0 hidden"
        } sm:w-16`}
      >
        <button
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200 sm:hidden"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="w-6 h-6 text-neutral-600" />
        </button>
        <NavItem icon={History} label="History" to="/history" />
        <NavItem icon={BookOpen} label="Home" to="/home" />
        <NavItem icon={Notebook} label="Journal" to="/journal" />
        <NavItem icon={Settings} label="Settings" to="/settings" />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 w-full">
        <div className="w-full max-w-screen">
          <Routes>
            <Route path="/history" element={<HistorySection entries={entries} />} />
            <Route
              path="/home"
              element={
                <JournalSection
                  newEntry={newEntry}
                  setNewEntry={setNewEntry}
                  handleAddEntry={handleAddEntry}
                  aiResponses={aiResponses}
                />
              }
            />
            <Route path="/settings" element={<SettingsSection />} />
            <Route
              path="/journal"
              element={<Journal aiResponses={aiResponses} hasAnimatedRef={hasAnimatedRef} />}
            />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
