import { describe, it, expect, vi } from 'vitest';
import { validateTestFixOptions, type TestFixOptions } from '../core/taskOptions.js';
import { runTestsAndParseFailures } from '../core/testRunner.js';
import type { SpawnOutputResult } from '../utils/spawnAndCollectOutput.js';

describe('xcodebuild Parameter Validation', () => {
  describe('Critical xcodebuild specification compliance', () => {
    describe('Project vs Workspace mutual exclusion', () => {
      it('should reject when both xcodeproj and xcworkspace are provided', () => {
        const options: Partial<TestFixOptions> = {
          xcodeproj: 'MyApp.xcodeproj',
          xcworkspace: 'MyApp.xcworkspace', // CONFLICT: Cannot use both
          scheme: 'MyApp'
        };

        const result = validateTestFixOptions(options);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Cannot specify both xcodeproj and xcworkspace - they are mutually exclusive');
      });

      it('should accept xcworkspace with scheme (valid workspace build)', () => {
        const options: TestFixOptions = {
          xcworkspace: 'MyApp.xcworkspace',
          scheme: 'MyApp'
        };

        const result = validateTestFixOptions(options);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept xcodeproj with scheme (valid project build)', () => {
        const options: TestFixOptions = {
          xcodeproj: 'MyApp.xcodeproj',
          scheme: 'MyApp'
        };

        const result = validateTestFixOptions(options);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('Workspace requires scheme', () => {
      it('should reject xcworkspace without scheme', () => {
        const options: Partial<TestFixOptions> = {
          xcworkspace: 'MyApp.xcworkspace'
          // Missing scheme - required for workspace builds
        };

        const result = validateTestFixOptions(options);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Scheme is required when using xcworkspace');
      });
    });

    describe('Test identifier format validation', () => {
      it('should accept valid test identifiers', () => {
        const validIdentifiers = [
          'MyAppTests',                                    // TestTarget
          'MyAppTests/LoginTests',                         // TestTarget/TestClass  
          'MyAppTests/LoginTests/testValidLogin',          // TestTarget/TestClass/TestMethod
          'UITests/HomeScreenTests/testNavigationFlow',    // Complex but valid
          'My_App_Tests/Login_Tests/test_Valid_Login',     // Underscores allowed
          'TestTarget123/TestClass456/testMethod789'       // Numbers allowed
        ];

        for (const testId of validIdentifiers) {
          const options: TestFixOptions = {
            xcodeproj: 'MyApp.xcodeproj',
            scheme: 'MyApp',
            tests: [testId]
          };

          const result = validateTestFixOptions(options);

          expect(result.valid).toBe(true, `Should accept valid test identifier: ${testId}`);
          expect(result.error).toBeUndefined();
        }
      });

      it('should reject invalid test identifiers', () => {
        const invalidIdentifiers = [
          '123InvalidStart',                    // Cannot start with number
          'Test-Target/TestClass',              // Hyphens not allowed
          'TestTarget/',                        // Empty component after /
          'TestTarget//TestClass',              // Double slash
          '/TestClass',                         // Cannot start with /
          'TestTarget/TestClass/',              // Cannot end with /
          'TestTarget/TestClass/testMethod/extra', // Too many components
          'Test Target/TestClass',              // Spaces not allowed
          'TestTarget.TestClass',               // Dots not allowed in identifier
          'TestTarget/Test-Class',              // Hyphens in class name
          'TestTarget/TestClass/test-method'    // Hyphens in method name
        ];

        for (const testId of invalidIdentifiers) {
          const options: TestFixOptions = {
            xcodeproj: 'MyApp.xcodeproj',
            scheme: 'MyApp',
            tests: [testId]
          };

          const result = validateTestFixOptions(options);

          expect(result.valid).toBe(false, `Should reject invalid test identifier: ${testId}`);
          expect(result.error).toContain('Invalid test identifier format');
          expect(result.error).toContain(testId);
        }
      });

      it('should provide correct format guidance in error message', () => {
        const options: TestFixOptions = {
          xcodeproj: 'MyApp.xcodeproj',
          scheme: 'MyApp',
          tests: ['invalid-identifier']
        };

        const result = validateTestFixOptions(options);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Expected format: TestTarget[/TestClass[/TestMethod]]');
      });

      it('should handle empty string test identifiers separately', () => {
        const options: TestFixOptions = {
          xcodeproj: 'MyApp.xcodeproj',
          scheme: 'MyApp',
          tests: ['']
        };

        const result = validateTestFixOptions(options);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Each test name must be a non-empty string');
      });
    });
  });

  describe('xcodebuild command generation', () => {
    it('should generate command with workspace only (not both workspace and project)', async () => {
      const capturedCommand = vi.fn();
      const mockSpawnAndCollectOutput = async (cmd: string): Promise<SpawnOutputResult> => {
        capturedCommand(cmd);
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcworkspace: 'MyApp.xcworkspace',
        scheme: 'MyAppTests'
      };

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      const calledCommand = capturedCommand.mock.calls[0][0];
      expect(calledCommand).toContain('-workspace "MyApp.xcworkspace"');
      expect(calledCommand).not.toContain('-project');
    });

    it('should generate command with project only when no workspace provided', async () => {
      const capturedCommand = vi.fn();
      const mockSpawnAndCollectOutput = async (cmd: string): Promise<SpawnOutputResult> => {
        capturedCommand(cmd);
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyAppTests'
      };

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      const calledCommand = capturedCommand.mock.calls[0][0];
      expect(calledCommand).toContain('-project "MyApp.xcodeproj"');
      expect(calledCommand).not.toContain('-workspace');
    });

    it('should handle projects/workspaces with spaces correctly', async () => {
      const capturedCommand = vi.fn();
      const mockSpawnAndCollectOutput = async (cmd: string): Promise<SpawnOutputResult> => {
        capturedCommand(cmd);
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcworkspace: 'My Complex App.xcworkspace',
        scheme: 'My App Tests'
      };

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      const calledCommand = capturedCommand.mock.calls[0][0];
      expect(calledCommand).toContain('-workspace "My Complex App.xcworkspace"');
      expect(calledCommand).toContain('-scheme "My App Tests"');
    });

    it('should trim test identifiers before using in command', async () => {
      const capturedCommand = vi.fn();
      const mockSpawnAndCollectOutput = async (cmd: string): Promise<SpawnOutputResult> => {
        capturedCommand(cmd);
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyAppTests',
        tests: ['  MyAppTests/LoginTests/testValidLogin  '] // With spaces
      };

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      const calledCommand = capturedCommand.mock.calls[0][0];
      expect(calledCommand).toContain('-only-testing:"MyAppTests/LoginTests/testValidLogin"');
      expect(calledCommand).not.toContain('  '); // Should not contain the extra spaces
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle missing project source gracefully', () => {
      const options: Partial<TestFixOptions> = {
        scheme: 'MyApp'
        // Neither xcodeproj nor xcworkspace provided
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Either xcodeproj or xcworkspace must be provided');
    });

    it('should handle empty string project sources', () => {
      const options: Partial<TestFixOptions> = {
        xcodeproj: '',
        xcworkspace: '',
        scheme: 'MyApp'
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Either xcodeproj or xcworkspace must be provided');
    });

    it('should handle whitespace-only test identifiers', () => {
      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyApp',
        tests: ['   ', '\t', '\n']
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Each test name must be a non-empty string');
    });

    it('should handle mixed valid and invalid test identifiers', () => {
      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyApp',
        tests: [
          'ValidTestTarget/ValidClass/validMethod', // Valid
          'invalid-identifier',                      // Invalid - contains hyphen
          'AnotherValidTarget'                       // Valid
        ]
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid test identifier format: "invalid-identifier"');
    });

    it('should validate destination parameter format implicitly', async () => {
      // Although not explicitly validated, destinations should work with xcodebuild
      const capturedCommand = vi.fn();
      const mockSpawnAndCollectOutput = async (cmd: string): Promise<SpawnOutputResult> => {
        capturedCommand(cmd);
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyAppTests',
        destination: 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.0'
      };

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      const calledCommand = capturedCommand.mock.calls[0][0];
      expect(calledCommand).toContain('-destination "platform=iOS Simulator,name=iPhone 15 Pro,OS=17.0"');
    });

    it('should use default destination when not provided', async () => {
      const capturedCommand = vi.fn();
      const mockSpawnAndCollectOutput = async (cmd: string): Promise<SpawnOutputResult> => {
        capturedCommand(cmd);
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcworkspace: 'MyApp.xcworkspace',
        scheme: 'MyAppTests'
        // No destination provided
      };

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      const calledCommand = capturedCommand.mock.calls[0][0];
      expect(calledCommand).toContain('-destination "generic/platform=iOS Simulator"');
    });
  });

  describe('Complex real-world scenarios', () => {
    it('should handle complete workspace setup with multiple test identifiers', async () => {
      const capturedCommand = vi.fn();
      const mockSpawnAndCollectOutput = async (cmd: string): Promise<SpawnOutputResult> => {
        capturedCommand(cmd);
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcworkspace: 'MyComplexApp.xcworkspace',
        scheme: 'MyComplexAppTests',
        destination: 'platform=iOS Simulator,name=iPhone 15',
        tests: [
          'MyAppTests/AuthenticationTests/testValidLogin',
          'MyAppTests/AuthenticationTests/testInvalidCredentials',
          'MyAppUITests/HomeScreenTests/testNavigationFlow'
        ],
        target: 'regression'
      };

      // First validate the options
      const validation = validateTestFixOptions(options);
      expect(validation.valid).toBe(true);

      // Then test command generation
      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      const calledCommand = capturedCommand.mock.calls[0][0];
      
      // Verify all components are present and correctly formatted
      expect(calledCommand).toContain('xcodebuild test');
      expect(calledCommand).toContain('-workspace "MyComplexApp.xcworkspace"');
      expect(calledCommand).not.toContain('-project'); // Should not include project when workspace is used
      expect(calledCommand).toContain('-scheme "MyComplexAppTests"');
      expect(calledCommand).toContain('-destination "platform=iOS Simulator,name=iPhone 15"');
      expect(calledCommand).toContain('-only-testing:"MyAppTests/AuthenticationTests/testValidLogin"');
      expect(calledCommand).toContain('-only-testing:"MyAppTests/AuthenticationTests/testInvalidCredentials"');
      expect(calledCommand).toContain('-only-testing:"MyAppUITests/HomeScreenTests/testNavigationFlow"');
      expect(calledCommand).toContain('-resultBundlePath');
    });

    it('should handle project-only setup correctly', async () => {
      const capturedCommand = vi.fn();
      const mockSpawnAndCollectOutput = async (cmd: string): Promise<SpawnOutputResult> => {
        capturedCommand(cmd);
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcodeproj: 'SimpleApp.xcodeproj',
        scheme: 'SimpleAppTests',
        tests: ['SimpleAppTests/BasicTests']
      };

      const validation = validateTestFixOptions(options);
      expect(validation.valid).toBe(true);

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      const calledCommand = capturedCommand.mock.calls[0][0];
      
      expect(calledCommand).toContain('-project "SimpleApp.xcodeproj"');
      expect(calledCommand).not.toContain('-workspace'); // Should not include workspace when project is used
      expect(calledCommand).toContain('-scheme "SimpleAppTests"');
      expect(calledCommand).toContain('-only-testing:"SimpleAppTests/BasicTests"');
    });
  });
});