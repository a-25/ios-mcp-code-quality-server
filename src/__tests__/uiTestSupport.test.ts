import { describe, it, expect } from 'vitest';
import { formatTestResultResponse } from '../core/formatTestResultResponse.js';
import type { TestFixOptions } from '../core/taskOptions.js';
import type { TaskResult } from '../core/taskOrchestrator.js';
import { TaskErrorType } from '../core/taskOrchestrator.js';
import type { TestFailure } from '../core/testRunner.js';
import { TestFailureCategory, TestFailureSeverity } from '../core/testRunner.js';

describe('UI Test Support', () => {
  const baseInput: TestFixOptions = {
    scheme: 'MyAppUITests',
    xcodeproj: 'MyApp.xcodeproj',
    destination: 'platform=iOS Simulator,name=iPhone 15'
  };

  const getValidation = (input: any) => ({ 
    valid: !input.invalid, 
    error: input.invalid ? 'Invalid input' : undefined 
  });

  describe('UI Test Detection', () => {
    it('should detect UI tests by suite name containing UI', () => {
      const uiTestFailure: TestFailure = {
        testIdentifier: 'LoginFlowUITests.testSuccessfulLogin',
        suiteName: 'LoginFlowUITests',
        file: '/path/to/LoginFlowUITests.swift',
        line: 15,
        message: 'Button not found on screen',
        severity: TestFailureSeverity.HIGH,
        category: TestFailureCategory.ELEMENT_NOT_FOUND,
        isUITest: true,
        suggestions: ['Verify the element exists in the current view hierarchy']
      };

      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: [uiTestFailure]
      };

      const response = formatTestResultResponse(baseInput, getValidation(baseInput), result);
      
      expect(response._meta?.structured?.failures?.[0]?.test).toBe('LoginFlowUITests.testSuccessfulLogin');
      expect(response._meta?.structured?.failures?.[0]?.category).toBe(TestFailureCategory.ELEMENT_NOT_FOUND);
      expect(response.content[0].text).toContain('Button not found on screen');
    });

    it('should detect UI tests by XCUITest framework usage', () => {
      const uiTestFailure: TestFailure = {
        testIdentifier: 'AppUITests.testNavigationFlow',
        suiteName: 'AppUITests',
        message: 'XCUIElement with identifier "loginButton" was not found',
        stack: 'XCTContext.runActivity(named:block:) -> XCUIApplication.launch()',
        severity: TestFailureSeverity.HIGH,
        category: TestFailureCategory.ELEMENT_NOT_FOUND,
        isUITest: true,
        suggestions: ['Check if the element accessibility identifier is correct']
      };

      expect(uiTestFailure.isUITest).toBe(true);
      expect(uiTestFailure.category).toBe(TestFailureCategory.ELEMENT_NOT_FOUND);
    });

    it('should detect UI tests by error message patterns', () => {
      const uiTestFailure: TestFailure = {
        testIdentifier: 'SampleTests.testButtonTap',
        suiteName: 'SampleTests',
        message: 'Failed to tap element at coordinates (100, 200)',
        severity: TestFailureSeverity.MEDIUM,
        category: TestFailureCategory.UI_INTERACTION,
        isUITest: true,
        suggestions: ['Ensure element is hittable before attempting interaction']
      };

      expect(uiTestFailure.isUITest).toBe(true);
      expect(uiTestFailure.category).toBe(TestFailureCategory.UI_INTERACTION);
    });
  });

  describe('UI Test Failure Categories', () => {
    it('should categorize different UI test failure types correctly', () => {
      const testCases = [
        {
          name: 'element not found',
          testFailure: {
            testIdentifier: 'CheckoutUITests.testPurchaseButton',
            suiteName: 'CheckoutUITests',
            message: 'Button with identifier "purchaseButton" does not exist',
            severity: TestFailureSeverity.HIGH,
            category: TestFailureCategory.ELEMENT_NOT_FOUND,
            isUITest: true,
            suggestions: ['Verify the element exists in the current view hierarchy']
          },
          expectedCategory: TestFailureCategory.ELEMENT_NOT_FOUND,
          expectedSeverity: TestFailureSeverity.HIGH
        },
        {
          name: 'accessibility',
          testFailure: {
            testIdentifier: 'AccessibilityUITests.testVoiceOverSupport',
            suiteName: 'AccessibilityUITests',
            message: 'Element missing accessibility identifier for automated testing',
            severity: TestFailureSeverity.LOW,
            category: TestFailureCategory.ACCESSIBILITY,
            isUITest: true,
            suggestions: ['Verify accessibility identifiers are set on UI elements']
          },
          expectedCategory: TestFailureCategory.ACCESSIBILITY,
          expectedSeverity: TestFailureSeverity.LOW
        },
        {
          name: 'ui interaction',
          testFailure: {
            testIdentifier: 'InteractionUITests.testSwipeGesture',
            suiteName: 'InteractionUITests',
            message: 'Failed to perform swipe gesture on table view',
            severity: TestFailureSeverity.MEDIUM,
            category: TestFailureCategory.UI_INTERACTION,
            isUITest: true,
            suggestions: ['Ensure element is hittable before attempting interaction']
          },
          expectedCategory: TestFailureCategory.UI_INTERACTION,
          expectedSeverity: TestFailureSeverity.MEDIUM
        },
        {
          name: 'ui timing',
          testFailure: {
            testIdentifier: 'TimingUITests.testLoadingState',
            suiteName: 'TimingUITests',
            message: 'Element did not appear within timeout period',
            severity: 'low',
            category: 'ui_timing',
            isUITest: true,
            suggestions: ['Add explicit waits for animations to complete']
          },
          expectedCategory: 'ui_timing',
          expectedSeverity: 'low'
        }
      ];

      testCases.forEach(({ name, testFailure, expectedCategory, expectedSeverity }) => {
        const result: TaskResult<string> = {
          success: false,
          error: TaskErrorType.TEST_FAILURES,
          testFailures: [testFailure]
        };

        const response = formatTestResultResponse(baseInput, getValidation(baseInput), result);
        
        expect(response._meta?.structured?.failures?.[0]?.category).toBe(expectedCategory);
        expect(response._meta?.structured?.failures?.[0]?.severity).toBe(expectedSeverity);
        expect(response._meta?.structured?.failures?.[0]?.suggestions).toContain(testFailure.suggestions[0]);
      });
    });
  });

  describe('UI Test Specific Suggestions', () => {
    it('should provide UI-specific suggestions for assertion failures', () => {
      const uiAssertionFailure: TestFailure = {
        testIdentifier: 'LoginUITests.testLoginButtonState',
        suiteName: 'LoginUITests',
        message: 'XCTAssertTrue failed: Login button should be enabled',
        severity: 'medium',
        category: 'assertion',
        isUITest: true,
        suggestions: [
          'Verify UI state matches expected conditions',
          'Check element properties (text, enabled state, visibility)'
        ]
      };

      expect(uiAssertionFailure.suggestions).toContain('Verify UI state matches expected conditions');
      expect(uiAssertionFailure.suggestions).toContain('Check element properties (text, enabled state, visibility)');
    });

    it('should provide UI-specific suggestions for crash failures', () => {
      const uiCrashFailure: TestFailure = {
        testIdentifier: 'UITests.testCrashScenario',
        suiteName: 'UITests',
        message: 'Test crashed with SIGABRT in UI thread',
        severity: 'critical',
        category: 'crash',
        isUITest: true,
        suggestions: [
          'Check for nil pointer dereferences or memory issues',
          'Verify UI operations are performed on main thread'
        ]
      };

      expect(uiCrashFailure.suggestions).toContain('Verify UI operations are performed on main thread');
    });

    it('should provide UI-specific suggestions for timeout failures', () => {
      const uiTimeoutFailure: TestFailure = {
        testIdentifier: 'UITests.testSlowLoading',
        suiteName: 'UITests',
        message: 'Test timed out waiting for element to appear',
        severity: 'low',
        category: 'timeout',
        isUITest: true,
        suggestions: [
          'Increase timeout values for UI animations',
          'Check for blocking UI operations or network calls'
        ]
      };

      expect(uiTimeoutFailure.suggestions).toContain('Increase timeout values for UI animations');
      expect(uiTimeoutFailure.suggestions).toContain('Check for blocking UI operations or network calls');
    });

    it('should provide UI-specific suggestions for network-related failures', () => {
      const networkUIFailure: TestFailure = {
        testIdentifier: 'NetworkUITests.testAPIIntegration',
        suiteName: 'NetworkUITests',
        message: 'Network request failed, UI not updated',
        severity: 'medium',
        category: 'other',
        isUITest: true,
        suggestions: [
          'Mock network responses for consistent UI test results',
          'Add wait conditions for network-dependent UI updates'
        ]
      };

      expect(networkUIFailure.suggestions).toContain('Mock network responses for consistent UI test results');
      expect(networkUIFailure.suggestions).toContain('Add wait conditions for network-dependent UI updates');
    });
  });

  describe('Real UI Test Failure Scenarios', () => {
    it('should handle real XCUITest element not found error', () => {
      const realUITestFailure: TestFailure = {
        testIdentifier: 'MyAppUITests.testLoginFlow',
        suiteName: 'MyAppUITests',
        file: '/Users/dev/MyApp/MyAppUITests/LoginUITests.swift',
        line: 23,
        message: 'Neither element nor any descendant has keyboard focus. Element: Application 0x600000c04c80: {{0.0, 0.0}, {390.0, 844.0}}, label: \'MyApp\', identifier: \'MyApp\'',
        stack: 'XCUIElement.typeText(_:) -> XCUIElement.tap() -> XCTFail(_:file:line:)',
        attachments: ['screenshot_failure_1.png', 'screenshot_failure_2.png'],
        duration: 15.2,
        platform: 'iOS 17.0 Simulator',
        severity: 'high',
        category: 'element_not_found',
        isUITest: true,
        suggestions: [
          'Verify the element exists in the current view hierarchy',
          'Check if the element accessibility identifier is correct',
          'Add explicit wait for element to appear before interacting'
        ]
      };

      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: [realUITestFailure]
      };

      const response = formatTestResultResponse(baseInput, getValidation(baseInput), result);
      
      // Verify comprehensive response structure
      expect(response._meta?.structured?.failures).toHaveLength(1);
      expect(response._meta?.structured?.failures?.[0]?.test).toBe('MyAppUITests.testLoginFlow');
      expect(response._meta?.structured?.failures?.[0]?.category).toBe('element_not_found');
      expect(response._meta?.structured?.failures?.[0]?.severity).toBe('high');
      expect(response._meta?.structured?.failures?.[0]?.file).toBe('/Users/dev/MyApp/MyAppUITests/LoginUITests.swift');
      expect(response._meta?.structured?.failures?.[0]?.line).toBe(23);
      
      // Verify UI-specific content
      expect(response.content[0].text).toContain('🟠 **HIGH Priority (1 failure)**');
      expect(response.content[0].text).toContain('Neither element nor any descendant has keyboard focus');
      expect(response.content[0].text).toContain('screenshot_failure_1.png');
      expect(response.content[0].text).toContain('Add explicit wait for element to appear');
    });

    it('should handle real XCUITest accessibility error', () => {
      const accessibilityFailure: TestFailure = {
        testIdentifier: 'AccessibilityUITests.testVoiceOverNavigation',
        suiteName: 'AccessibilityUITests',
        message: 'XCUIElement query "buttons[\"Login\"]" could not be resolved because the element is not accessibility-enabled',
        severity: 'low',
        category: 'accessibility',
        isUITest: true,
        suggestions: [
          'Verify accessibility identifiers are set on UI elements',
          'Ensure VoiceOver accessibility is properly configured',
          'Add accessibility traits to help identify element types'
        ]
      };

      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: [accessibilityFailure]
      };

      const response = formatTestResultResponse(baseInput, getValidation(baseInput), result);
      
      expect(response._meta?.structured?.failures?.[0]?.category).toBe('accessibility');
      expect(response._meta?.structured?.failures?.[0]?.severity).toBe('low');
      expect(response.content[0].text).toContain('accessibility-enabled');
      expect(response.content[0].text).toContain('VoiceOver accessibility');
    });

    it('should handle multiple UI test failures with different categories', () => {
      const multipleUIFailures: TestFailure[] = [
        {
          testIdentifier: 'UITests.testElementNotFound',
          suiteName: 'UITests',
          message: 'Button not found',
          severity: 'high',
          category: 'element_not_found',
          isUITest: true,
          suggestions: ['Check element identifier']
        },
        {
          testIdentifier: 'UITests.testSlowAnimation',
          suiteName: 'UITests', 
          message: 'Animation did not complete in time',
          severity: 'low',
          category: 'ui_timing',
          isUITest: true,
          suggestions: ['Add wait for animation']
        },
        {
          testIdentifier: 'UITests.testTapFailed',
          suiteName: 'UITests',
          message: 'Could not tap button - element not hittable',
          severity: 'medium',
          category: 'ui_interaction',
          isUITest: true,
          suggestions: ['Check element is visible and enabled']
        }
      ];

      const result: TaskResult<string> = {
        success: false,
        error: TaskErrorType.TEST_FAILURES,
        testFailures: multipleUIFailures
      };

      const response = formatTestResultResponse(baseInput, getValidation(baseInput), result);
      
      expect(response._meta?.structured?.failures).toHaveLength(3);
      expect(response._meta?.structured?.summary?.totalFailures).toBe(3);
      
      // Check different categories are represented
      const categories = response._meta?.structured?.failures?.map(f => f.category);
      expect(categories).toContain('element_not_found');
      expect(categories).toContain('ui_timing');
      expect(categories).toContain('ui_interaction');
      
      // Check for UI-specific suggestions
      expect(response.content[0].text).toContain('Check element identifier');
      expect(response.content[0].text).toContain('Add wait for animation');
      expect(response.content[0].text).toContain('Check element is visible and enabled');
    });
  });
});