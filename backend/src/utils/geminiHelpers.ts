import dotenv from "dotenv";
const envResult = dotenv.config({ path: "../config/.env" });
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";
import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'path';

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);



export const getGeminiResponse = async (entry_text: string, mode: string, chatHistory: string): Promise<string> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment variables.");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Respond as a ${mode} therapist. Here is the chat history:\n${chatHistory}\nUser shares: "${entry_text}". Provide a response that aligns with the ${mode} approach while offering thoughtful and empathetic insights.Message length should be to the point but should be meaningful`
            }]
          }]
        }),
      }
    );

    if (!response.ok) throw new Error("Error from Gemini API");

    const data = await response.json();
    let aiReply: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm unable to generate a response right now.";

    // Clean up formatting in the response
    return aiReply.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1");
  } catch (error) {
    console.error("Error in getGeminiResponse:", error);
    throw error;
  }
};


export const generateEmbeddings = async (text: string): Promise<number[]> => {
    try {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text);
        return result.embedding.values; // Extracts the embedding array
    } catch (error) {
        console.error("Error generating embedding:", error);
        throw new Error("Failed to generate embedding");
    }
};

// Define valid emotions and mapping once
const validEmotions = [
  "admiration", "amusement", "anger", "annoyance", "approval", "caring",
  "confusion", "curiosity", "desire", "disappointment", "disapproval", "disgust",
  "embarrassment", "excitement", "fear", "gratitude", "grief", "joy",
  "love", "nervousness", "optimism", "pride", "realization", "relief",
  "remorse", "sadness", "surprise", "neutral"
];

const emotionMap: { [key: string]: string } = {
  uncertainty: "confusion",
  // add more mappings as needed
};

const getValidEmotion = (emotion: string): string => {
  if (validEmotions.includes(emotion)) {
    return emotion;
  } else if (emotionMap[emotion]) {
    return emotionMap[emotion];
  } else {
    return "neutral";
  }
};

const getJsonString = async (responseText: string): Promise<string> => {
  const jsonStart = responseText.indexOf("{");
  const jsonEnd = responseText.lastIndexOf("}");

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    return responseText.substring(jsonStart, jsonEnd + 1);
  } else {
    console.error("No JSON object found in the response text.");
    console.error("Response Text:", responseText);
    return "error";
  }
};

export const analyzeEmotions = async (entryText: string): Promise<{ emotion: string; emoji: string }[]> => {
  const prompt = `
Given the following journal entry, identify and classify the top 5 emotions strictly from this predefined list of 28 emotions in the GoEmotions dataset: ${validEmotions.join(", ")}.

🚨 **IMPORTANT**:
  - Return only emotions from the provided list.
  - If an emotion doesn't match exactly, use the closest valid emotion (e.g., "uncertainty" -> "confusion").
  - If completely uncertain, default to **"neutral"**.

Return the output in the following JSON format without any extra text or explanations:

\`\`\`json
{
  "emotions": [
    [emotion1, emoji1],
    [emotion2, emoji2],
    [emotion3, emoji3],
    [emotion4, emoji4],
    [emotion5, emoji5]
  ]
}
\`\`\`

Journal Entry:
${entryText}
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    const jsonString = await getJsonString(responseText);

    if (jsonString === "error") {
      throw new Error("Failed to extract JSON from response.");
    }

    const parsedData = JSON.parse(jsonString);
    const emotionsMap = new Map<string, string>();

    parsedData.emotions.forEach(([emotion, emoji]: [string, string]) => {
      const validEmotion = getValidEmotion(emotion);
      // If the emotion already exists, we can choose to overwrite or keep the first emoji.
      emotionsMap.set(validEmotion, emoji);
    });

    return Array.from(emotionsMap, ([emotion, emoji]) => ({ emotion, emoji }));
  } catch (error) {
    console.error("Error in emotion analysis:", error);
    return [];
  }
};


export const emotionAnalysisAndGeneratePrompt = async (
  entryText: string
): Promise<{ emotions: string[]; geminiPrompt: string }> => {
  let prompt = `
Given below is a journal entry. Identify and classify the top 5 emotions strictly from this predefined list of 28 emotions in the GoEmotions dataset: 
${validEmotions.join(", ")}.

🚨 **IMPORTANT**:
  - You MUST return emotions **only** from this list.
  - If an emotion doesn't match exactly, use the closest valid emotion (e.g., "uncertainty" -> "confusion").
  - If completely uncertain, default to **"neutral"**.

Return the output in the following JSON format without any additional text or explanations:

\`\`\`json
{
  "emotions": [
    [emotion1, percentage1], 
    [emotion2, percentage2], 
    [emotion3, percentage3], 
    [emotion4, percentage4], 
    [emotion5, percentage5]
  ],
  "prompt": "A short question to help the user explore their emotions further, tailored to the detected emotions."
}
\`\`\`
  
- Emotions are **only** from the provided list.
- The 'prompt' is insightful and relevant to the identified emotions.
- Do not include any extra text, explanations, or conversational elements.
`;

  // Append the journal entry
  prompt += "\nJournal Entry:\n" + entryText;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    const jsonString = await getJsonString(responseText);

    if (jsonString === "error") {
      throw new Error("Failed to extract JSON from response.");
    }

    const parsedData = JSON.parse(jsonString);
    const emotions = parsedData.emotions.map(
      ([emotion]: [string, number]) => getValidEmotion(emotion)
    );
    const geminiPrompt = parsedData.prompt;

    return { emotions, geminiPrompt };
  } catch (error) {
    console.error("Error in emotion analysis:", error);
    return {
      emotions: [],
      geminiPrompt: "Could not generate a prompt due to an error."
    };
  }
};


