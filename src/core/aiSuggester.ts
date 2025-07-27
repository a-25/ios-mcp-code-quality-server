import OpenAI from "openai";

export async function getAISuggestion(prompt: string): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are an expert in Swift/iOS development." },
      { role: "user", content: prompt },
    ],
  });

  return response.choices[0]?.message?.content || "";
}

