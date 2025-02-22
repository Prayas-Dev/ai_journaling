import React, { useEffect, useState } from 'react';

function HistorySection() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch journal entries from the backend
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/journal-entries");
        const data = await response.json();
        setEntries(data);
      } catch (error) {
        console.error("Error fetching journal entries:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, []);

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-center text-neutral-500">Loading entries...</p>
      ) : entries.length === 0 ? (
        <p className="text-center text-neutral-500">No journal entries yet.</p>
      ) : (
        entries.map((entry) => (
          <div key={entry.id} className="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm">
            <p className="text-sm text-neutral-500">
              {new Date(entry.created_at).toLocaleString()}
            </p>
            <p className="mt-2">{entry.entry_text}</p>
          </div>
        ))
      )}
    </div>
  );
}

export default HistorySection;
