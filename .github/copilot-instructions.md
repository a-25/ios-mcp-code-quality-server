# iOS MCP Code Quality Server

**ALWAYS FOLLOW THESE INSTRUCTIONS FIRST.** Only use additional search and context gathering if the information here is incomplete or found to be in error.

This is a Node.js TypeScript MCP (Model Context Protocol) server that provides iOS code quality analysis tools including test running and SwiftLint integration. The server exposes test and lint tools via the MCP protocol for integration with AI coding agents.

## Working Effectively

### Bootstrap and Build (Required First Steps)
```bash
npm install                                    # Takes ~2 seconds
tsc -p tsconfig.build.json --noEmit false     # Takes ~2 seconds
```

### Start the MCP Server
```bash
npm start
# OR run directly:
node dist/index.js
```
Server starts on port 3000 and provides MCP protocol endpoints at `http://localhost:3000/`.

### Run Tests
```bash
npm test                                       # Takes ~1 second. All 19 tests should pass.
```

### Linting (Currently Broken)
```bash
npm run lint                                   # FAILS: ESLint config missing
```
Do NOT try to fix the linting - it fails due to missing ESLint configuration file.

## iOS Development Dependencies (CRITICAL LIMITATIONS)

This server is designed to work with iOS development tools that are ONLY available on macOS:

### Required but NOT Available in Linux/CI Environments:
- **Xcode Command Line Tools**: `xcodebuild`, `xcrun`, `xcresulttool`
- **SwiftLint**: For Swift code linting and auto-correction
- **macOS**: iOS development tools only work on macOS

### What Works Without iOS Tools:
- Build and start the MCP server
- Run the test suite (uses mocked data)
- Basic server functionality

### What Does NOT Work Without iOS Tools:
- Actual iOS project testing via `xcodebuild test`
- SwiftLint code analysis
- Real iOS code quality analysis

## Timing and Cancellation Warnings

- **Build**: TypeScript compilation takes ~2 seconds - no special timeout needed
- **Tests**: Complete test suite runs in ~1 second - no special timeout needed
- **Install**: Dependencies install in ~2 seconds - no special timeout needed
- **Server Start**: Server starts immediately after build completes

All build/test operations in this project are FAST. No long timeout warnings needed.

## Validation and Testing

### Automated Testing
```bash
npm test
```
Runs 19 tests that should all pass. Tests use mocked data to simulate iOS tool interactions.

### Manual Server Validation
1. Start the server: `npm start`
2. Test MCP endpoint: `curl -s http://localhost:3000/` 
   - Should return: "Invalid or missing session ID" (this is correct - needs proper MCP client)
3. Verify it's NOT a REST API: `curl -s http://localhost:3000/status` 
   - Should return HTML error (this is correct - MCP protocol only)

### Complete End-to-End Validation (Requires macOS + Xcode)
To fully validate iOS functionality, you need:
1. macOS with Xcode and command line tools installed
2. SwiftLint installed (`brew install swiftlint`)
3. An iOS project with `.xcodeproj` or `.xcworkspace`
4. MCP protocol client to test the endpoints

Example MCP tool usage (requires proper MCP client):
```json
{
  "tool": "test",
  "input": {
    "xcworkspace": "/path/to/project.xcworkspace",
    "scheme": "MyAppTests",
    "destination": "platform=iOS Simulator,name=iPhone 15"
  }
}
```

### Changes Validation Steps
Always run these steps after making changes:
1. `npm test` - ensure all tests still pass
2. `tsc -p tsconfig.build.json --noEmit false` - ensure TypeScript compiles
3. `npm start` - ensure server starts successfully
4. `curl -s http://localhost:3000/` - ensure MCP endpoint responds

## Project Structure and Key Files

### Repository Root
```
.
├── README.md              # Basic setup instructions
├── LICENSE                # MIT license
├── package.json           # Dependencies and npm scripts
├── package-lock.json      # Dependency lock file
├── tsconfig.json          # TypeScript configuration
├── tsconfig.build.json    # Build-specific TypeScript config
├── vitest.config.ts       # Vitest test configuration
├── jest.config.*          # Empty Jest config files (unused)
├── .gitignore             # Git ignore rules
├── src/                   # TypeScript source code
├── dist/                  # Compiled JavaScript output (created after build)
├── node_modules/          # npm dependencies (created after npm install)
├── .mcp-artifacts/        # Test run artifacts (created during tests)
└── .github/               # GitHub configuration
    └── copilot-instructions.md
```

### Source Code Structure
```
src/
├── index.ts              # Main MCP server entry point
├── core/                 # Core functionality
│   ├── taskOrchestrator.ts    # Task coordination logic
│   ├── testRunner.ts          # iOS test execution (requires xcodebuild)
│   ├── swiftLint.ts           # SwiftLint integration (requires swiftlint)
│   ├── taskOptions.ts         # Input validation
│   └── formatTestResultResponse.ts # Response formatting
├── __tests__/            # Test files
└── utils/                # Utility functions
```

### Key Commands Reference
```bash
# Development workflow
npm install                                    # Install dependencies
npm test                                       # Run test suite
npm start                                      # Build and start server
node dist/index.js                            # Run server directly

# Manual build steps
tsc -p tsconfig.build.json --noEmit false     # Compile TypeScript
```

## Common Issues and Solutions

### "Cannot GET /status" or "Cannot POST /run-task"
This is EXPECTED behavior. The server uses MCP protocol, not REST API. Only `/` endpoint exists for MCP communication.

### "SwiftLint not found" or "xcodebuild not found"  
Expected on non-macOS systems. The server will start but iOS-specific functionality won't work.

### "ESLint couldn't find a configuration file"
Known issue - ESLint configuration is missing. Do not attempt to fix this.

### MCP Client Integration
This server requires an MCP protocol client (like Claude with MCP support) to use the `test` and `lint` tools. It's not a standard REST API.

## Development Notes

- All iOS-specific functionality is mocked in tests
- Server architecture supports adding new tools via MCP protocol
- Error handling includes specific cases for missing iOS tools
- Build artifacts are stored in `.mcp-artifacts/` during test runs
- TypeScript strict mode is enabled - maintain type safety