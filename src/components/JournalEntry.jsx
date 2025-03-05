import React from "react";

function JournalEntry({ newEntry, setNewEntry }) {
  return (
    <>
      {/* Textarea for journal entry input */}
      <textarea
        className="w-full h-40 p-3 bg-gray-100 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-shadow duration-200 resize-none mt-4"
        placeholder="What's on your mind..."
        value={newEntry}
        onChange={(e) => setNewEntry(e.target.value)}
      ></textarea>

      {/* Display character count and clear button */}
      <div className="flex items-center justify-between text-sm text-gray-500 mt-1">
        <span>{newEntry.length}/300</span>
        <button onClick={() => setNewEntry("")} className="text-blue-500 hover:underline">
          Clear
        </button>
      </div>
    </>
  );
}

export default JournalEntry;
