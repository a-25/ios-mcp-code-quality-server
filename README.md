# ios-mcp-code-quality-server

# MCP Server for iOS Code Quality (Local Deployment)

## Local Setup Instructions

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Set environment variables:**
   Create a `.env` file in the project root or export variables in your shell. Example:
   ```sh
   export OPENAI_API_KEY=sk-xxx
   export COPILOT_API_ENDPOINT=http://localhost:8000/copilot/ai
   export COPILOT_API_TOKEN=your-token
   export PORT=3000
   ```
   Or create a `.env` file:
   ```
   OPENAI_API_KEY=sk-xxx
   COPILOT_API_ENDPOINT=http://localhost:8000/copilot/ai
   COPILOT_API_TOKEN=your-token
   PORT=3000
   ```

3. **Start the server:**
   ```sh
   npm start
   # or
   node dist/index.js
   ```

4. **Configure your agent (e.g., Copilot):**
   - Set the MCP server endpoint to `http://localhost:3000` in the agent's settings.

5. **Run the agent as usual.**
   - The agent will delegate supported functions to your MCP server.

## Notes
- All API keys and tokens are provided by the end user and used locally.
- No cloud hosting required; all data stays on your machine.
- Make sure your MCP server is running before starting the agent.
- For troubleshooting, check logs in the terminal and ensure all required environment variables are set.

## Security
- Keep your API keys and tokens private.
- Do not share your local MCP server endpoint or credentials.

## Supported Endpoints
- `/run-task` (POST): Run a code quality or test automation task.
- `/status` (GET): Check server status.

## Error Handling
- The server will log and return clear error messages for missing environment variables or failed requests.
- If an API key or endpoint is missing, the server will not start or will return an error.

## Example `.env` file
```
OPENAI_API_KEY=sk-xxx
COPILOT_API_ENDPOINT=http://localhost:8000/copilot/ai
COPILOT_API_TOKEN=your-token
PORT=3000
```