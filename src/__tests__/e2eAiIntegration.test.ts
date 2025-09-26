import { describe, it, expect } from 'vitest';
import { formatTestResultResponse } from '../core/formatTestResultResponse.js';
import type { TestFixOptions } from '../core/taskOptions.js';
import type { TaskResult } from '../core/taskOrchestrator.js';
import { TaskErrorType } from '../core/taskOrchestrator.js';
import { TestFailureCategory, TestFailureSeverity } from '../core/testRunner.js';

// AI Integration Tests - Focus on Business Logic
// Tests AI-enhanced response formatting for comprehensive scenarios
describe('AI Enhancement Integration', () => {
  describe('Comprehensive Response Generation', () => {
    it('generates complete AI-friendly response with enhanced failure data', () => {
      const input: TestFixOptions = {
        scheme: 'MyApp',
        xcodeproj: '/project/MyApp.xcodeproj',
        destination: 'platform=iOS Simulator,name=iPhone 15'
      };

      const enhancedTestFailure = {
        testIdentifier: 'UserAuthenticationTests.testInvalidUserLogin',
        suiteName: 'UserAuthenticationTests',
        file: '/project/UserAuthenticationTests.swift',
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
          testCode: `func testInvalidUserLogin() {
    let user = User(email: "invalid@example.com", password: "wrongPass")
    let result = authService.login(user: user)
    XCTAssertTrue(result.success, "Invalid user should not be able to log in") // Wrong!
}`,
          imports: ['import XCTest', '@testable import MyApp']
        },
        suggestions: [
          'Review the assertion logic - invalid users should NOT be able to log in',
          'Consider reversing the assertion to XCTAssertFalse'
        ]
      };

      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: [enhancedTestFailure],
        buildErrors: [],
        aiSuggestions: [
          'Address assertion failure in authentication test',
          'Review test logic - the assertion appears to be inverted'
        ],
        needsContext: false,
        message: 'Test failures detected in authentication tests'
      };

      const response = formatTestResultResponse(input, { valid: true }, result);

      // Validate structured metadata for AI parsing
      expect(response._meta?.structured?.status).toBe('failure');
      expect(response._meta?.structured?.actionable?.priority).toBe('fix_tests');
      expect(response._meta?.structured?.summary?.totalFailures).toBe(1);

      // Validate failure details
      const failure = response._meta?.structured?.failures?.[0];
      expect(failure?.test).toBe('UserAuthenticationTests.testInvalidUserLogin');
      expect(failure?.severity).toBe('high');
      expect(failure?.category).toBe('assertion');
      // Validate human-readable text output includes key elements
      const textOutput = response.content[0].text;
      expect(textOutput).toMatch(/🧪.*Test Failures Detected/);
      expect(textOutput).toMatch(/🟠.*HIGH Priority/);
      expect(textOutput).toContain('UserAuthenticationTests.testInvalidUserLogin');
      expect(textOutput).toContain('Review the assertion logic - invalid users should NOT be able to log in');
    });

    it('handles successful test runs', () => {
      const input: TestFixOptions = {
        scheme: 'MyApp',
        xcodeproj: '/project/MyApp.xcodeproj'
      };

      const result: TaskResult<string> = {
        success: true,
        data: 'All 15 tests passed successfully!'
      };

      const response = formatTestResultResponse(input, { valid: true }, result);

      expect(response._meta?.structured?.status).toBe('success');
      expect(response._meta?.structured?.actionable?.priority).toBe('all_good');
      expect(response.content[0].text).toMatch(/✅.*All Tests Passed/);
    });

    it('prioritizes build errors over test failures', () => {
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

  describe('AI Agent Integration', () => {
    it('provides comprehensive data for AI-driven test fixing', () => {
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
          'Add proper error handling for HTTP status codes'
        ]
      };

      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: [complexFailure],
        buildErrors: [],
        aiSuggestions: ['Review API endpoint configuration'],
        needsContext: false,
        message: 'Network test failure detected'
      };

      const response = formatTestResultResponse(
        { scheme: 'MyApp', xcworkspace: '/project/MyApp.xcworkspace' },
        { valid: true },
        result
      );

      // Verify AI agent gets essential information for test fixing
      expect(response._meta?.structured?.failures?.[0]?.category).toBe('assertion');
      expect(response._meta?.structured?.failures?.[0]?.severity).toBe('high');
      expect(response._meta?.structured?.failures?.[0]?.file).toBe('/project/NetworkTests.swift');
      expect(response._meta?.structured?.failures?.[0]?.line).toBe(45);
      expect(response._meta?.structured?.actionable?.priority).toBe('fix_tests');
      
      // Verify human-readable output includes critical details
      expect(response.content[0].text).toMatch(/🧪.*Test Failures Detected/);
      expect(response.content[0].text).toContain('("404") is not equal to ("200")');
    });
  });
});