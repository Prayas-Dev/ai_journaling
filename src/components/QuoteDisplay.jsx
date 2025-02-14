import React, { useEffect, useState } from "react";

function QuoteDisplay() {
  const [quote, setQuote] = useState("Loading...");
  const [author, setAuthor] = useState("");

  useEffect(() => {
    fetch(`https://api.allorigins.win/get?url=${encodeURIComponent("https://zenquotes.io/api/random?timestamp=" + new Date().getTime())}`)
  .then(response => response.json())
  .then(data => {
    const parsedData = JSON.parse(data.contents); // Parse the response
    setQuote(parsedData[0].q);
    setAuthor(parsedData[0].a);
  })
  .catch(error => {
    console.error("Error fetching quote:", error);
    setQuote("Stay strong! Even APIs fail sometimes. 😅");
  });


  }, []);

  return (
    <div className="text-center mb-6">
      <blockquote className="text-lg italic text-gray-700">
        "{quote}"
      </blockquote>
      <p className="text-sm text-gray-500 mt-2">— {author}</p>
    </div>
  );
}

export default QuoteDisplay;
