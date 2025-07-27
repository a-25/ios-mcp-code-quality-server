import OpenAI from "openai";

export async function getAISuggestion(prompt: string): Promise<string> {
  // Stub: apply your AI suggestion logic here
  console.log("[AI Suggestion Prompt]:", prompt);
  return ""; // Replace with actual AI response

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

