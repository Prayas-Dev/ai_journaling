import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function HistorySection() {
  const [allEntries, setAllEntries] = useState([]); // Store all fetched entries
  const [entries, setEntries] = useState([]); // Store filtered entries
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("userData");
  const userData = storedUser ? JSON.parse(storedUser) : null;
  const userId = userData?.sub || userData?.id;

  useEffect(() => {
    if (!userId) {
      setError("User is not signed in.");
      setLoading(false);
      return;
    }

    const fetchEntries = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:5000/api/journals/all/${userId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch journal entries");
        }
        const data = await response.json();
        setAllEntries(data); // Store all fetched data
        setEntries(data); // Initially, show all entries
      } catch (err) {
        setError(err.message || "Error fetching entries");
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [userId]);

  // Filter entries based on search query
  useEffect(() => {
    if (query.trim() === '') {
      setEntries(allEntries); // Show all entries if search is empty
    } else {
      const filteredEntries = allEntries.filter((entry) =>
        entry.entry_text.toLowerCase().includes(query.toLowerCase())
      );
      setEntries(filteredEntries);
    }
  }, [query, allEntries]);

  const handleEntryClick = (journalId) => {
    navigate(`/journal/${journalId}`);
  };

  const handleDeleteEntry = async (journalId) => {
    if (!window.confirm("Are you sure you want to delete this journal entry?")) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/journals/${journalId}/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error("Failed to delete journal entry");
      }

      setAllEntries(allEntries.filter(entry => entry.journal_id !== journalId));
      setEntries(entries.filter(entry => entry.journal_id !== journalId));

      toast.success("Journal entry deleted successfully!", {
        position: 'top-right',
        autoClose: 2000,
      });
    } catch (err) {
      toast.error(err.message || "Failed to delete journal entry.", {
        position: 'top-right',
        autoClose: 3000,
      });
    }
  };

  return (
    <div className="p-4 m-4">
      <ToastContainer />
      <h2 className="text-2xl font-semibold mb-4">Journal History</h2>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search journals..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border p-2 rounded w-full"
          style={{ color: 'black' }}
        />
      </div>

      {/* Display Entries */}
      {loading ? (
        <p className="text-center text-neutral-500">Loading entries...</p>
      ) : error ? (
        <p className="text-center text-neutral-500">Error: {error}</p>
      ) : entries.length === 0 ? (
        <p className="text-center text-neutral-500">No journal entries found.</p>
      ) : (
        entries.map((entry) => (
          <div
            key={entry.journal_id}
            className="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm mb-4"
          >
            <div className="flex justify-between items-center">
              <div
                onClick={() => handleEntryClick(entry.journal_id)}
                className="cursor-pointer"
                style={{ flexGrow: 1 }}
              >
                <p className="text-sm text-neutral-500">
                  <strong>Date:</strong> {entry.entry_date}
                </p>
                <p className="mt-2">{entry.entry_text.substring(0, 100)}...</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteEntry(entry.journal_id);
                }}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-4"
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default HistorySection;
