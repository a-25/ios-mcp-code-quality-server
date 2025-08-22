import { describe, it, expect, vi } from 'vitest';
import uiTestFailureMock from './mockData/uiTestFailureMock.json' with { type: 'json' };
import uiTestDetailsMock from './mockData/uiTestDetailsMock.json' with { type: 'json' };

// Mock execAsync and getXcresultObject before importing testRunner functions
vi.mock('../core/testRunner.js', async () => {
  const actual = await vi.importActual('../core/testRunner.js');
  return {
    ...actual,
    getXcresultObject: vi.fn()
      .mockImplementationOnce(() => Promise.resolve(uiTestFailureMock)) // First call returns root
      .mockImplementation((xcresultPath: string, id?: string) => {
        if (id && id.includes('UITestRef')) {
          return Promise.resolve(uiTestDetailsMock); // Return details when id is provided
        }
        return Promise.resolve(uiTestFailureMock); // Default to root mock
      }),
  };
});

import { runTestsAndParseFailures } from '../core/testRunner.js';
import { formatTestResultResponse } from '../core/formatTestResultResponse.js';
import type { TaskResult } from '../core/taskOrchestrator.js';
import type { TestFixOptions } from '../core/taskOptions.js';

describe('UI Test Support', () => {
  const getValidation = (input: any) => ({ valid: !input.invalid, error: input.invalid ? 'Invalid input' : undefined });

  describe('UI Test Detection', () => {
    it('should detect UI tests from test identifier', async () => {
      const mockSpawnAndCollectOutput = async (cmd: string) => ({ 
        stdout: 'Test run completed', 
        stderr: '' 
      });
      
      // Mock the xcresulttool parsing to return UI test data
      const options: TestFixOptions = { 
        scheme: 'TestScheme', 
        xcodeproj: 'TestProj.xcodeproj',
        testType: 'ui'
      };
      
      const result = await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);
      
      // Should have parsed the UI test failures
      expect(result.testFailures.length).toBeGreaterThan(0);
      
      const uiTestFailure = result.testFailures.find(f => f.testType === 'ui');
      expect(uiTestFailure).toBeDefined();
      expect(uiTestFailure?.testIdentifier).toContain('UITests');
    });

    it('should detect UI test type from error message patterns', async () => {
      const mockSpawnAndCollectOutput = async (cmd: string) => ({ 
        stdout: 'Test run completed', 
        stderr: '' 
      });
      
      const options: TestFixOptions = { 
        scheme: 'TestScheme', 
        xcodeproj: 'TestProj.xcodeproj',
        testType: 'all'
      };
      
      const result = await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);
      
      const uiTestFailures = result.testFailures.filter(f => f.testType === 'ui');
      expect(uiTestFailures.length).toBeGreaterThan(0);
      
      // Check that UI-specific error patterns are detected
      const elementNotFoundFailure = uiTestFailures.find(f => 
        f.message?.includes('No matches found for find') || 
        f.message?.includes('Element.*not found')
      );
      expect(elementNotFoundFailure).toBeDefined();
    });
  });

  describe('UI Test Context Parsing', () => {
    it('should parse element identifier from UI test failures', async () => {
      const mockSpawnAndCollectOutput = async (cmd: string) => ({ 
        stdout: 'Test run completed', 
        stderr: '' 
      });
      
      const options: TestFixOptions = { 
        scheme: 'TestScheme', 
        xcodeproj: 'TestProj.xcodeproj',
        testType: 'ui'
      };
      
      const result = await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);
      
      const uiFailureWithElement = result.testFailures.find(f => 
        f.uiContext?.elementIdentifier
      );
      
      expect(uiFailureWithElement).toBeDefined();
      expect(uiFailureWithElement?.uiContext?.elementIdentifier).toBeTruthy();
    });

    it('should identify timeout errors in UI tests', async () => {
      const mockSpawnAndCollectOutput = async (cmd: string) => ({ 
        stdout: 'Test run completed', 
        stderr: '' 
      });
      
      const options: TestFixOptions = { 
        scheme: 'TestScheme', 
        xcodeproj: 'TestProj.xcodeproj',
        testType: 'ui'
      };
      
      const result = await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);
      
      const timeoutFailure = result.testFailures.find(f => 
        f.uiContext?.isTimeoutError
      );
      
      expect(timeoutFailure).toBeDefined();
      expect(timeoutFailure?.uiContext?.timeoutDuration).toBeGreaterThan(0);
    });

    it('should identify element not found errors', async () => {
      const mockSpawnAndCollectOutput = async (cmd: string) => ({ 
        stdout: 'Test run completed', 
        stderr: '' 
      });
      
      const options: TestFixOptions = { 
        scheme: 'TestScheme', 
        xcodeproj: 'TestProj.xcodeproj',
        testType: 'ui'
      };
      
      const result = await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);
      
      const elementNotFoundFailure = result.testFailures.find(f => 
        f.uiContext?.isElementNotFound
      );
      
      expect(elementNotFoundFailure).toBeDefined();
    });
  });

  describe('UI Test Attachments', () => {
    it('should parse screenshots from UI test attachments', async () => {
      const mockSpawnAndCollectOutput = async (cmd: string) => ({ 
        stdout: 'Test run completed', 
        stderr: '' 
      });
      
      const options: TestFixOptions = { 
        scheme: 'TestScheme', 
        xcodeproj: 'TestProj.xcodeproj',
        testType: 'ui',
        includeScreenshots: true
      };
      
      const result = await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);
      
      const failureWithScreenshots = result.testFailures.find(f => 
        f.attachments && f.attachments.some(a => a.type === 'screenshot')
      );
      
      expect(failureWithScreenshots).toBeDefined();
      
      const screenshots = failureWithScreenshots?.attachments?.filter(a => a.type === 'screenshot');
      expect(screenshots).toBeDefined();
      expect(screenshots!.length).toBeGreaterThan(0);
      expect(screenshots![0].filename).toMatch(/\.png$|screenshot/i);
    });

    it('should parse hierarchy dumps from UI test attachments', async () => {
      const mockSpawnAndCollectOutput = async (cmd: string) => ({ 
        stdout: 'Test run completed', 
        stderr: '' 
      });
      
      const options: TestFixOptions = { 
        scheme: 'TestScheme', 
        xcodeproj: 'TestProj.xcodeproj',
        testType: 'ui'
      };
      
      const result = await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);
      
      const failureWithHierarchy = result.testFailures.find(f => 
        f.attachments && f.attachments.some(a => a.type === 'hierarchy')
      );
      
      expect(failureWithHierarchy).toBeDefined();
      
      const hierarchyDumps = failureWithHierarchy?.attachments?.filter(a => a.type === 'hierarchy');
      expect(hierarchyDumps).toBeDefined();
      expect(hierarchyDumps!.length).toBeGreaterThan(0);
      expect(hierarchyDumps![0].filename).toMatch(/hierarchy|\.txt$/i);
    });
  });

  describe('UI Test Response Formatting', () => {
    it('should format UI test failures with enhanced context', () => {
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
  });

  describe('Test Target Specification', () => {
    it('should include test target in xcodebuild command when specified', async () => {
      let capturedCommand = '';
      const mockSpawnAndCollectOutput = async (cmd: string) => {
        capturedCommand = cmd;
        return { stdout: 'Test run completed', stderr: '' };
      };
      
      const options: TestFixOptions = { 
        scheme: 'TestScheme', 
        xcodeproj: 'TestProj.xcodeproj',
        testType: 'ui',
        testTarget: 'MyAppUITests'
      };
      
      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);
      
      expect(capturedCommand).toContain('-only-testing:MyAppUITests');
    });

    it('should handle unit test type specification', async () => {
      let capturedCommand = '';
      const mockSpawnAndCollectOutput = async (cmd: string) => {
        capturedCommand = cmd;
        return { stdout: 'Test run completed', stderr: '' };
      };
      
      const options: TestFixOptions = { 
        scheme: 'TestScheme', 
        xcodeproj: 'TestProj.xcodeproj',
        testType: 'unit'
      };
      
      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);
      
      // Command should be built (specific handling may vary)
      expect(capturedCommand).toContain('xcodebuild test');
      expect(capturedCommand).toContain('-scheme "TestScheme"');
    });
  });
});