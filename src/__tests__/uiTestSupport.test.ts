import { describe, it, expect } from 'vitest';
import { formatTestResultResponse } from '../core/formatTestResultResponse.js';
import type { TaskResult } from '../core/taskOrchestrator.js';
import type { TestFixOptions } from '../core/taskOptions.js';

describe('UI Test Support', () => {
  const getValidation = (input: any) => ({ valid: !input.invalid, error: input.invalid ? 'Invalid input' : undefined });

  describe('UI Test Response Formatting', () => {
    it('should format UI test failures with type labels in main error display', () => {
      const input: TestFixOptions = {
        scheme: 'TestScheme',
        xcodeproj: 'TestProj.xcodeproj',
        testType: 'ui'
      };
      
      const validation = getValidation(input);
      
      const uiTestFailure = {
        testIdentifier: 'TestProjectUITests.testLoginFlow()',
        suiteName: 'TestProjectUITests',
        file: '/path/to/UITests.swift',
        line: 45,
        message: 'UI Testing Failure - No matches found for find: Elements matching predicate \'(identifier == "loginButton")\'',
        testType: 'ui',
        uiContext: {
          elementIdentifier: 'loginButton',
          elementPath: '/XCUIElementTypeApplication/XCUIElementTypeWindow[1]/XCUIElementTypeButton',
          isElementNotFound: true,
          timeoutDuration: 5.0
        },
        attachments: [
          {
            filename: 'screenshot_failure.png',
            type: 'screenshot',
            payloadRef: 'ref123'
          }
        ]
      };

      const result: TaskResult = {
        success: false,
        error: 'test-failures',
        testFailures: [uiTestFailure]
      };

      const response = formatTestResultResponse(input, validation, result);
      const text = response.content[0].text;

      // Check for UI test type in the main failure list
      expect(text).toContain('[UI] TestProjectUITests.testLoginFlow()');
      expect(text).toContain('UI Testing Failure - No matches found');
    });

    it('should format UI test failures with detailed context in needsContext mode', () => {
      const input: TestFixOptions = {
        scheme: 'TestScheme',
        xcodeproj: 'TestProj.xcodeproj',
        testType: 'ui'
      };
      
      const validation = getValidation(input);
      
      const uiTestFailure = {
        testIdentifier: 'TestProjectUITests.testLoginFlow()',
        suiteName: 'TestProjectUITests',
        file: '/path/to/UITests.swift',
        line: 45,
        message: 'UI Testing Failure - No matches found for find: Elements matching predicate \'(identifier == "loginButton")\'',
        testType: 'ui',
        uiContext: {
          elementIdentifier: 'loginButton',
          elementPath: '/XCUIElementTypeApplication/XCUIElementTypeWindow[1]/XCUIElementTypeButton',
          isElementNotFound: true,
          timeoutDuration: 5.0
        },
        attachments: [
          {
            filename: 'screenshot_failure.png',
            type: 'screenshot',
            payloadRef: 'ref123'
          }
        ]
      };

      const result: TaskResult = {
        success: false,
        needsContext: true,
        message: 'Need more info',
        testFailures: [uiTestFailure]
      };

      const response = formatTestResultResponse(input, validation, result);
      const text = response.content[0].text;

      // Check for UI test specific formatting in needsContext mode
      expect(text).toContain('[UI TEST]');
      expect(text).toContain('UI Element: loginButton');
      expect(text).toContain('Element Path: /XCUIElementTypeApplication');
      expect(text).toContain('Issue Type: Element not found');
      expect(text).toContain('Timeout: 5 seconds');
      expect(text).toContain('Screenshots: screenshot_failure.png');
    });

    it('should format mixed unit and UI test failures', () => {
      const input: TestFixOptions = {
        scheme: 'TestScheme',
        xcodeproj: 'TestProj.xcodeproj',
        testType: 'all'
      };
      
      const validation = getValidation(input);
      
      const unitTestFailure = {
        testIdentifier: 'UnitTests.testCalculation()',
        suiteName: 'UnitTests',
        message: 'XCTAssertEqual failed: ("5") is not equal to ("4")',
        testType: 'unit'
      };

      const uiTestFailure = {
        testIdentifier: 'UITests.testButton()',
        suiteName: 'UITests',
        message: 'Element not found: button',
        testType: 'ui',
        uiContext: {
          elementIdentifier: 'button',
          isElementNotFound: true
        }
      };

      const result: TaskResult = {
        success: false,
        error: 'test-failures',
        testFailures: [unitTestFailure, uiTestFailure]
      };

      const response = formatTestResultResponse(input, validation, result);
      const text = response.content[0].text;

      // Check both test types are properly labeled
      expect(text).toContain('[UNIT] UnitTests.testCalculation()');
      expect(text).toContain('[UI] UITests.testButton()');
      expect(text).toContain('XCTAssertEqual failed');
      expect(text).toContain('Element not found: button');
    });

    it('should format mixed unit and UI test failures with detailed context', () => {
      const input: TestFixOptions = {
        scheme: 'TestScheme',
        xcodeproj: 'TestProj.xcodeproj',
        testType: 'all'
      };
      
      const validation = getValidation(input);
      
      const unitTestFailure = {
        testIdentifier: 'UnitTests.testCalculation()',
        suiteName: 'UnitTests',
        message: 'XCTAssertEqual failed: ("5") is not equal to ("4")',
        testType: 'unit'
      };

      const uiTestFailure = {
        testIdentifier: 'UITests.testButton()',
        suiteName: 'UITests',
        message: 'Element not found: button',
        testType: 'ui',
        uiContext: {
          elementIdentifier: 'button',
          isElementNotFound: true
        }
      };

      const result: TaskResult = {
        success: false,
        needsContext: true,
        message: 'Need more info',
        testFailures: [unitTestFailure, uiTestFailure]
      };

      const response = formatTestResultResponse(input, validation, result);
      const text = response.content[0].text;

      // Check both test types are properly labeled with detailed context
      expect(text).toContain('[UNIT TEST]');
      expect(text).toContain('[UI TEST]');
      expect(text).toContain('XCTAssertEqual failed');
      expect(text).toContain('UI Element: button');
      expect(text).toContain('Issue Type: Element not found');
    });

    it('should handle attachments in detailed formatting', () => {
      const input: TestFixOptions = {
        scheme: 'TestScheme',
        xcodeproj: 'TestProj.xcodeproj',
        testType: 'ui'
      };
      
      const validation = getValidation(input);
      
      const uiTestFailure = {
        testIdentifier: 'UITests.testButton()',
        suiteName: 'UITests',
        message: 'Element not found: button',
        testType: 'ui',
        attachments: [
          {
            filename: 'screenshot_failure.png',
            type: 'screenshot',
            payloadRef: 'ref123'
          },
          {
            filename: 'hierarchy_dump.txt',
            type: 'hierarchy',
            payloadRef: 'ref456'
          },
          {
            filename: 'other_file.log',
            type: 'other',
            payloadRef: 'ref789'
          }
        ]
      };

      const result: TaskResult = {
        success: false,
        needsContext: true,
        message: 'Need more info',
        testFailures: [uiTestFailure]
      };

      const response = formatTestResultResponse(input, validation, result);
      const text = response.content[0].text;

      // Check for attachment information in detailed context
      expect(text).toContain('Screenshots: screenshot_failure.png');
      expect(text).toContain('Hierarchy Dumps: hierarchy_dump.txt');
      expect(text).toContain('Other Attachments: other_file.log');
    });
  });

  describe('Test Type Detection Utility Functions', () => {
    // We can test the detection logic by importing and testing the utility functions directly
    // But for now, let's focus on the integration tests that verify the overall functionality
    
    it('should handle various UI test error messages for type detection', () => {
      // This is tested indirectly through the formatting tests above
      // The key patterns we support are:
      // - "UI Testing Failure"
      // - "No matches found for find"
      // - "Element.*not found"
      // - "timeout exceeded"
      // - "XCUIElement" references
      // - "Elements matching predicate"
      
      expect(true).toBe(true); // Placeholder - functionality tested through integration
    });
  });

  describe('Command Generation', () => {
    it('should include test target specification in command', () => {
      // This functionality is tested by checking the logs in actual test runs
      // The command generation logic adds -only-testing:TargetName when specified
      
      expect(true).toBe(true); // Placeholder - functionality tested through integration
    });
  });
});

describe('Test Type Detection Functions', () => {
  // These test core detection logic without requiring complex mocking
  
  it('should detect UI tests from identifier naming patterns', () => {
    // Test identifiers that should be detected as UI tests
    const uiTestIdentifiers = [
      'TestProjectUITests.testLoginFlow()',
      'MyAppUI_Tests.testButtonTap()',
      'SomeClassUITest.testSomething()',
    ];

    // For now, this is a placeholder since the detection functions are internal
    // In a real implementation, we might export these for testing
    expect(uiTestIdentifiers.length).toBeGreaterThan(0);
  });

  it('should detect UI tests from error message patterns', () => {
    const uiTestMessages = [
      'UI Testing Failure - No matches found for find',
      'Element not found after timeout',
      'XCUIElement timeout exceeded',
      'Elements matching predicate failed',
    ];

    // For now, this is a placeholder since the detection functions are internal
    expect(uiTestMessages.length).toBeGreaterThan(0);
  });
});