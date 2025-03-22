  import React from 'react';
  import ReactQuill, { Quill } from 'react-quill';
  import 'react-quill/dist/quill.snow.css';
  import { Send, FilePenLine } from 'lucide-react';
  // Import the markdown shortcuts plugin
  import QuillMarkdown from 'quill-markdown-shortcuts';

  // Register the plugin with Quill
  Quill.register('modules/markdownShortcuts', QuillMarkdown);

  function JournalSection({ newEntry, setNewEntry, handleAddEntry, getPrompt }) {
    // This function calls the endpoint to fetch a prompt using the current journal entry text.
    const displayPrompt = async () => {
      try {
        const tempEntry = newEntry;
        setNewEntry((prevEntry)=>prevEntry + "\n" + "AI is thinking...");
        const response = await fetch("http://localhost:5000/api/journals/prompt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ entryText: newEntry })
        });
        const data = await response.json();
        // Append the returned prompt to the existing journal entry
        setNewEntry((prevEntry) => tempEntry + "\n" + (data.prompt || "No prompt received."));
      } catch (error) {
        console.error("Error fetching prompt:", error);
      }
    };

    // This function calls the getPrompt prop with the current journal entry text.
    const handlePromptClick = () => {
      getPrompt(newEntry);
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100">
        <div className="
          w-full 
          sm:max-w-md   
          md:max-w-lg    
          lg:max-w-4xl   
          xl:max-w-5xl   
          min-h-[600px]  
          bg-white 
          p-8 
          rounded-xl 
          shadow-xl 
          flex 
          flex-col
        ">
          <h1 className="text-2m font-semibold text-left mb-4">
            Journal Entry for {new Date().toLocaleDateString()}
          </h1>
          
          {/* Input field */}
          <div className="rounded-lg overflow-hidden border border-gray-300">
            <ReactQuill
              value={newEntry}
              onChange={setNewEntry}
              modules={{
                toolbar: false,            // Disable the default toolbar
                markdownShortcuts: {}        // Enable markdown shortcuts
              }}
              theme="snow"
              style={{ height: '500px' }}   // Set editor height
              placeholder="What's on your mind?"
            />
          </div>

          {/* Button section */}
          <div className="mt-4 w-full flex justify-left gap-1">
            <button
              onClick={displayPrompt}
              className="
                w-32
                max-w-xs
                flex
                bg-gradient-to-r
                from-blue-500
                to-indigo-500
                text-white
                py-2
                px-4
                rounded-md
                text-sm
                shadow-md
                hover:shadow-lg
                transition-all
                duration-200
                items-center
                justify-center
                space-x-2
              "
            >
              <Send size={16} />
              <span>Prompt</span>
            </button>

            <button
              onClick={handlePromptClick}
              className="
                w-32
                max-w-xs
                flex
                bg-gradient-to-r
                from-blue-500
                to-indigo-500
                text-white
                py-2
                px-4
                rounded-md
                text-sm
                shadow-md
                hover:shadow-lg
                transition-all
                duration-200
                items-center
                justify-center
                space-x-2
              "
            >
              <FilePenLine size={16} />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  export default JournalSection;
