import { describe, it, expect } from 'vitest';
import { formatTestResultResponse, type AIFriendlyTestResponse } from '../core/formatTestResultResponse.js';
import type { TestFixOptions } from '../core/taskOptions.js';
import type { TaskResult } from '../core/taskOrchestrator.js';

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
        error: 'test-failures',
        testFailures: [testFailure],
        buildErrors: [],
        summary: {
          totalFailures: 1,
          failedTests: 1,
          platform: 'iOS Simulator'
        },
        nextSteps: ['Fix critical test failure', 'Run tests again'],
        suggestions: ['Review assertion logic']
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
      expect(res._meta?.structured?.actionable?.nextSteps).toContain('Fix critical test failure');
    });

    it('should prioritize build errors over test failures', () => {
      const result: TaskResult<string> = {
        success: false,
        error: 'build-error',
        buildErrors: ['Compilation error: undefined symbol'],
        testFailures: [],
        summary: {
          buildErrors: 1,
          totalFailures: 0
        },
        nextSteps: ['Fix build errors first'],
        suggestions: ['Check import statements']
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
        error: 'test-failures',
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
        error: 'test-failures',
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
        error: 'test-failures',
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
        error: 'needs-context',
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
        error: 'missing-project'
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
        error: 'test-failures',
        testFailures: [{
          testIdentifier: 'Test.withScreenshot',
          suiteName: 'Test',
          message: 'UI test failed',
          attachments: ['screenshot1.png', 'screenshot2.png'],
          severity: 'medium' as const,
          category: 'assertion' as const,
          suggestions: ['Check UI element visibility']
        }],
        buildErrors: [],
        summary: {
          totalFailures: 1,
          failedTests: 1,
          duration: 45.2,
          platform: 'iOS 17.0 Simulator'
        },
        artifacts: {
          xcresultPath: '/path/to/results.xcresult',
          screenshots: ['screenshot1.png', 'screenshot2.png'],
          logFiles: ['test.log']
        },
        nextSteps: ['Review UI test logic', 'Check element selectors'],
        suggestions: ['Update test selectors', 'Add wait conditions']
      };

      const res: AIFriendlyTestResponse = formatTestResultResponse(
        baseInput,
        getValidation(baseInput),
        enhancedResult
      );

      // Check that enhanced data is preserved
      expect(res._meta?.structured?.artifacts?.xcresultPath).toBe('/path/to/results.xcresult');
      expect(res._meta?.structured?.artifacts?.screenshots).toEqual(['screenshot1.png', 'screenshot2.png']);
      expect(res._meta?.structured?.actionable?.nextSteps).toContain('Review UI test logic');
      expect(res._meta?.structured?.actionable?.suggestions).toContain('Update test selectors');
    });
  });
});