// src/App.jsx
import React, { useState, useEffect, useRef } from "react";
import { History, BookOpen, Settings, Menu, Notebook } from "lucide-react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
// Removed the jwt-decode import and replaced it with our custom decodeJwt function
import { decodeJwt } from "./utils/jwt";
import NavItem from "./components/NavItem";
import HistorySection from "./components/HistorySection";
import JournalSection from "./components/JournalSection";
import SettingsSection from "./components/SettingSection";
import Journal from "./components/Journal";
import SignIn from "./components/SignIn";
import { v4 as uuidv4 } from "uuid";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [entries, setEntries] = useState([]); // Journal entries from PostgreSQL
  const [newEntry, setNewEntry] = useState("");
  const [aiResponses, setAiResponses] = useState([]); // User and AI responses
  const hasAnimatedRef = useRef(new Set());
  const navigate = useNavigate();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const location = useLocation();

  console.log("Current location:", location);

  // On initial mount, read token and userData from localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("userData");
    console.log("Initial localStorage check:", { token, storedUser });
    if (token && storedUser) {
      setIsSignedIn(true);
      setUserData(JSON.parse(storedUser));
    }
  }, []);

  // Process token from the URL query and persist it
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    console.log("Token from URL:", token);
    if (token) {
      try {
        // Use our custom decodeJwt function
        const decoded = decodeJwt(token);
        console.log("Decoded token:", decoded);
        setUserData(decoded);
        localStorage.setItem("userData", JSON.stringify(decoded));
        localStorage.setItem("token", token);
        localStorage.setItem("isSignedIn", "true");
        setIsSignedIn(true);
        // Clear the query parameters to keep the URL clean
        navigate(location.pathname, { replace: true });
      } catch (error) {
        console.error("Failed to decode token:", error);
      }
    }
  }, [location.search, location.pathname, navigate]);

  // Fetch journal entries from the database on mount
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/journals/entries");
        if (!response.ok) throw new Error("Failed to fetch entries.");
        const data = await response.json();
        console.log("Fetched entries:", data);
        setEntries(data);
      } catch (error) {
        console.error("Error fetching entries:", error);
      }
    };

    fetchEntries();
  }, []);

  async function handleAddEntry() {
    if (!newEntry.trim()) return;

    try {
      const response = await fetch("http://localhost:5000/api/journals/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_text: newEntry }),
      });

      if (!response.ok) throw new Error("Failed to save entry.");

      const savedEntry = await response.json();
      console.log("Saved entry:", savedEntry);

      const userEntry = {
        id: savedEntry.entry.id,
        role: "user",
        content: newEntry,
      };

      const aiResponse = {
        id: uuidv4(),
        role: "ai",
        content: "That's a great thought! How do you feel about it?",
      };

      setEntries((prev) => [savedEntry.entry, ...prev]);
      setAiResponses((prev) => [...prev, userEntry, aiResponse]);
      setNewEntry("");
      navigate("/journal");
    } catch (error) {
      console.error("Error saving entry:", error);
    }
  }

  async function getPrompt(entryText) {
    try {
      const response = await fetch(
        `http://localhost:5000/api/journals/prompt?entryText=${encodeURIComponent(entryText)}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch prompt");
      }
      const data = await response.json();
      console.log("Prompt Data:", data);
      return data;
    } catch (error) {
      console.error("Error fetching prompt:", error);
      return null;
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
      <main className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="w-full max-w-screen">
          <Routes>
            <Route path="/signin" element={<SignIn />} />
            {isSignedIn ? (
              <>
                <Route path="/history" element={<HistorySection entries={entries} />} />
                <Route
                  path="/home"
                  element={
                    <JournalSection
                      newEntry={newEntry}
                      setNewEntry={setNewEntry}
                      handleAddEntry={handleAddEntry}
                      aiResponses={aiResponses}
                      getPrompt={getPrompt}
                    />
                  }
                />
                <Route path="/settings" element={<SettingsSection userData={userData} />} />
                <Route path="/journal" element={<Journal aiResponses={aiResponses} hasAnimatedRef={hasAnimatedRef} />} />
                <Route path="*" element={<Navigate to="/home" replace />} />
              </>
            ) : (
              <Route path="*" element={<Navigate to="/signin" replace />} />
            )}
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
