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

  beforeAll(async () => {
    await fs.ensureDir(testDir);
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  describe('Complete AI-Enhanced Response', () => {
    it('should provide comprehensive AI-friendly response for test failures', () => {
      const input: TestFixOptions = {
        scheme: 'MyApp',
        xcodeproj: path.join(testDir, 'MyApp.xcodeproj'),
        destination: 'platform=iOS Simulator,name=iPhone 15'
      };

      const testFailure = {
        testIdentifier: 'UserAuthenticationTests.testInvalidUserLogin',
        suiteName: 'UserAuthenticationTests',
        message: 'XCTAssertTrue failed: Invalid user should not be able to log in',
        severity: TestFailureSeverity.HIGH,
        category: TestFailureCategory.ASSERTION,
        isUITest: false,
        suggestions: ['Review the assertion logic']
      };

      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: [testFailure],
        buildErrors: [],
        aiSuggestions: ['Review test logic'],
        message: 'Test failures detected'
      };

      const response = formatTestResultResponse(input, { valid: true }, result);

      // Validate structured metadata exists
      expect(response._meta?.structured).toBeDefined();
      expect(response._meta?.structured?.status).toBe('failure');
      expect(response._meta?.structured?.actionable?.priority).toBe('fix_tests');
      
      // Validate failure details
      const failure = response._meta?.structured?.failures?.[0];
      expect(failure?.test).toBe('UserAuthenticationTests.testInvalidUserLogin');
      expect(failure?.severity).toBe('high');
      expect(failure?.category).toBe('assertion');
      
      // Validate human-readable text output
      expect(response.content[0].text).toMatch(/Test Failures Detected/);
      expect(response.content[0].text).toContain('UserAuthenticationTests.testInvalidUserLogin');
    });

    it('should provide build-first guidance when build errors exist', () => {
      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.BUILD_ERROR,
        buildErrors: ['Undefined symbol: _OBJC_CLASS_$_AuthenticationService'],
        testFailures: [],
        aiSuggestions: ['Add missing import statements'],
        message: 'Build errors must be fixed first'
      };

      const response = formatTestResultResponse(
        { scheme: 'MyApp', xcodeproj: '/path/MyApp.xcodeproj' },
        { valid: true },
        result
      );

      expect(response._meta?.structured?.status).toBe('failure');
      expect(response._meta?.structured?.actionable?.priority).toBe('fix_build');
      expect(response.content[0].text).toMatch(/Build Errors Detected/);
      expect(response.content[0].text).toContain('Undefined symbol');
    });
  });

  describe('AI Agent Integration Scenarios', () => {
    it('should provide everything needed for iterative test fixing', () => {
      const failure = {
        testIdentifier: 'NetworkTests.testAPICall',
        suiteName: 'NetworkTests',
        file: '/project/NetworkTests.swift',
        line: 45,
        message: 'XCTAssertEqual failed: ("404") is not equal to ("200")',
        severity: TestFailureSeverity.HIGH,
        category: TestFailureCategory.ASSERTION,
        isUITest: false,
        suggestions: ['Check API endpoint URL for correctness']
      };

      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: [failure],
        buildErrors: [],
        aiSuggestions: ['Review API endpoint URLs'],
        message: 'Network test failure detected'
      };

      const response = formatTestResultResponse(
        { scheme: 'MyApp', xcworkspace: '/project/MyApp.xcworkspace' },
        { valid: true },
        result
      );

      // AI Agent Requirements Checklist:
      // ✅ Machine-readable error classification
      expect(response._meta?.structured?.failures?.[0]?.category).toBe('assertion');
      expect(response._meta?.structured?.failures?.[0]?.severity).toBe('high');

      // ✅ Specific file/line information
      expect(response._meta?.structured?.failures?.[0]?.file).toBe('/project/NetworkTests.swift');
      expect(response._meta?.structured?.failures?.[0]?.line).toBe(45);

      // ✅ Actionable suggestions
      const suggestions = response._meta?.structured?.failures?.[0]?.suggestions;
      expect(suggestions).toContain('Check API endpoint URL for correctness');

      // ✅ Clear priority indication
      expect(response._meta?.structured?.actionable?.priority).toBe('fix_tests');

      // ✅ Human-readable explanation
      expect(response.content[0].text).toContain('("404") is not equal to ("200")');
    });
  });
});