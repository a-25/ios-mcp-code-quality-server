import fetch from "node-fetch";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export async function getAISuggestion(prompt: string): Promise<string> {
  console.log("[AI Suggestion Prompt]:", prompt);
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY env variable not set");
    return "[Error: OPENAI_API_KEY not set]";
  }
  return "";
  // // Uncomment below to use OpenAI
  // const openai = new OpenAI({
  //   apiKey: process.env.OPENAI_API_KEY,
  // });
  // const response = await openai.chat.completions.create({
  //   model: "gpt-4",
  //   messages: [
  //     { role: "system", content: "You are an expert in Swift/iOS development." },
  //     { role: "user", content: prompt },
  //   ],
  // });
  // return response.choices[0]?.message?.content || "";
}

export async function getCopilotAISuggestion(prompt: string): Promise<string> {
  console.log("[Copilot AI Suggestion Prompt]:", prompt);
  const endpoint = process.env.COPILOT_API_ENDPOINT;
  if (!endpoint) {
    console.error("COPILOT_API_ENDPOINT env variable not set");
    return "[Error: COPILOT_API_ENDPOINT not set]";
  }
  const copilotToken = process.env.COPILOT_API_TOKEN;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(copilotToken ? { "Authorization": `Bearer ${copilotToken}` } : {}),
      },
      body: JSON.stringify({
        prompt,
        system: "You are an expert in Swift/iOS development.",
      }),
    });
    if (!response.ok) {
      console.error(`Copilot AI request failed: ${response.statusText}`);
      return `[Error: Copilot AI request failed: ${response.statusText}]`;
    }
    const data = await response.json();
    return data.suggestion || data.result || data.content || "";
  } catch (err) {
    console.error("Copilot AI request error:", err);
    return `[Error: Copilot AI request error: ${err}]`;
  }
}