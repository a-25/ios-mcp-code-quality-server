import { describe, it, expect } from 'vitest';
import { formatTestResultResponse, type AIFriendlyTestResponse } from '../core/formatTestResultResponse.js';
import type { TestFixOptions } from '../core/taskOptions.js';
import type { TaskResult } from '../core/taskOrchestrator.js';
import { TaskErrorType } from '../core/taskOrchestrator.js';
import { TestFailureCategory, TestFailureSeverity } from '../core/testRunner.js';

describe('AI Enhancement Features', () => {
  const baseInput: TestFixOptions = {
    scheme: 'TestScheme',
    xcodeproj: 'TestProj.xcodeproj',
    destination: 'platform=iOS Simulator,name=iPhone 16'
  };

  const getValidation = (input: any) => ({ 
    valid: !input.invalid, 
    error: input.invalid ? 'Invalid input' : undefined 
  });

  describe('Core Response Structure', () => {
    it('should provide structured metadata for critical test failures', () => {
      const testFailure = {
        testIdentifier: 'MyAppTests.testCriticalFeature',
        suiteName: 'MyAppTests',
        file: '/path/to/test.swift',
        line: 42,
        message: 'XCTAssertEqual failed: expected "success" but got "failure"',
        severity: TestFailureSeverity.CRITICAL,
        category: TestFailureCategory.ASSERTION,
        isUITest: false,
        suggestions: ['Check the implementation logic', 'Verify test data setup']
      };

      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: [testFailure],
        aiSuggestions: ['Review assertion logic']
      };

      const res: AIFriendlyTestResponse = formatTestResultResponse(
        baseInput, 
        getValidation(baseInput), 
        result
      );

      // Verify structured data is present and correct
      expect(res._meta?.structured).toBeDefined();
      expect(res._meta?.structured?.status).toBe('failure');
      expect(res._meta?.structured?.summary?.totalFailures).toBe(1);
      expect(res._meta?.structured?.summary?.priorities?.critical).toBe(1);
      expect(res._meta?.structured?.actionable?.priority).toBe('fix_critical');
    });

    it('should prioritize build errors over test failures', () => {
      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.BUILD_ERROR,
        buildErrors: ['Compilation error: undefined symbol'],
        testFailures: []
      };

      const res: AIFriendlyTestResponse = formatTestResultResponse(
        baseInput, 
        getValidation(baseInput), 
        result
      );

      expect(res._meta?.structured?.status).toBe('failure');
      expect(res._meta?.structured?.actionable?.priority).toBe('fix_build');
      expect(res._meta?.structured?.buildErrors).toHaveLength(1);
    });
  });

  describe('Test Failure Categorization', () => {
    it('should categorize different failure types correctly', () => {
      const testFailures = [
        {
          testIdentifier: 'TestCase.testCrash',
          suiteName: 'TestCase',
          message: 'Test crashed with SIGABRT',
          severity: TestFailureSeverity.CRITICAL,
          category: TestFailureCategory.CRASH,
          isUITest: false
        },
        {
          testIdentifier: 'UITest.testElementNotFound',
          suiteName: 'UITest', 
          message: 'Element not found',
          severity: TestFailureSeverity.HIGH,
          category: TestFailureCategory.ELEMENT_NOT_FOUND,
          isUITest: true
        }
      ];

      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures
      };

      const res: AIFriendlyTestResponse = formatTestResultResponse(
        baseInput, 
        getValidation(baseInput), 
        result
      );

      expect(res._meta?.structured?.summary?.priorities?.critical).toBe(1);
      expect(res._meta?.structured?.summary?.priorities?.high).toBe(1);
      expect(res._meta?.structured?.summary?.categories?.crash).toBe(1);
      expect(res._meta?.structured?.summary?.categories?.element_not_found).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors appropriately', () => {
      const invalidInput = { ...baseInput, invalid: true };
      
      const res: AIFriendlyTestResponse = formatTestResultResponse(
        invalidInput,
        getValidation(invalidInput),
        undefined
      );

      expect(res._meta?.structured?.status).toBe('error');
      expect(res.content[0].text).toMatch(/Input Validation Error/);
    });

    it('should handle missing project file errors', () => {
      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.MISSING_PROJECT
      };

      const res: AIFriendlyTestResponse = formatTestResultResponse(
        baseInput,
        getValidation(baseInput),
        result
      );

      expect(res._meta?.structured?.status).toBe('error');
      expect(res.content[0].text).toMatch(/Project File Not Found/);
    });
  });

  describe('UI Test Integration', () => {
    it('should handle UI test failures with enhanced data', () => {
      const uiTestResult: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: [{
          testIdentifier: 'LoginUITests.testButtonTap',
          suiteName: 'LoginUITests',
          message: 'Element not found: Could not locate button with identifier "submit"',
          attachments: ['failure_screenshot.png'],
          isUITest: true,
          category: TestFailureCategory.ELEMENT_NOT_FOUND,
          severity: TestFailureSeverity.HIGH,
          suggestions: ['Verify element exists', 'Check accessibility identifier']
        }]
      };

      const res: AIFriendlyTestResponse = formatTestResultResponse(
        baseInput,
        getValidation(baseInput),
        uiTestResult
      );

      const failure = res._meta?.structured?.failures?.[0];
      expect(failure?.category).toBe('element_not_found');
      expect(failure?.severity).toBe('high');
      expect(failure?.suggestions).toContain('Verify element exists');
    });
  });
});