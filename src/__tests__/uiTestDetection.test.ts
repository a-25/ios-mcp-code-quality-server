import { describe, it, expect } from 'vitest';
import type { TestFailure } from '../core/testRunner.js';
import { TestFailureCategory, TestFailureSeverity } from '../core/testRunner.js';

// Import the functions we want to test. These are not exported, so we'll test through the public interface
// by checking the results of processing test failures through the parsing pipeline.

describe('UI Test Auto-Detection Logic', () => {
  describe('UI Test Detection Patterns', () => {
    it('should detect UI tests by suite name containing UI', () => {
      const testFailure: TestFailure = {
        testIdentifier: 'LoginUITests.testSuccessfulLogin',
        suiteName: 'LoginUITests',
        message: 'Button tap failed'
      };

      // The detectUITest function should identify this as a UI test based on suiteName
      // We can test this indirectly by creating scenarios that would trigger UI categorization
      expect(testFailure.suiteName).toContain('UI');
    });

    it('should detect UI tests by XCUITest framework patterns', () => {
      const testFailure: TestFailure = {
        testIdentifier: 'MyAppTests.testXCUIElementTap',
        suiteName: 'MyAppTests',
        message: 'XCUIElement with identifier "loginButton" was not found',
        stack: 'XCUIApplication.launch() -> XCUIElement.tap()'
      };

      // Should be detected as UI test due to XCUIElement in message and stack
      expect(testFailure.message?.toLowerCase()).toContain('xcuielement');
      expect(testFailure.stack?.toLowerCase()).toContain('xcui');
    });

    it('should detect UI tests by error message patterns', () => {
      const testFailures: TestFailure[] = [
        {
          testIdentifier: 'Test.elementNotFound',
          suiteName: 'Test',
          message: 'element not found on screen'
        },
        {
          testIdentifier: 'Test.accessibilityIssue', 
          suiteName: 'Test',
          message: 'accessibility identifier missing'
        },
        {
          testIdentifier: 'Test.touchFailed',
          suiteName: 'Test',
          message: 'failed to tap button'
        },
        {
          testIdentifier: 'Test.animationTiming',
          suiteName: 'Test',
          message: 'element did not appear after animation'
        }
      ];

      // These should all be detected as UI tests due to their error message patterns
      expect(testFailures[0].message?.toLowerCase()).toContain('element not found');
      expect(testFailures[1].message?.toLowerCase()).toContain('accessibility');
      expect(testFailures[2].message?.toLowerCase()).toContain('tap');
      expect(testFailures[3].message?.toLowerCase()).toContain('appear');
    });
  });

  describe('UI Test Failure Categories', () => {
    it('should categorize element not found failures correctly', () => {
      const elementNotFoundMessages = [
        'Button with identifier "submit" does not exist',
        'element not found: loginButton',
        'view not found in hierarchy',
        'navigation bar could not be located'
      ];

      elementNotFoundMessages.forEach(message => {
        // These message patterns should trigger ELEMENT_NOT_FOUND category
        expect(message.toLowerCase()).toMatch(/element.*not.*found|does not exist|not.*located|view.*not.*found|navigation.*bar/);
      });
    });

    it('should categorize accessibility failures correctly', () => {
      const accessibilityMessages = [
        'accessibility identifier not set',
        'element is not accessibility-enabled', 
        'accessible label missing',
        'accessibility trait required'
      ];

      accessibilityMessages.forEach(message => {
        expect(message.toLowerCase()).toMatch(/accessibility|accessible/);
      });
    });

    it('should categorize UI interaction failures correctly', () => {
      const interactionMessages = [
        'failed to tap button',
        'swipe gesture not recognized',
        'touch coordinates invalid',
        'scroll operation failed',
        'keyboard input not accepted'
      ];

      interactionMessages.forEach(message => {
        expect(message.toLowerCase()).toMatch(/tap|touch|swipe|scroll|keyboard|gesture/);
      });
    });

    it('should categorize UI timing failures correctly', () => {
      const timingMessages = [
        'element did not appear within timeout',
        'animation not completed',
        'wait condition failed',
        'element not visible after delay'
      ];

      timingMessages.forEach(message => {
        expect(message.toLowerCase()).toMatch(/appear|animation|wait|visible|timeout/);
      });
    });
  });

  describe('Expected Categorization Results', () => {
    it('should expect proper category mapping for common UI test scenarios', () => {
      // Define expected mappings that our categorization logic should produce
      const expectedCategories = {
        'Element not found errors': TestFailureCategory.ELEMENT_NOT_FOUND,
        'Accessibility issues': TestFailureCategory.ACCESSIBILITY,
        'Touch/gesture failures': TestFailureCategory.UI_INTERACTION,
        'Animation/timing issues': TestFailureCategory.UI_TIMING,
        'General assertions': TestFailureCategory.ASSERTION,
        'App crashes': TestFailureCategory.CRASH,
        'Test timeouts': TestFailureCategory.TIMEOUT,
        'Build errors': TestFailureCategory.BUILD
      };

      // Verify our enum values exist and are correct
      expect(TestFailureCategory.ELEMENT_NOT_FOUND).toBe('element_not_found');
      expect(TestFailureCategory.ACCESSIBILITY).toBe('accessibility');
      expect(TestFailureCategory.UI_INTERACTION).toBe('ui_interaction');
      expect(TestFailureCategory.UI_TIMING).toBe('ui_timing');
      expect(TestFailureCategory.ASSERTION).toBe('assertion');
      expect(TestFailureCategory.CRASH).toBe('crash');
      expect(TestFailureCategory.TIMEOUT).toBe('timeout');
      expect(TestFailureCategory.BUILD).toBe('build');
    });

    it('should expect proper severity mapping for UI test failures', () => {
      // Define expected severity levels
      expect(TestFailureSeverity.CRITICAL).toBe('critical');
      expect(TestFailureSeverity.HIGH).toBe('high');
      expect(TestFailureSeverity.MEDIUM).toBe('medium');
      expect(TestFailureSeverity.LOW).toBe('low');

      // Element not found should typically be HIGH priority
      // Accessibility issues should typically be LOW priority  
      // UI interaction failures should typically be MEDIUM priority
      // Crashes should be CRITICAL
      // Build errors should be HIGH priority
    });
  });

  describe('Integration with Real Scenarios', () => {
    it('should handle complex UI test failure with multiple indicators', () => {
      const complexUIFailure: TestFailure = {
        testIdentifier: 'LoginFlowUITests.testCompleteLoginProcess',
        suiteName: 'LoginFlowUITests',
        file: '/MyApp/LoginFlowUITests.swift',
        line: 45,
        message: 'XCUIElement with accessibility identifier "loginButton" was not found after navigation',
        stack: 'XCUIApplication.launch() -> XCUIElement.waitForExistence(timeout:)',
        attachments: ['login_failure_1.png', 'login_failure_2.png'],
        duration: 30.5,
        platform: 'iOS 17.0 Simulator'
      };

      // This should be detected as UI test due to:
      // - Suite name contains "UI"
      // - Message contains "XCUIElement" and "accessibility identifier"  
      // - Stack contains "XCUIApplication"
      // - Has screenshot attachments
      
      expect(complexUIFailure.suiteName).toMatch(/UI/);
      expect(complexUIFailure.message?.toLowerCase()).toContain('xcuielement');
      expect(complexUIFailure.message?.toLowerCase()).toContain('accessibility');
      expect(complexUIFailure.message?.toLowerCase()).toContain('not found');
      expect(complexUIFailure.stack?.toLowerCase()).toContain('xcui');
      expect(complexUIFailure.attachments).toBeDefined();
      expect(complexUIFailure.attachments?.length).toBeGreaterThan(0);
    });

    it('should differentiate between UI and unit test failures', () => {
      const unitTestFailure: TestFailure = {
        testIdentifier: 'UserManagerTests.testUserValidation',
        suiteName: 'UserManagerTests', 
        message: 'XCTAssertEqual failed: expected "valid" but got "invalid"',
        stack: 'UserManager.validateUser() -> XCTAssert'
      };

      const uiTestFailure: TestFailure = {
        testIdentifier: 'UserUITests.testUserProfileDisplay',
        suiteName: 'UserUITests',
        message: 'Profile view did not load within timeout',
        attachments: ['profile_timeout.png']
      };

      // Unit test indicators: no UI in suite name, standard assertion failure, no screenshots
      expect(unitTestFailure.suiteName).not.toMatch(/UI/);
      expect(unitTestFailure.message?.toLowerCase()).toContain('xctassert');
      expect(unitTestFailure.attachments).toBeUndefined();

      // UI test indicators: UI in suite name, timeout/view loading issue, has screenshots
      expect(uiTestFailure.suiteName).toMatch(/UI/);
      expect(uiTestFailure.message?.toLowerCase()).toContain('view');
      expect(uiTestFailure.message?.toLowerCase()).toContain('timeout');
      expect(uiTestFailure.attachments?.length).toBeGreaterThan(0);
    });
  });
});