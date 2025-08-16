# ios-mcp-code-quality-server

A high-quality Model Context Protocol (MCP) server for iOS code quality analysis, implementing MCP best practices for security, performance, and reliability.

## Overview

This MCP server provides comprehensive iOS code quality tools including:
- **Test execution** with detailed failure reporting and AI-driven suggestions
- **SwiftLint integration** for code style and quality analysis
- **Comprehensive error handling** with proper MCP error codes
- **Security features** including rate limiting and input validation
- **Health monitoring** with detailed system checks
- **Structured logging** for debugging and monitoring

## MCP Best Practices Implementation

### ✅ Security Features
- **Rate limiting** to prevent abuse (configurable)
- **Input validation** using Zod schemas
- **Security headers** (CSP, X-Frame-Options, etc.)
- **DNS rebinding protection** with configurable allowed hosts
- **Structured error handling** with proper MCP error codes
- **Session management** with automatic cleanup

### ✅ Protocol Compliance
- Full MCP protocol support using official SDK
- Proper JSON-RPC 2.0 error responses
- Session-based connection management
- Graceful connection handling and cleanup

### ✅ Tools Implementation
- **test** - Execute iOS tests with comprehensive reporting
- **lint** - Run SwiftLint with detailed analysis
- Enhanced error handling with timeout support
- Input validation and sanitization

### ✅ Advanced Features
- **Health checks** - `/health` endpoint with system status
- **Structured logging** - Configurable log levels and formats
- **Environment-based configuration** - Flexible deployment options
- **Graceful shutdown** - Proper cleanup on termination
- **Progress reporting** - Detailed task execution tracking

### 🚧 Future Enhancements (Planned)
- **Resources** - Access to project files and reports
- **Prompts** - Pre-built prompts for code review and analysis
- **Sampling** - AI model integration for advanced features
- **Caching** - Performance optimization for repeated operations

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the server:**
   ```bash
   npm run build
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Configure your MCP client:**
   Set the server endpoint to `http://localhost:3000`

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

## API Reference

### Tools

#### `test` - Run iOS Tests
Execute iOS tests and get detailed failure analysis.

**Parameters:**
- `xcodeproj` (optional): Path to Xcode project
- `xcworkspace` (optional): Path to Xcode workspace  
- `scheme` (optional): Build scheme to use
- `destination` (optional): Test destination (simulator/device)

**Response:**
- Success: Detailed test results with pass/fail counts
- Failure: Error analysis with suggestions

#### `lint` - Run SwiftLint
Analyze code quality using SwiftLint.

**Parameters:**
- `xcodeproj` (optional): Path to Xcode project
- `xcworkspace` (optional): Path to Xcode workspace
- `path` (optional): Path to analyze (defaults to ./Sources)

**Response:**
- Linting results with violations and fixes applied

### Endpoints

#### `GET /health`
System health check with detailed status information.

**Response:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 12345,
  "version": "0.1.0",
  "checks": {
    "memory": { "status": "pass", "message": "Memory usage: 0.45%" },
    "filesystem": { "status": "pass", "message": "File system access OK" },
    "configuration": { "status": "pass", "message": "Configuration OK" }
  }
}
```

## Architecture

### Core Components

- **Server Core** (`src/index.ts`) - Main MCP server with Express integration
- **Task Orchestrator** (`src/core/taskOrchestrator.ts`) - Manages test and lint operations
- **Security Middleware** (`src/middleware/security.ts`) - Rate limiting and security headers
- **Error Handling** (`src/utils/errorHandling.ts`) - MCP-compliant error management
- **Health System** (`src/utils/health.ts`) - System monitoring and health checks
- **Structured Logging** (`src/utils/logger.ts`) - Configurable logging system

### Security Architecture

1. **Input Layer**: Zod validation and sanitization
2. **Rate Limiting**: Per-client request limiting
3. **Transport Security**: DNS rebinding protection
4. **Session Management**: Automatic cleanup and isolation
5. **Error Handling**: Safe error exposure without information leakage

### Performance Features

- **Concurrent Task Management**: Queue-based task execution
- **Timeout Protection**: Prevents hanging operations  
- **Memory Monitoring**: Tracks resource usage
- **Session Cleanup**: Automatic resource cleanup

## Development

### Project Structure
```
src/
├── config/          # Environment configuration
├── core/            # Core business logic
├── middleware/      # Express middleware
├── utils/           # Utility functions
└── __tests__/       # Test files
```

### Scripts

```bash
npm start          # Build and start server
npm test           # Run test suite
npm run lint       # Run code linting
```

### Testing

The server includes comprehensive tests:
- Unit tests for core functionality
- Integration tests for MCP protocol
- Health check validation
- Error handling verification

Run tests with:
```bash
npm test
```

### Code Quality

- **ESLint** configuration for consistent code style
- **TypeScript** for type safety
- **Structured logging** for debugging
- **Error boundaries** for fault tolerance

## Security Considerations

- **Local deployment only** - designed for local development use
- **Rate limiting** prevents abuse
- **Input validation** prevents injection attacks  
- **Session isolation** prevents cross-session data leakage
- **Secure defaults** for all configuration options

## Troubleshooting

### Common Issues

1. **Server won't start**
   - Check port availability: `lsof -i :3000`
   - Verify Node.js version: `node --version` (requires Node 18+)

2. **Health check fails**
   - Check filesystem permissions for `/tmp` directory
   - Verify memory availability

3. **Rate limiting errors**
   - Adjust `RATE_LIMIT_MAX_REQUESTS` environment variable
   - Check client request patterns

### Debugging

Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

Check health status:
```bash
curl http://localhost:3000/health
```

## Contributing

1. Follow existing code style (ESLint configuration provided)
2. Add tests for new features
3. Update documentation for API changes
4. Ensure security best practices

## License

See LICENSE file for details.