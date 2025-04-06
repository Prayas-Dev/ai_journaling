import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function HistorySection() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true); // Set default loading to true
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
        let url = `http://localhost:5000/api/journals/all/${userId}`; // Updated route for fetching all
        if (query.trim() !== '') {
          url = `http://localhost:5000/api/journals/search/${userId}?query=${encodeURIComponent(query)}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch journal entries");
        }
        const data = await response.json();
        console.log(data);
        setEntries(data);
      } catch (err) {
        setError(err.message || "");
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [userId, query]);

  const handleEntryClick = (journalId) => {
    console.log("Clicked journal ID:", journalId);
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

      setEntries(entries.filter(entry => entry.journal_id !== journalId));
      toast.success("Journal entry deleted successfully!", {
        position: 'top-right',
        autoClose: 2000,
      });
    } catch (err) {
      console.error("Error deleting journal entry:", err);
      toast.error(err.message || "Failed to delete journal entry.", {
        position: 'top-right',
        autoClose: 3000,
      });
    }
  };

  return (
    <div className="p-4">
      <ToastContainer />
      <h2 className="text-2xl font-semibold mb-4">Journal History</h2>

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

      {loading ? (
        <p className="text-center text-neutral-500">Loading entries...</p>
      ) : error ? (
        <p className="text-center text-neutral-500">Error: {error}</p>
      ) : entries.length === 0 ? (
        <p className="text-center text-neutral-500">No journal entries found.</p>
      ) : (
        <div className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
          {entries.map((entry) => (
            <div
              key={entry.journal_id}
              className="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm mb-4"
            >
              <div className="flex justify-between items-center">
                <div
                  onClick={() => handleEntryClick(entry.journal_id)}
                  className="cursor-pointer"
                  style={{ flexGrow: 1 }} // Allow text to take up available space
                >
                  <p className="text-sm text-neutral-500">
                    <strong>Date:</strong> {entry.entry_date}
                  </p>
                  <p className="mt-2">{entry.entry_text.substring(0, 100)}...</p> {/* Show a preview */}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent handleEntryClick from being called
                    handleDeleteEntry(entry.journal_id);
                  }}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-4"
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HistorySection;
