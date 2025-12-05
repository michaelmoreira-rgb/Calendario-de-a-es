import { GoogleGenAI } from "@google/genai";
import { Project } from "../types";

// Note: In a real production app, API calls should go through your backend
// to protect the API key. For this demo, we use it client-side.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeProjects = async (projects: Project[]): Promise<string> => {
  try {
    const prompt = `
      Analyze the following project data and provide a brief, 2-sentence executive summary 
      focusing on budget allocation and status risks.
      
      Data: ${JSON.stringify(projects)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate AI insights at this time.";
  }
};