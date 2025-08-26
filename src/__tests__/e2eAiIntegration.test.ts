import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { formatTestResultResponse } from '../core/formatTestResultResponse.js';
import type { TestFixOptions } from '../core/taskOptions.js';
import type { TaskResult } from '../core/taskOrchestrator.js';
import { TaskErrorType } from '../core/taskOrchestrator.js';
import { TestFailureCategory, TestFailureSeverity } from '../core/testRunner.js';

describe('End-to-End AI Enhancement Integration', () => {
  const testDir = '/tmp/e2e-ai-test';
  const testFile = path.join(testDir, 'SampleTest.swift');

  const sampleSwiftTestCode = `import XCTest
@testable import MyApp

class UserAuthenticationTests: XCTestCase {
    
    var authService: AuthenticationService!
    
    override func setUp() {
        super.setUp()
        authService = AuthenticationService()
    }
    
    func testValidUserLogin() {
        // Test that a valid user can log in successfully
        let user = User(email: "test@example.com", password: "validPass123")
        let result = authService.login(user: user)
        
        XCTAssertTrue(result.success, "Valid user should be able to log in")
        XCTAssertNotNil(result.token, "Login should return a token")
    }
    
    func testInvalidUserLogin() {
        // This test intentionally fails to demonstrate AI assistance
        let user = User(email: "invalid@example.com", password: "wrongPass")
        let result = authService.login(user: user)
        
        // This assertion will fail - testing AI enhancement response
        XCTAssertTrue(result.success, "Invalid user should not be able to log in")  // Line 25 - intentional fail
        XCTAssertNil(result.token, "Failed login should not return a token")
    }
    
    func testPasswordEncryption() {
        let password = "mySecurePassword123"
        let encrypted = authService.encryptPassword(password)
        
        XCTAssertNotEqual(password, encrypted, "Password should be encrypted")
        XCTAssertTrue(encrypted.count > 0, "Encrypted password should not be empty")
    }
    
    override func tearDown() {
        authService = nil
        super.tearDown()
    }
}`;

  beforeAll(async () => {
    await fs.ensureDir(testDir);
    await fs.writeFile(testFile, sampleSwiftTestCode);
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  describe('Complete AI-Enhanced Response', () => {
    it('should provide comprehensive AI-friendly response with all enhancements', async () => {
      const input: TestFixOptions = {
        scheme: 'MyApp',
        xcodeproj: path.join(testDir, 'MyApp.xcodeproj'),
        destination: 'platform=iOS Simulator,name=iPhone 15'
      };

      const validation = { valid: true };

      // Simulate a comprehensive test result with enhanced data
      const enhancedTestFailure = {
        testIdentifier: 'UserAuthenticationTests.testInvalidUserLogin',
        suiteName: 'UserAuthenticationTests',
        file: testFile,
        line: 25,
        message: 'XCTAssertTrue failed: Invalid user should not be able to log in',
        stack: 'Test failed at line 25 in testInvalidUserLogin()',
        attachments: ['login_failure_screenshot.png'],
        severity: TestFailureSeverity.HIGH,
        category: TestFailureCategory.ASSERTION,
        isUITest: false,
        duration: 2.5,
        platform: 'iOS 17.0 Simulator',
        sourceContext: {
          testCode: `  21: func testInvalidUserLogin() {\n  22:     // This test intentionally fails to demonstrate AI assistance\n  23:     let user = User(email: "invalid@example.com", password: "wrongPass")\n  24:     let result = authService.login(user: user)\n  25: →   \n  26:     // This assertion will fail - testing AI enhancement response\n  27:     XCTAssertTrue(result.success, "Invalid user should not be able to log in")  // Line 25 - intentional fail\n  28:     XCTAssertNil(result.token, "Failed login should not return a token")\n  29: }`,
          imports: ['import XCTest', '@testable import MyApp']
        },
        suggestions: [
          'Review the assertion logic and expected vs actual values',
          'Check if the test data setup is correct',
          'Verify the test expectations match the actual behavior',
          'Consider reversing the assertion - invalid users should NOT be able to log in'
        ]
      };

      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: [enhancedTestFailure],
        buildErrors: [],
        aiSuggestions: [
          'Address 1 assertion failure',
          'Review test logic - the assertion appears to be inverted',
          'Verify authentication service behavior for invalid credentials'
        ],
        needsContext: false,
        message: 'Test failures detected in authentication tests'
      };

      const response = formatTestResultResponse(input, validation, result);

      // Validate structured metadata for AI parsing
      expect(response._meta?.structured).toBeDefined();
      expect(response._meta?.structured?.status).toBe('failure');
      expect(response._meta?.structured?.actionable?.priority).toBe('fix_tests');

      // Validate summary data
      expect(response._meta?.structured?.summary?.totalFailures).toBe(1);
      expect(response._meta?.structured?.summary?.priorities?.high).toBe(1);
      expect(response._meta?.structured?.summary?.categories?.assertion).toBe(1);

      // Validate failure details
      const failure = response._meta?.structured?.failures?.[0];
      expect(failure?.test).toBe('UserAuthenticationTests.testInvalidUserLogin');
      expect(failure?.severity).toBe('high');
      expect(failure?.category).toBe('assertion');
      expect(failure?.file).toBe(testFile);
      expect(failure?.line).toBe(25);
      expect(failure?.suggestions).toContain('Consider reversing the assertion - invalid users should NOT be able to log in');

      // Validate actionable items
      expect(response._meta?.structured?.actionable?.nextSteps).toContain('Priority: Fix high-priority test failure first');
      expect(response._meta?.structured?.actionable?.suggestions).toContain('Review test logic - the assertion appears to be inverted');

      // Validate artifacts
      expect(response._meta?.structured?.artifacts?.xcresultPath).toBe('/path/to/test.xcresult');
      expect(response._meta?.structured?.artifacts?.screenshots).toContain('login_failure_screenshot.png');

      // Validate human-readable text output
      const textOutput = response.content[0].text;
      expect(textOutput).toMatch(/🧪.*Test Failures Detected/);
      expect(textOutput).toMatch(/🟠.*HIGH Priority.*1 failure/);
      expect(textOutput).toMatch(/UserAuthenticationTests\.testInvalidUserLogin/);
      expect(textOutput).toMatch(/📄 File:.*SampleTest\.swift/);
      expect(textOutput).toMatch(/📍 Line: 25/);
      expect(textOutput).toMatch(/💬 Error:.*XCTAssertTrue failed/);
      expect(textOutput).toMatch(/💡 Suggestions:/);
      expect(textOutput).toContain('Consider reversing the assertion');

      // Validate source code context inclusion
      expect(textOutput).toMatch(/📝.*Test Code:/);
      expect(textOutput).toContain('func testInvalidUserLogin');
      expect(textOutput).toContain('XCTAssertTrue(result.success');
      expect(textOutput).toMatch(/📥.*Imports:/);
      expect(textOutput).toContain('@testable import MyApp');

      // Validate that it includes actionable guidance
      expect(textOutput).toContain('Review the assertion logic');
      expect(textOutput).toContain('invalid users should NOT be able to log in');
    });

    it('should handle successful test runs with recommendations', () => {
      const input: TestFixOptions = {
        scheme: 'MyApp',
        xcodeproj: path.join(testDir, 'MyApp.xcodeproj')
      };

      const result: TaskResult<string> = {
        success: true,
        data: 'All 15 tests passed successfully!'
      };

      const response = formatTestResultResponse(input, { valid: true }, result);

      expect(response._meta?.structured?.status).toBe('success');
      expect(response._meta?.structured?.actionable?.priority).toBe('all_good');
      expect(response.content[0].text).toMatch(/✅.*All Tests Passed/);
      expect(response.content[0].text).toContain('Consider adding more comprehensive test coverage');
    });

    it('should provide build-first guidance when build errors exist', () => {
      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.BUILD_ERROR,
        buildErrors: [
          'Undefined symbol: _OBJC_CLASS_$_AuthenticationService',
          'Use of undeclared identifier \'User\''
        ],
        testFailures: [],
        aiSuggestions: [
          'Add missing import statements',
          'Verify class definitions are included in target'
        ],
        needsContext: false,
        message: 'Build errors must be fixed before running tests'
      };

      const response = formatTestResultResponse(
        { scheme: 'MyApp', xcodeproj: '/path/MyApp.xcodeproj' },
        { valid: true },
        result
      );

      expect(response._meta?.structured?.status).toBe('failure');
      expect(response._meta?.structured?.actionable?.priority).toBe('fix_build');
      expect(response._meta?.structured?.buildErrors).toHaveLength(2);
      expect(response.content[0].text).toMatch(/🔨.*Build Errors Detected/);
      expect(response.content[0].text).toContain('Undefined symbol: _OBJC_CLASS_$_AuthenticationService');
      expect(response.content[0].text).toContain('Fix compilation errors in source code');
    });
  });

  describe('AI Agent Integration Scenarios', () => {
    it('should provide everything an AI agent needs for iterative test fixing', () => {
      // This test validates that the response contains all elements needed
      // for an AI agent like Copilot to iteratively fix test failures
      
      const complexFailure = {
        testIdentifier: 'NetworkTests.testAPICall',
        suiteName: 'NetworkTests',
        file: '/project/NetworkTests.swift',
        line: 45,
        message: 'XCTAssertEqual failed: ("404") is not equal to ("200")',
        severity: TestFailureSeverity.HIGH,
        category: TestFailureCategory.ASSERTION,
        isUITest: false,
        suggestions: [
          'Check API endpoint URL for correctness',
          'Verify network connectivity in tests',
          'Add proper error handling for HTTP status codes'
        ],
        sourceContext: {
          testCode: `  func testAPICall() {\n    let expectation = expectation(description: "API Call")\n    apiService.fetchData { response in\n      XCTAssertEqual(response.statusCode, "200")\n      expectation.fulfill()\n    }\n    waitForExpectations(timeout: 5.0)\n  }`,
          imports: ['import XCTest', '@testable import NetworkLayer']
        }
      };

      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: [complexFailure],
        buildErrors: [],
        aiSuggestions: [
          'Review API endpoint URLs',
          'Add mock network responses for consistent testing'
        ],
        needsContext: false,
        message: 'Network test failure detected'
      };

      const response = formatTestResultResponse(
        { scheme: 'MyApp', xcworkspace: '/project/MyApp.xcworkspace' },
        { valid: true },
        result
      );

      // AI Agent Requirements Checklist:

      // ✅ 1. Machine-readable error classification
      expect(response._meta?.structured?.failures?.[0]?.category).toBe('assertion');
      expect(response._meta?.structured?.failures?.[0]?.severity).toBe('high');

      // ✅ 2. Specific file/line information for code changes
      expect(response._meta?.structured?.failures?.[0]?.file).toBe('/project/NetworkTests.swift');
      expect(response._meta?.structured?.failures?.[0]?.line).toBe(45);

      // ✅ 3. Actionable suggestions with specific guidance
      const suggestions = response._meta?.structured?.failures?.[0]?.suggestions;
      expect(suggestions).toContain('Check API endpoint URL for correctness');
      expect(suggestions).toContain('Add proper error handling for HTTP status codes');

      // ✅ 4. Source code context for understanding
      expect(response.content[0].text).toContain('func testAPICall()');
      expect(response.content[0].text).toContain('XCTAssertEqual(response.statusCode');

      // ✅ 5. Clear priority indication for fixing order
      expect(response._meta?.structured?.actionable?.priority).toBe('fix_tests');

      // ✅ 6. Next steps for iterative workflow
      const nextSteps = response._meta?.structured?.actionable?.nextSteps;
      expect(nextSteps).toContain('Priority: Fix high-priority test failure first');

      // ✅ 7. Human-readable explanation for user communication
      expect(response.content[0].text).toMatch(/🧪.*Test Failures Detected/);
      expect(response.content[0].text).toContain('("404") is not equal to ("200")');
    });
  });
});