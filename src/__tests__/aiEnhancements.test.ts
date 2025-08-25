import { describe, it, expect } from 'vitest';
import { formatTestResultResponse, type AIFriendlyTestResponse } from '../core/formatTestResultResponse.js';
import type { TestFixOptions } from '../core/taskOptions.js';
import type { TaskResult } from '../core/taskOrchestrator.js';
import { TaskErrorType } from '../core/taskOrchestrator.js';

describe('AI Enhancement Features', () => {
  const baseInput: TestFixOptions = {
    scheme: 'TestScheme',
    xcodeproj: 'TestProj.xcodeproj',
    xcworkspace: 'TestWorkspace.xcworkspace',
    destination: 'platform=iOS Simulator,name=iPhone 16'
  };

  const getValidation = (input: any) => ({ 
    valid: !input.invalid, 
    error: input.invalid ? 'Invalid input' : undefined 
  });

  describe('Structured Response Format', () => {
    it('should include structured metadata for AI parsing', () => {
      const testFailure = {
        testIdentifier: 'MyAppTests.testCriticalFeature',
        suiteName: 'MyAppTests',
        file: '/path/to/test.swift',
        line: 42,
        message: 'XCTAssertEqual failed: expected "success" but got "failure"',
        stack: 'stack trace here',
        attachments: [],
        severity: 'critical' as const,
        category: 'assertion' as const,
        suggestions: ['Check the implementation logic', 'Verify test data setup']
      };

      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: [testFailure],
        buildErrors: [],
        aiSuggestions: ['Review assertion logic'],
        needsContext: false,
        message: 'Test failure detected'
      };

      const res: AIFriendlyTestResponse = formatTestResultResponse(
        baseInput, 
        getValidation(baseInput), 
        result
      );

      // Check structured metadata exists
      expect(res._meta?.structured).toBeDefined();
      expect(res._meta?.structured?.status).toBe('failure');
      
      // Check summary data
      expect(res._meta?.structured?.summary?.totalFailures).toBe(1);
      expect(res._meta?.structured?.summary?.priorities?.critical).toBe(1);
      expect(res._meta?.structured?.summary?.categories?.assertion).toBe(1);
      
      // Check failure details
      expect(res._meta?.structured?.failures).toHaveLength(1);
      const failure = res._meta?.structured?.failures?.[0];
      expect(failure?.test).toBe('MyAppTests.testCriticalFeature');
      expect(failure?.severity).toBe('critical');
      expect(failure?.category).toBe('assertion');
      expect(failure?.suggestions).toContain('Check the implementation logic');
      
      // Check actionable items
      expect(res._meta?.structured?.actionable?.priority).toBe('fix_critical');
      expect(res._meta?.structured?.actionable?.suggestions).toEqual(['Review assertion logic']);
    });

    it('should prioritize build errors over test failures', () => {
      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.BUILD_ERROR,
        buildErrors: ['Compilation error: undefined symbol'],
        testFailures: [],
        aiSuggestions: ['Check import statements'],
        message: 'Build failed with compilation errors'
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

    it('should indicate success status when all tests pass', () => {
      const result: TaskResult<string> = {
        success: true,
        data: 'All tests passed successfully!'
      };

      const res: AIFriendlyTestResponse = formatTestResultResponse(
        baseInput, 
        getValidation(baseInput), 
        result
      );

      expect(res._meta?.structured?.status).toBe('success');
      expect(res._meta?.structured?.actionable?.priority).toBe('all_good');
      expect(res.content[0].text).toMatch(/All Tests Passed/);
    });
  });

  describe('Enhanced Test Failure Categorization', () => {
    it('should categorize assertion failures correctly', () => {
      const testFailure = {
        testIdentifier: 'TestCase.testAssertion',
        suiteName: 'TestCase',
        message: 'XCTAssertEqual failed',
        severity: 'medium' as const,
        category: 'assertion' as const,
        suggestions: ['Review assertion logic']
      };

      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: [testFailure]
      };

      const res: AIFriendlyTestResponse = formatTestResultResponse(
        baseInput, 
        getValidation(baseInput), 
        result
      );

      const failure = res._meta?.structured?.failures?.[0];
      expect(failure?.category).toBe('assertion');
      expect(failure?.suggestions).toContain('Review assertion logic');
    });

    it('should categorize crash failures as critical', () => {
      const testFailure = {
        testIdentifier: 'TestCase.testCrash',
        suiteName: 'TestCase',
        message: 'Test crashed with SIGABRT',
        severity: 'critical' as const,
        category: 'crash' as const,
        suggestions: ['Check for nil pointer dereferences', 'Add defensive programming']
      };

      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: [testFailure]
      };

      const res: AIFriendlyTestResponse = formatTestResultResponse(
        baseInput, 
        getValidation(baseInput), 
        result
      );

      expect(res._meta?.structured?.summary?.priorities?.critical).toBe(1);
      expect(res._meta?.structured?.actionable?.priority).toBe('fix_critical');
      expect(res.content[0].text).toMatch(/🔴.*CRITICAL Priority/);
    });
  });

  describe('User-Friendly Text Output', () => {
    it('should format failure output with emojis and clear structure', () => {
      const testFailure = {
        testIdentifier: 'MyTests.testFeature',
        suiteName: 'MyTests',
        file: '/path/to/test.swift',
        line: 123,
        message: 'Test failed unexpectedly',
        severity: 'high' as const,
        category: 'assertion' as const,
        suggestions: ['Check implementation', 'Verify test data']
      };

      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: [testFailure]
      };

      const res: AIFriendlyTestResponse = formatTestResultResponse(
        baseInput, 
        getValidation(baseInput), 
        result
      );

      const text = res.content[0].text;
      
      // Check for user-friendly formatting
      expect(text).toMatch(/🧪.*Test Failures Detected/);
      expect(text).toMatch(/🟠.*HIGH Priority/);
      expect(text).toMatch(/📄 File:.*test\.swift/);
      expect(text).toMatch(/📍 Line: 123/);
      expect(text).toMatch(/💬 Error:.*Test failed unexpectedly/);
      expect(text).toMatch(/💡 Suggestions:/);
      expect(text).toContain('Check implementation');
      expect(text).toContain('Verify test data');
    });

    it('should provide actionable next steps', () => {
      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.NEEDS_CONTEXT,
        needsContext: true,
        message: 'Need more information',
        testFailures: [{
          testIdentifier: 'Test.failing',
          suiteName: 'Test',
          message: 'Assertion failed',
          suggestions: ['Fix the logic']
        }],
        buildErrors: []
      };

      const res: AIFriendlyTestResponse = formatTestResultResponse(
        baseInput, 
        getValidation(baseInput), 
        result
      );

      const text = res.content[0].text;
      expect(text).toMatch(/🔍.*Analysis Required/);
      expect(text).toMatch(/Next Steps:/);
      expect(text).toContain('Please provide the source code');
      expect(text).toContain('Include relevant class/function definitions');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors with clear messaging', () => {
      const invalidInput = { ...baseInput, invalid: true };
      
      const res: AIFriendlyTestResponse = formatTestResultResponse(
        invalidInput,
        getValidation(invalidInput),
        undefined
      );

      expect(res._meta?.structured?.status).toBe('error');
      expect(res.content[0].text).toMatch(/❌.*Input Validation Error/);
      expect(res.content[0].text).toContain('Please check your input parameters');
    });

    it('should provide helpful guidance for missing project files', () => {
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
      expect(res.content[0].text).toMatch(/📁.*Project File Not Found/);
      expect(res.content[0].text).toContain('Use absolute paths rather than relative paths');
      expect(res.content[0].text).toContain('Example:');
    });
  });

  describe('Integration with Test Runner Enhanced Data', () => {
    it('should handle enhanced TestRunResult with artifacts and suggestions', () => {
      const enhancedResult: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: [{
          testIdentifier: 'MyAppUITests.testLoginButton',
          suiteName: 'MyAppUITests',
          message: 'Button with identifier "loginButton" was not found',
          attachments: ['screenshot1.png', 'screenshot2.png'],
          severity: 'high' as const,
          category: 'element_not_found' as const,
          isUITest: true,
          suggestions: ['Check UI element visibility', 'Verify accessibility identifier is correct']
        }],
        buildErrors: [],
        aiSuggestions: ['Update test selectors', 'Add wait conditions'],
        message: 'UI test failed with screenshots available'
      };

      const res: AIFriendlyTestResponse = formatTestResultResponse(
        baseInput,
        getValidation(baseInput),
        enhancedResult
      );

      // Check that structured data is generated from the test failure data
      expect(res._meta?.structured?.summary?.totalFailures).toBe(1);
      expect(res._meta?.structured?.failures).toHaveLength(1);
      const failure = res._meta?.structured?.failures?.[0];
      expect(failure?.test).toBe('MyAppUITests.testLoginButton');
      expect(failure?.severity).toBe('high');
      expect(failure?.category).toBe('element_not_found');
      expect(failure?.suggestions).toContain('Check UI element visibility');
      
      // Check AI suggestions from TaskResult
      expect(res._meta?.structured?.actionable?.suggestions).toEqual(['Update test selectors', 'Add wait conditions']);
    });

    it('should auto-detect UI tests and categorize appropriately', () => {
      // Simulate what would happen after testRunner processes a UI test failure
      const uiTestResult: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: [{
          testIdentifier: 'LoginUITests.testButtonTap',
          suiteName: 'LoginUITests',
          message: 'Element not found: Could not locate button with identifier "submit"',
          attachments: ['failure_screenshot.png'],
          // Pre-categorized as would happen in testRunner processing
          isUITest: true,
          category: 'element_not_found' as const,
          severity: 'high' as const,
          suggestions: [
            'Verify the element exists in the current view hierarchy',
            'Check if the element accessibility identifier is correct'
          ]
        }],
        buildErrors: [],
        message: 'UI test failure with auto-detection'
      };

      const res: AIFriendlyTestResponse = formatTestResultResponse(
        baseInput,
        getValidation(baseInput),
        uiTestResult
      );

      // Verify UI test was properly categorized and formatted
      const failure = res._meta?.structured?.failures?.[0];
      expect(failure?.category).toBe('element_not_found');
      expect(failure?.severity).toBe('high');
      
      // Should have UI-specific suggestions
      expect(failure?.suggestions).toContain('Verify the element exists in the current view hierarchy');
      expect(failure?.suggestions).toContain('Check if the element accessibility identifier is correct');
      
      // Should show screenshots in formatted output
      expect(res.content[0].text).toContain('📸 Screenshots:');
      expect(res.content[0].text).toContain('failure_screenshot.png');
    });
  });
});