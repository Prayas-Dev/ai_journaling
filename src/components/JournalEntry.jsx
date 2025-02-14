import React from "react";

function JournalEntry({ newEntry, setNewEntry, handleAddEntry }) {
  return (
    <>
      <textarea
        className="w-full h-40 p-3 bg-gray-100 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-shadow duration-200 resize-none mt-4"
        placeholder="What's on your mind..."
        value={newEntry}
        onChange={(e) => setNewEntry(e.target.value)}
      ></textarea>
      <div className="flex items-center justify-between text-sm text-gray-500 mt-1">
        <span>{newEntry.length}/300</span>
        <button onClick={() => setNewEntry("")} className="text-blue-500 hover:underline">
          Clear
        </button>
      </div>
      {/* <button
        onClick={handleAddEntry}
        className="w-full max-w-xs mx-auto flex bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 px-6 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 items-center justify-center space-x-2 group mt-20"
      >
        <span>Send</span>
      </button> */}
    </>
  );
}

export default JournalEntry;
