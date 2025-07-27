import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

if (!process.env.OPENAI_API_KEY) {
  console.error("[MCP] ERROR: OPENAI_API_KEY is missing. Please set it in your .env file.");
  process.exit(1);
}

import { orchestrateTask } from "./core/taskOrchestrator.js";

async function main() {
  console.log("[MCP] Server started");
  await orchestrateTask();
}

main().catch(console.error);

