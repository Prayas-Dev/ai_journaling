import React from "react";
import { Send } from "lucide-react";

function JournalSection({ newEntry, setNewEntry, handleAddEntry }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100">
      <div className="w-full sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl h-auto bg-white p-8 rounded-xl shadow-xl transition-all duration-500 transform hover:scale-105 flex flex-col">
        <h1 className="text-2xl font-semibold text-center mb-4">Your Journal</h1>
        
        {/* Input field */}
        <textarea
          value={newEntry}
          onChange={(e) => setNewEntry(e.target.value)}
          placeholder="Write your thoughts here..."
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
          rows="4"
        />

        {/* Send button */}
        <div className="mt-4 w-full flex justify-center">
          <button
            onClick={handleAddEntry}
            className="w-full max-w-xs flex bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 px-6 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 items-center justify-center space-x-2"
          >
            <Send size={20} />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default JournalSection;