export const generateGeminiPrompt = async (entryText: string): Promise<string> => {
  const prompt = `
Given the following journal entry, generate a short, insightful question that helps the user explore their emotions further.
Return the output in the following JSON format without any extra text or explanations:

\`\`\`json
{
  "prompt": "Your question here."
}
\`\`\`

Journal Entry:
${entryText}
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    const jsonString = await getJsonString(responseText);

    if (jsonString === "error") {
      throw new Error("Failed to extract JSON from response.");
    }

    const parsedData = JSON.parse(jsonString);
    const geminiPrompt = parsedData.prompt;
    return geminiPrompt;
  } catch (error) {
    console.error("Error in generating prompt:", error);
    return "Could not generate a prompt due to an error.";
  }
};

const newGenAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // Initialize the new client
export const generateImageFromJournalEntry = async (entryText: string, journalId?: string): Promise<string | null> => {
  try {
    // Step 1: Generate a concise image prompt from the journal entry
    const imagePromptResult =`
Create a vivid and imaginative image prompt based on the following journal entry: "${entryText}". Focus on the core feelings and imagery described. Be specific with details about the scene, objects, and atmosphere you envision. **Render this in a fantastical style that remains grounded in a sense of reality, where the extraordinary feels subtly integrated into the ordinary world.**

**Think about how fantastical elements might appear within a realistic setting.** Instead of a completely different world, imagine our world with a touch of the unbelievable.

**Consider incorporating:**

* **Subtle fantastical elements:** Perhaps everyday objects have unusual properties, or there are hints of magic in the environment that aren't overtly pronounced.
* **Unexplained phenomena:** Things that seem impossible but are presented as a natural part of the scene.
* **Characters with unique or slightly enhanced abilities that still feel human.**
* **Landscapes that are familiar but with a fantastical twist:** A forest that glows faintly at night, a city with buildings that defy gravity in subtle ways, etc.
* **A dreamlike or surreal quality that still feels connected to the real world.**

**The key is to create a sense of wonder and the fantastical without completely abandoning the familiar.** The magic or extraordinary elements should feel like they could plausibly exist within the reality of the scene, adding a layer of enchantment or mystery without becoming pure fantasy.

**Focus on the emotional impact of this blended reality.** How do the fantastical elements enhance the feelings or themes of your journal entry within a recognizable world?
`
    // Step 2: Generate the image using the new library
    const Promptresponse = await newGenAI.models.generateContent({
      model: "gemini-2.0-flash-exp-image-generation",
      contents: imagePromptResult,
      config: {
        responseModalities: ["Text"], // Request both image and text just in case
      },
    });

    let imagePrompt;

    if (Promptresponse.candidates && Promptresponse.candidates.length > 0 && Promptresponse.candidates[0].content && Promptresponse.candidates[0].content.parts) {
      for (const part of Promptresponse.candidates[0].content.parts) {
        // Based on the part type, either log text or save the image
        if (part.text) {
        imagePrompt = part.text;
        }
      }
    }

    console.log(imagePrompt);

    const response = await newGenAI.models.generateContent({
      model: "gemini-2.0-flash-exp-image-generation",
      contents: imagePrompt || "",
      config: {
        responseModalities: [ "Text","Image"] // Request both image and text just in case
      },
    });

    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          const base64ImageData = part.inlineData.data;
          // console.log(base64ImageData);
          if (base64ImageData) {
            const imageName = journalId ? `${journalId}.png` : `temp_image_${Date.now()}.png`; // Use journalId if available, otherwise a temporary name
            const imagesFolderPath = path.join(__dirname, '../../../images'); // Assuming 'images' folder is at the root
            await mkdir(imagesFolderPath, { recursive: true }); // Use the explicitly imported mkdir
            const imagePathOnServer = path.join(imagesFolderPath, imageName);
            const buffer = Buffer.from(base64ImageData, 'base64');
            await writeFile(imagePathOnServer, buffer); // Use the explicitly imported writeFile

            const relativeImagePath = `/images/${imageName}`;
            console.log("Image saved to:", imagePathOnServer);
            return relativeImagePath; // Return the relative path to the saved image
          }
        }
      }
    }

    console.warn("No image data found in the response");
    return null;

  } catch (error) {
    console.error("Error in generateImageFromJournalEntry:", error);
    return null;
  }
};
