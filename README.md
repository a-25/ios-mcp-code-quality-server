# ios-mcp-code-quality-server

# MCP Server for iOS Code Quality (Local Deployment)

## Local Setup Instructions

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Start the server:**
   ```sh
   npm start
   # or
   node dist/index.js
   ```

3. **Configure your agent (e.g., Copilot):**
   - Set the MCP server endpoint to `http://localhost:3000` in the agent's settings.

4. **Run the agent as usual.**
   - The agent will delegate supported functions to your MCP server.

## Notes
- No cloud hosting required; all data stays on your machine.
- Make sure your MCP server is running before starting the agent.
- For troubleshooting, check logs in the terminal and ensure all required environment variables are set.

## Security
- Do not share your local MCP server endpoint or credentials.

## Supported Endpoints
- `/run-task` (POST): Run a code quality or test automation task.
- `/status` (GET): Check server status.

## Error Handling
- The server will log and return clear error messages for missing environment variables or failed requests.