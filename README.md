# iOS MCP Code Quality Server

A Model Context Protocol (MCP) server that provides comprehensive iOS code quality analysis and test automation capabilities. This server enables AI assistants to run Xcode tests, perform SwiftLint analysis, and provide detailed feedback on iOS projects through structured, actionable reports.

![License](https://img.shields.io/github/license/a-25/ios-mcp-code-quality-server)
![Tests](https://img.shields.io/github/actions/workflow/status/a-25/ios-mcp-code-quality-server/test.yml)
![Node Version](https://img.shields.io/node/v/ios-mcp-code-quality-server)

## Quick Start

Get up and running in minutes:

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The server will start on `http://localhost:3000` and be ready to receive MCP requests.

## Features

- **🧪 iOS Test Execution**: Run Xcode tests with detailed failure analysis
- **📱 Multiple Schemes Support**: Test different iOS project configurations  
- **🔍 SwiftLint Integration**: Automated Swift code style and quality checking
- **📊 Structured Reporting**: Clear, actionable feedback with file locations and line numbers
- **🛠 Build Error Detection**: Intelligent parsing of Xcode build failures
- **🔒 Local Processing**: All analysis happens on your machine for security
- **⚡ Fast Results**: Optimized for quick feedback cycles

## Installation

### Prerequisites

- **Node.js 18+**: Required for running the MCP server
- **Xcode**: For iOS project building and testing
- **iOS Simulator**: For running tests (or physical iOS device)
- **SwiftLint** (optional): For code quality analysis

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/a-25/ios-mcp-code-quality-server.git
   cd ios-mcp-code-quality-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

### AI Assistant Integration

Configure your AI assistant (Claude, Copilot, etc.) to use this MCP server:

```json
{
  "mcpServers": {
    "ios-code-quality": {
      "url": "http://localhost:3000",
      "timeout": 30000
    }
  }
}
```

## Configuration

The server supports several configuration options through environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `LOG_LEVEL` | Logging verbosity | `info` |

Example configuration:
```bash
export PORT=8080
export LOG_LEVEL=debug
npm start
```

## Tools & Capabilities

### Test Tool
Executes iOS tests and provides detailed failure analysis.

**Parameters:**
- `xcodeproj` (optional): Path to Xcode project file
- `xcworkspace` (optional): Path to Xcode workspace file  
- `scheme` (required): Xcode scheme to test
- `destination` (optional): Test destination (simulator/device)

**Example Response:**
```json
{
  "content": [
    {
      "type": "text", 
      "text": "✅ Tests completed successfully\n📊 Results: 15 passed, 2 failed\n\n❌ Failed Tests:\n- LoginViewModelTests.testInvalidCredentials (line 45)\n- NetworkManagerTests.testTimeout (line 78)"
    }
  ]
}
```

### Lint Tool
Performs SwiftLint analysis on your iOS project.

**Parameters:**
- `xcodeproj` (optional): Path to Xcode project file
- `xcworkspace` (optional): Path to Xcode workspace file

**Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "🔍 SwiftLint Analysis Complete\n\n⚠️ 3 warnings found:\n- Line too long (ViewController.swift:42)\n- Missing documentation (APIClient.swift:15)\n- Unused variable (Helper.swift:8)"
    }
  ]
}
```

## API Endpoints

### POST /
Main MCP endpoint for tool execution requests.

**Headers:**
- `mcp-session-id`: Optional session identifier
- `Content-Type`: `application/json`

**Request Body:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "test",
    "arguments": {
      "scheme": "MyApp",
      "destination": "platform=iOS Simulator,name=iPhone 15"
    }
  }
}
```

### GET /status
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "uptime": 1234567,
  "version": "0.1.0"
}
```

## Usage Examples

### Running Tests with AI Assistant

```
"Can you run the tests for the LoginFeature scheme and tell me what failed?"
```

The AI assistant will use the test tool to:
1. Execute tests for the specified scheme
2. Parse build and test results
3. Provide a structured summary of failures
4. Highlight specific files and line numbers that need attention

### Code Quality Analysis

```
"Please analyze the code quality of my iOS project using SwiftLint"
```

The AI assistant will:
1. Run SwiftLint analysis
2. Categorize issues by severity
3. Provide specific file locations and suggestions
4. Help prioritize fixes

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Assistant  │───▶│   MCP Server     │───▶│   Xcode Tools   │
│   (Claude, etc) │    │   (port 3000)    │    │   (xcodebuild)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                 │
                                 ▼
                       ┌──────────────────┐
                       │   SwiftLint      │
                       │   (optional)     │
                       └──────────────────┘
```

The server acts as a bridge between AI assistants and iOS development tools, providing a standardized interface for code quality operations.

## Troubleshooting

### Common Issues

**Server won't start:**
- Check that port 3000 is available: `lsof -i :3000`
- Ensure Node.js 18+ is installed: `node --version`
- Verify dependencies are installed: `npm list`

**Tests fail to run:**
- Ensure Xcode is installed and command line tools are available
- Check that the specified scheme exists in your project
- Verify the destination device/simulator is available: `xcrun simctl list devices`

**SwiftLint not working:**
- Install SwiftLint: `brew install swiftlint`
- Verify installation: `swiftlint version`

**MCP Connection Issues:**
- Verify the server is running: `curl http://localhost:3000/status`
- Check AI assistant MCP configuration
- Review server logs for connection errors

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
export LOG_LEVEL=debug
npm start
```

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check
```

### Building

```bash
# Development build
npm run build

# Production build
npm run build:prod
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to your branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Follow TypeScript best practices
- Update documentation for API changes
- Ensure backwards compatibility when possible

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

- All processing happens locally on your machine
- No data is sent to external services without explicit configuration
- Do not share your local server endpoint publicly
- Keep dependencies updated to address security vulnerabilities

## Support

- **Issues**: [GitHub Issues](https://github.com/a-25/ios-mcp-code-quality-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/a-25/ios-mcp-code-quality-server/discussions)
- **Documentation**: This README and inline code documentation

---

Made with ❤️ for the iOS development community