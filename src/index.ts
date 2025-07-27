import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

if (!process.env.OPENAI_API_KEY) {
  console.error("[MCP] ERROR: OPENAI_API_KEY is missing. Please set it in your .env file.");
  process.exit(1);
}

import { startMcpServer } from "./mcpServer.js";

async function main() {
  console.log("[MCP] Server started");
  startMcpServer(3000);
}

main().catch(console.error);

