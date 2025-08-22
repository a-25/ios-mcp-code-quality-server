# UI Test Support

The iOS MCP Code Quality Server now includes comprehensive support for UI tests in addition to unit tests. This document outlines the differences between unit and UI tests and how to use the enhanced functionality.

## Overview

### Unit Tests vs UI Tests

| Feature | Unit Tests | UI Tests |
|---------|------------|----------|
| **Speed** | Fast (milliseconds) | Slower (seconds) |
| **Scope** | Individual classes/methods | Full app UI interaction |
| **Dependencies** | Isolated, mocked | Requires app launch |
| **Assertions** | `XCTAssert*` functions | `XCUIElement` interactions |
| **Failures** | Logic/data errors | Element not found, timeouts |
| **Attachments** | Rare | Screenshots, hierarchy dumps |
| **Naming** | `*Tests.swift` | `*UITests.swift` |

### UI Test Error Patterns

The server automatically detects UI tests and their specific failure patterns:

- **Element Not Found**: `No matches found for find: Elements matching predicate`
- **Timeout Errors**: `timeout exceeded`, `Failed to find element within X seconds`
- **UI Framework**: References to `XCUIElement`, `XCUIApplication`
- **Accessibility**: Issues with accessibility identifiers

## Enhanced TestFixOptions

The `TestFixOptions` interface now supports UI test-specific configuration:

```typescript
interface TestFixOptions {
  xcodeproj?: string;
  xcworkspace?: string;
  scheme: string;
  destination?: string;
  
  // New UI test support
  testType?: 'unit' | 'ui' | 'all';        // Specify test types to run
  testTarget?: string;                     // Specific test target (e.g., "MyAppUITests")
  includeScreenshots?: boolean;            // Control screenshot inclusion
}
```

### Usage Examples

```typescript
// Run only unit tests
const unitTestOptions = {
  scheme: 'MyApp',
  xcodeproj: 'MyApp.xcodeproj',
  testType: 'unit'
};

// Run only UI tests with specific target
const uiTestOptions = {
  scheme: 'MyApp',
  xcworkspace: 'MyApp.xcworkspace',
  testType: 'ui',
  testTarget: 'MyAppUITests',
  includeScreenshots: true
};

// Run all tests
const allTestOptions = {
  scheme: 'MyApp',
  xcodeproj: 'MyApp.xcodeproj',
  testType: 'all'
};
```

## Enhanced Test Failure Information

### TestFailure Interface

The `TestFailure` interface now includes UI-specific context:

```typescript
type TestFailure = {
  testIdentifier: string;
  suiteName: string;
  file?: string;
  line?: number;
  message?: string;
  stack?: string;
  
  // Enhanced UI test support
  attachments?: TestAttachment[];         // Rich attachment metadata
  testType?: 'unit' | 'ui';              // Auto-detected test type
  uiContext?: UITestContext;             // UI-specific failure context
};
```

### UI Test Context

For UI test failures, additional context is provided:

```typescript
type UITestContext = {
  elementIdentifier?: string;     // UI element that caused failure
  elementPath?: string;          // XPath-like path to element
  timeoutDuration?: number;      // Timeout value if applicable
  isElementNotFound?: boolean;   // Element not found error
  isTimeoutError?: boolean;      // Timeout error
};
```

### Test Attachments

UI tests often generate attachments like screenshots:

```typescript
type TestAttachment = {
  filename: string;
  type: 'screenshot' | 'hierarchy' | 'other';
  payloadRef?: string;
  lifetime?: string;
};
```

## Enhanced Response Formatting

### Summary Format

Test failures are now labeled by type:

```
Test failures:

- [UNIT] UnitTests.testCalculation(): XCTAssertEqual failed: ("5") is not equal to ("4")
- [UI] UITests.testLoginFlow(): UI Testing Failure - No matches found for element 'loginButton'
```

### Detailed Context Format

When `needsContext` is true, detailed UI information is included:

```
Test failures:

- [UI TEST] UITests.testLoginFlow()
  Suite: UITests
  File: /path/to/UITests.swift
  Line: 45
  Message: UI Testing Failure - No matches found for find: Elements matching predicate '(identifier == "loginButton")'
  UI Element: loginButton
  Element Path: /XCUIElementTypeApplication/XCUIElementTypeWindow[1]/XCUIElementTypeButton
  Issue Type: Element not found
  Timeout: 5.0 seconds
  Screenshots: screenshot_testLoginFlow_failure.png
  Hierarchy Dumps: hierarchy_dump_testLoginFlow.txt
```

## Command Generation

### Test Target Specification

When a specific test target is provided, the server uses the `-only-testing:` flag:

```bash
xcodebuild test -scheme "MyApp" -only-testing:MyAppUITests -destination "platform=iOS Simulator,name=iPhone 15"
```

### Test Type Handling

- `testType: 'unit'`: Logs unit test preference (specific filtering may require target specification)
- `testType: 'ui'`: Runs all tests including UI tests
- `testType: 'all'`: Runs all available tests (default behavior)

## Best Practices

### UI Test Configuration

1. **Use specific test targets**: Specify `testTarget: "MyAppUITests"` for better control
2. **Enable screenshot capture**: Set `includeScreenshots: true` for debugging
3. **Choose appropriate simulators**: Use consistent device destinations
4. **Handle timeouts**: UI tests need longer timeout values than unit tests

### Error Handling

1. **Element identification**: Use stable accessibility identifiers
2. **Wait for elements**: Implement proper waiting mechanisms
3. **Screenshot analysis**: Review failure screenshots for debugging
4. **Hierarchy dumps**: Use view hierarchy information for complex UI issues

### Performance

1. **Separate test runs**: Consider running unit and UI tests separately for faster feedback
2. **Parallel execution**: Use appropriate destinations for parallel test execution
3. **Targeted testing**: Use `testTarget` to run specific UI test suites

## Migration Guide

### Existing Projects

For projects already using the test functionality:

1. **No breaking changes**: Existing `TestFixOptions` usage continues to work
2. **Gradual adoption**: Add `testType` specification as needed
3. **Enhanced debugging**: Benefit from improved error context automatically

### New Projects

For new implementations:

1. **Specify test types**: Use `testType` to control which tests run
2. **Configure targets**: Set `testTarget` for specific UI test suites  
3. **Enable attachments**: Use `includeScreenshots` for UI test debugging

## Examples

### MCP Tool Usage

```json
{
  "tool": "test",
  "input": {
    "xcworkspace": "/path/to/MyApp.xcworkspace",
    "scheme": "MyApp",
    "testType": "ui",
    "testTarget": "MyAppUITests",
    "destination": "platform=iOS Simulator,name=iPhone 15",
    "includeScreenshots": true
  }
}
```

### Response Example

```json
{
  "content": [{
    "type": "text",
    "text": "Test failures:\n\n- [UI] MyAppUITests.testLoginFlow(): UI Testing Failure - No matches found for find: Elements matching predicate '(identifier == \"loginButton\")'\n\nUI Element: loginButton\nScreenshots: screenshot_failure.png\nIssue Type: Element not found"
  }]
}
```

This enhanced UI test support provides comprehensive analysis and debugging capabilities for iOS UI testing workflows.