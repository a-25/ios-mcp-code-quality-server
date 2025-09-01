# iOS MCP Code Quality Server

A Model Context Protocol (MCP) server that provides comprehensive iOS code quality analysis and test automation capabilities. This server enables AI assistants to run Xcode tests, perform linter analysis, and provide detailed feedback on iOS projects through structured, actionable reports.

![License](https://img.shields.io/github/license/a-25/ios-mcp-code-quality-server)
![Tests](https://img.shields.io/github/actions/workflow/status/a-25/ios-mcp-code-quality-server/test.yml)
![Node Version](https://img.shields.io/node/v/ios-mcp-code-quality-server)

## Quick Start

Get up and running in minutes:

```bash
# Download the latest release zip from https://github.com/a-25/ios-mcp-code-quality-server/releases
unzip <release-artifact>.zip
cd <release-artifact>
node dist/index.js
```

The server will start on `http://localhost:3000` and be ready to receive MCP requests.

## Features

- **🧪 iOS Test Execution**: Run Xcode tests with detailed failure analysis
- **📱 Multiple Schemes Support**: Test different iOS project configurations  
- **🔍 SwiftLint Integration**: Automated Swift code style and quality checking
- **📊 Structured Reporting**: Clear, actionable feedback with file locations and line numbers
- **🛠 Build Error Detection**: Intelligent parsing of Xcode build failures
- **🔒 Local Processing**: All analysis happens on your machine for security

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

### Configuration

Environment variables (with defaults):

```bash
# Server Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# MCP Server Identity
MCP_SERVER_NAME=ios-mcp-code-quality-server
MCP_SERVER_VERSION=0.1.0

# Security Settings
ALLOWED_HOSTS=127.0.0.1,localhost,127.0.0.1:3000,localhost:3000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Performance Settings
SESSION_CLEANUP_INTERVAL_MS=300000
MAX_CONCURRENT_TASKS=5
```

## Tools & Capabilities

### Test Tool
Executes iOS tests and provides detailed failure analysis with support for running specific tests.

**Parameters:**
- `xcodeproj` (optional): Path to Xcode project file
- `xcworkspace` (optional): Path to Xcode workspace file
- **Note**: Either `xcodeproj` or `xcworkspace` parameter is mandatory (at least one must be provided)
- `scheme` (required): Xcode scheme to test
- `destination` (optional): Test destination (simulator/device)
  - Default value: `generic/platform=iOS Simulator`
- `tests` (optional): Array of specific test names to run
  - Format: `['MyTarget/TestClass/testMethod', 'MyTarget/TestClass']`
  - Examples: `['MyAppTests/LoginTests/testValidLogin', 'MyAppUITests/HomeScreenTests']`
- `target` (optional): Target parameter for test execution context
  - Can be used to specify different test environments or configurations

**Example Responses:**

**Success Case (all tests passed):**
```json
{
  "content": [
    {
      "type": "text", 
      "text": "✅ All tests passed."
    }
  ]
}
```

**Build Errors Case (compilation issues):**
```json
{
  "content": [
    {
      "type": "text", 
      "text": "❌ Build failed. Please provide the code for the failing test and the class/function under test for better AI suggestions."
    }
  ]
}
```

**Test Errors Case (tests built but failed):**
```json
{
  "content": [
    {
      "type": "text", 
      "text": "❌ Test failed. Please provide the code for the failing test and the class/function under test for better AI suggestions."
    }
  ]
}
```

### List Tests Tool
Discovers and lists all available tests in the iOS project.

**Parameters:**
- `xcodeproj` (optional): Path to Xcode project file
- `xcworkspace` (optional): Path to Xcode workspace file
- **Note**: Either `xcodeproj` or `xcworkspace` parameter is mandatory (at least one must be provided)
- `scheme` (optional): Xcode scheme to analyze
- `destination` (optional): Test destination (simulator/device)

### Lint Tool
Performs lint analysis on your iOS project. Currently supported linters: [SwiftLint](https://github.com/realm/SwiftLint)

## Usage Examples

### Running Tests with AI Assistant

```
"Can you run the tests for the LoginFeature scheme and tell me what failed?"
```

```
"Run only the LoginTests for the MyApp scheme"
```

```
"List all available tests in my project and then run the failing ones"
```

The AI assistant will use the enhanced test tools to:
1. Discover available tests using the list-tests tool
2. Execute specific tests or all tests for the specified scheme
3. Validate test names and provide suggestions for typos
4. Parse build and test results with detailed failure analysis
5. Provide structured summaries of failures with file locations and line numbers

### Code Quality Analysis

```
"Please analyze the code quality of my iOS project using SwiftLint"
```

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
- Verify the server is running: check that the process is active on port 3000 with `lsof -i :3000`
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
npm run build
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