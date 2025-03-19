// src/HistorySection.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";

function HistorySection() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  // Retrieve user data from localStorage
  const storedUser = localStorage.getItem("userData");
  const userData = storedUser ? JSON.parse(storedUser) : null;
  // Use either "sub" or "id" from the token payload
  const userId = userData?.sub || userData?.id;

  useEffect(() => {
    if (!userId) {
      setError("User is not signed in.");
      setLoading(false);
      return;
    }
    const fetchEntries = async () => {
      setLoading(true);
      try {
        let url = '';
        if (query.trim() === '') {
          // No query: fetch all journal entries
          url = `http://localhost:5000/api/journals/all/${userId}`;
        } else {
          // With query: fetch filtered results
          url = `http://localhost:5000/api/journals/search/${userId}?query=${encodeURIComponent(query)}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch journal entries");
        }
        const data = await response.json();
        setEntries(data);
      } catch (err) {
        setError(err.message || "Error fetching entries");
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [userId, query]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">Journal History</h2>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search journals..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>

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
            onClick={() => navigate(`/journal/details/${entry.journal_id}`)}
            className="cursor-pointer p-4 bg-white border border-neutral-200 rounded-lg shadow-sm mb-4 hover:bg-neutral-100"
          >
            <p className="text-sm text-neutral-500">
              <strong>Date:</strong> {entry.entry_date}
            </p>
            <p className="mt-2">{entry.entry_text}</p>
          </div>
        ))
      )}
    </div>
  );
}

export default HistorySection;
