import { describe, it, expect } from 'vitest';
import type { TestFailure } from '../core/testRunner.js';
import { TestFailureCategory, TestFailureSeverity } from '../core/testRunner.js';

describe('UI Test Detection and Categorization Logic', () => {
  describe('Test Failure Categorization', () => {
    it('should have correct enum values for failure categories', () => {
      // Test that our categorization constants are correct
      expect(TestFailureCategory.ELEMENT_NOT_FOUND).toBe('element_not_found');
      expect(TestFailureCategory.ACCESSIBILITY).toBe('accessibility');
      expect(TestFailureCategory.UI_INTERACTION).toBe('ui_interaction');
      expect(TestFailureCategory.UI_TIMING).toBe('ui_timing');
      expect(TestFailureCategory.ASSERTION).toBe('assertion');
      expect(TestFailureCategory.CRASH).toBe('crash');
    });

    it('should have correct severity levels', () => {
      expect(TestFailureSeverity.CRITICAL).toBe('critical');
      expect(TestFailureSeverity.HIGH).toBe('high');
      expect(TestFailureSeverity.MEDIUM).toBe('medium');
      expect(TestFailureSeverity.LOW).toBe('low');
    });
  });

  describe('Test Failure Data Structure', () => {
    it('should support comprehensive UI test failure data', () => {
      const complexUIFailure: TestFailure = {
        testIdentifier: 'LoginFlowUITests.testCompleteLoginProcess',
        suiteName: 'LoginFlowUITests',
        file: '/MyApp/LoginFlowUITests.swift',
        line: 45,
        message: 'XCUIElement with accessibility identifier "loginButton" was not found after navigation',
        stack: 'XCUIApplication.launch() -> XCUIElement.waitForExistence(timeout:)',
        attachments: ['login_failure_1.png', 'login_failure_2.png'],
        severity: TestFailureSeverity.HIGH,
        category: TestFailureCategory.ELEMENT_NOT_FOUND,
        isUITest: true
      };

      // Verify the structure supports all necessary fields for AI processing
      expect(complexUIFailure.testIdentifier).toBeTruthy();
      expect(complexUIFailure.suiteName).toBeTruthy();
      expect(complexUIFailure.message).toBeTruthy();
      expect(complexUIFailure.severity).toBe(TestFailureSeverity.HIGH);
      expect(complexUIFailure.category).toBe(TestFailureCategory.ELEMENT_NOT_FOUND);
      expect(complexUIFailure.isUITest).toBe(true);
      expect(complexUIFailure.attachments).toHaveLength(2);
    });

    it('should differentiate between UI and unit test failure characteristics', () => {
      const unitTestFailure: TestFailure = {
        testIdentifier: 'UserManagerTests.testUserValidation',
        suiteName: 'UserManagerTests', 
        message: 'XCTAssertEqual failed: expected "valid" but got "invalid"',
        severity: TestFailureSeverity.MEDIUM,
        category: TestFailureCategory.ASSERTION,
        isUITest: false
      };

      const uiTestFailure: TestFailure = {
        testIdentifier: 'UserUITests.testUserProfileDisplay',
        suiteName: 'UserUITests',
        message: 'Profile view did not load within timeout',
        attachments: ['profile_timeout.png'],
        severity: TestFailureSeverity.LOW,
        category: TestFailureCategory.UI_TIMING,
        isUITest: true
      };

      // Verify different characteristics
      expect(unitTestFailure.isUITest).toBe(false);
      expect(unitTestFailure.category).toBe(TestFailureCategory.ASSERTION);
      expect(unitTestFailure.attachments).toBeUndefined();

      expect(uiTestFailure.isUITest).toBe(true);
      expect(uiTestFailure.category).toBe(TestFailureCategory.UI_TIMING);
      expect(uiTestFailure.attachments).toBeDefined();
    });
  });
});