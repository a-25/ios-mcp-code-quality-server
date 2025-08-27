import { describe, it, expect, vi } from 'vitest';
import { runTestsAndParseFailures } from '../core/testRunner.js';
import type { TestFixOptions } from '../core/taskOptions.js';
import type { SpawnOutputResult } from '../utils/spawnAndCollectOutput.js';

describe('Enhanced Test Runner', () => {
  describe('test filtering with specific tests', () => {
    it('should include -only-testing flags for specific tests', async () => {
      const capturedCommand = vi.fn();
      const mockSpawnAndCollectOutput = async (cmd: string): Promise<SpawnOutputResult> => {
        capturedCommand(cmd);
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcworkspace: 'MyApp.xcworkspace',
        scheme: 'MyAppTests',
        tests: ['MyAppTests/LoginTests/testValidLogin', 'MyAppTests/HomeTests/testNavigation']
      };

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      const expectedCommand = expect.stringContaining('-only-testing:"MyAppTests/LoginTests/testValidLogin" -only-testing:"MyAppTests/HomeTests/testNavigation"');
      expect(capturedCommand).toHaveBeenCalledWith(expectedCommand);
    });

    it('should not include -only-testing flags when no specific tests provided', async () => {
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
      expect(calledCommand).not.toContain('-only-testing');
    });

    it('should handle single test correctly', async () => {
      const capturedCommand = vi.fn();
      const mockSpawnAndCollectOutput = async (cmd: string): Promise<SpawnOutputResult> => {
        capturedCommand(cmd);
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcworkspace: 'MyApp.xcworkspace', 
        scheme: 'MyAppTests',
        tests: ['MyAppTests/LoginTests/testValidLogin']
      };

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      const expectedCommand = expect.stringContaining('-only-testing:"MyAppTests/LoginTests/testValidLogin"');
      expect(capturedCommand).toHaveBeenCalledWith(expectedCommand);
    });

    it('should handle empty tests array', async () => {
      const capturedCommand = vi.fn();
      const mockSpawnAndCollectOutput = async (cmd: string): Promise<SpawnOutputResult> => {
        capturedCommand(cmd);
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyAppTests',
        tests: []
      };

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      const calledCommand = capturedCommand.mock.calls[0][0];
      expect(calledCommand).not.toContain('-only-testing');
    });

    it('should properly quote test names with special characters', async () => {
      const capturedCommand = vi.fn();
      const mockSpawnAndCollectOutput = async (cmd: string): Promise<SpawnOutputResult> => {
        capturedCommand(cmd);
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcworkspace: 'My App.xcworkspace',
        scheme: 'My App Tests',
        tests: ['My App Tests/Login Tests/test Valid Login With Spaces']
      };

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      const expectedCommand = expect.stringContaining('-only-testing:"My App Tests/Login Tests/test Valid Login With Spaces"');
      expect(capturedCommand).toHaveBeenCalledWith(expectedCommand);
    });
  });

  describe('target parameter handling', () => {
    it('should log target parameter when provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const mockSpawnAndCollectOutput = async (_cmd: string): Promise<SpawnOutputResult> => {
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyAppTests',
        target: 'unit'
      };

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      expect(consoleSpy).toHaveBeenCalledWith('[MCP] Running tests with target context: unit');
      consoleSpy.mockRestore();
    });

    it('should not log target when not provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const mockSpawnAndCollectOutput = async (_cmd: string): Promise<SpawnOutputResult> => {
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyAppTests'
      };

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      const targetLogCalls = consoleSpy.mock.calls.filter(call => 
        call[0]?.includes && call[0].includes('Running tests with target context')
      );
      expect(targetLogCalls).toHaveLength(0);
      consoleSpy.mockRestore();
    });

    it('should handle various target values', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const mockSpawnAndCollectOutput = async (_cmd: string): Promise<SpawnOutputResult> => {
        return { stdout: 'Test passed', stderr: '' };
      };

      const targets = ['unit', 'integration', 'ui', 'e2e', 'custom-target'];

      for (const target of targets) {
        consoleSpy.mockClear();
        const options: TestFixOptions = {
          xcodeproj: 'MyApp.xcodeproj',
          scheme: 'MyAppTests',
          target
        };

        await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

        expect(consoleSpy).toHaveBeenCalledWith(`[MCP] Running tests with target context: ${target}`);
      }

      consoleSpy.mockRestore();
    });
  });

  describe('combined functionality', () => {
    it('should handle both specific tests and target parameter', async () => {
      const capturedCommand = vi.fn();
      const consoleSpy = vi.spyOn(console, 'log');
      const mockSpawnAndCollectOutput = async (cmd: string): Promise<SpawnOutputResult> => {
        capturedCommand(cmd);
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcworkspace: 'MyApp.xcworkspace',
        scheme: 'MyAppTests',
        tests: ['MyAppTests/LoginTests/testValidLogin'],
        target: 'integration',
        destination: 'platform=iOS Simulator,name=iPhone 15'
      };

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      // Check that command includes test filtering
      const expectedCommand = expect.stringContaining('-only-testing:"MyAppTests/LoginTests/testValidLogin"');
      expect(capturedCommand).toHaveBeenCalledWith(expectedCommand);

      // Check that target logging occurred
      expect(consoleSpy).toHaveBeenCalledWith('[MCP] Running tests with target context: integration');
      
      // Check that test filtering logging occurred
      expect(consoleSpy).toHaveBeenCalledWith('[MCP] Filtering tests: MyAppTests/LoginTests/testValidLogin');

      consoleSpy.mockRestore();
    });

    it('should maintain all original functionality with new parameters', async () => {
      const capturedCommand = vi.fn();
      const mockSpawnAndCollectOutput = async (cmd: string): Promise<SpawnOutputResult> => {
        capturedCommand(cmd);
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcworkspace: 'MyApp.xcworkspace', // Only workspace (project would conflict)
        scheme: 'MyAppTests',
        destination: 'platform=iOS Simulator,name=iPhone 15 Pro',
        tests: ['MyAppTests/LoginTests/testValidLogin', 'MyAppTests/HomeTests'],
        target: 'ui'
      };

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      const calledCommand = capturedCommand.mock.calls[0][0];
      
      // Verify all parameters are included
      expect(calledCommand).toContain('-workspace "MyApp.xcworkspace"');
      expect(calledCommand).not.toContain('-project'); // Should not include project when workspace is used
      expect(calledCommand).toContain('-scheme "MyAppTests"');
      expect(calledCommand).toContain('-destination "platform=iOS Simulator,name=iPhone 15 Pro"');
      expect(calledCommand).toContain('-only-testing:"MyAppTests/LoginTests/testValidLogin"');
      expect(calledCommand).toContain('-only-testing:"MyAppTests/HomeTests"');
      expect(calledCommand).toContain('-resultBundlePath');
    });

    it('should handle command building with minimal options plus new parameters', async () => {
      const capturedCommand = vi.fn();
      const mockSpawnAndCollectOutput = async (cmd: string): Promise<SpawnOutputResult> => {
        capturedCommand(cmd);
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        scheme: 'MyAppTests', // Only required field
        tests: ['TestClass/testMethod'],
        target: 'minimal'
      };

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      const calledCommand = capturedCommand.mock.calls[0][0];
      
      expect(calledCommand).toContain('-scheme "MyAppTests"');
      expect(calledCommand).toContain('-destination "generic/platform=iOS Simulator"'); // Default
      expect(calledCommand).toContain('-only-testing:"TestClass/testMethod"');
      expect(calledCommand).not.toContain('-workspace');
      expect(calledCommand).not.toContain('-project');
    });
  });

  describe('logging functionality', () => {
    it('should log test filtering information', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const mockSpawnAndCollectOutput = async (_cmd: string): Promise<SpawnOutputResult> => {
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyAppTests',
        tests: ['Test1', 'Test2', 'Test3']
      };

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      expect(consoleSpy).toHaveBeenCalledWith('[MCP] Filtering tests: Test1, Test2, Test3');
      consoleSpy.mockRestore();
    });

    it('should log both test filtering and target when both provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const mockSpawnAndCollectOutput = async (_cmd: string): Promise<SpawnOutputResult> => {
        return { stdout: 'Test passed', stderr: '' };
      };

      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyAppTests',
        tests: ['LoginTest'],
        target: 'smoke'
      };

      await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);

      expect(consoleSpy).toHaveBeenCalledWith('[MCP] Filtering tests: LoginTest');
      expect(consoleSpy).toHaveBeenCalledWith('[MCP] Running tests with target context: smoke');
      consoleSpy.mockRestore();
    });
  });
});