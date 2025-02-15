import React, { useState } from "react";
import { History, BookOpen, Settings, Menu } from "lucide-react";
import { Routes, Route, Navigate } from "react-router-dom"; // Removed Router from here
import NavItem from "./components/NavItem";
import HistorySection from "./components/HistorySection";
import JournalSection from "./components/JournalSection";
import SettingsSection from "./components/SettingSection";
import { v4 as uuidv4 } from "uuid";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [entries, setEntries] = useState([]); // Entries will be managed by PostgreSQL later
  const [newEntry, setNewEntry] = useState("");

  function handleAddEntry() {
    if (!newEntry.trim()) return;

    const newEntryObj = {
      id: uuidv4(),
      date: new Date().toISOString().split("T")[0],
      content: newEntry,
    };

    setEntries([newEntryObj, ...entries]); // For now, update state. Will interact with PostgreSQL later
    setNewEntry("");
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
        <NavItem icon={BookOpen} label="Journal" to="/journal" />
        <NavItem icon={Settings} label="Settings" to="/settings" />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 w-full">
        <div className="w-full max-w-screen">
          <Routes>
            <Route path="/history" element={<HistorySection entries={entries} />} />
            <Route
              path="/journal"
              element={
                <JournalSection
                  newEntry={newEntry}
                  setNewEntry={setNewEntry}
                  handleAddEntry={handleAddEntry}
                />
              }
            />
            <Route path="/settings" element={<SettingsSection />} />
            <Route path="*" element={<Navigate to="/journal" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
