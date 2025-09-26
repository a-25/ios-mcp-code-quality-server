import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('CLI Argument Parsing and Validation', () => {
  let mockConsoleLog: ReturnType<typeof vi.fn>;
  let mockConsoleError: ReturnType<typeof vi.fn>;
  let mockProcessExit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock console methods
    mockConsoleLog = vi.fn();
    mockConsoleError = vi.fn();
    mockProcessExit = vi.fn();

    vi.spyOn(console, 'log').mockImplementation(mockConsoleLog);
    vi.spyOn(console, 'error').mockImplementation(mockConsoleError);
    vi.spyOn(process, 'exit').mockImplementation(mockProcessExit as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Test Command Edge Cases', () => {
    it('should reject test identifiers with invalid format', async () => {
      const { validateTestFixOptions } = await import('../core/taskOptions.js');

      const optionsWithBadTests = {
        xcworkspace: 'MyApp.xcworkspace',
        scheme: 'MyAppTests',
        tests: ['ValidTest/ValidClass/validMethod', 'Invalid Test With Spaces'],
      };
      
      const result = validateTestFixOptions(optionsWithBadTests);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid test identifier format');
    });

    it('should handle complex argument combinations', async () => {
      const { validateTestFixOptions } = await import('../core/taskOptions.js');

      const complexOptions = {
        xcworkspace: 'My Complex App.xcworkspace',
        scheme: 'My App Tests',
        destination: 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.0',
        tests: ['MyAppTests/AuthTests/testComplexScenario'],
        target: 'integration',
      };
      
      const result = validateTestFixOptions(complexOptions);
      expect(result.valid).toBe(true);
    });
  });

  describe('Command Line Argument Processing', () => {
    it('should parse comma-separated file list with proper trimming', () => {
      const fileString = ' file1.swift , file2.swift , file3.swift ';
      const fileArray = fileString.split(',').map(f => f.trim()).filter(f => f.length > 0);
      
      expect(fileArray).toEqual(['file1.swift', 'file2.swift', 'file3.swift']);
      expect(fileArray).not.toContain('');
      expect(fileArray.every(f => !f.includes(' '))).toBe(true);
    });
  });

  describe('Integration - Real Workflow Validation', () => {
    it('should validate complete test workflow with all parameters', async () => {
      const { validateTestFixOptions } = await import('../core/taskOptions.js');
      const { TaskType } = await import('../core/taskOrchestrator.js');

      const fullWorkflowOptions = {
        xcworkspace: 'MyApp.xcworkspace',
        scheme: 'MyAppTests',
        destination: 'platform=iOS Simulator,name=iPhone 15',
        tests: ['MyAppTests/LoginTests/testValidLogin', 'MyAppTests/HomeTests'],
        target: 'regression',
      };

      const validation = validateTestFixOptions(fullWorkflowOptions);
      expect(validation.valid).toBe(true);
      expect(TaskType.TestFix).toBe('test-fix');
    });

    it('should validate complete lint workflow with edge cases', async () => {
      const { validateLintFixOptions } = await import('../core/taskOptions.js');

      const edgeCaseLintOptions = {
        changedFiles: [
          'Sources/App/Controllers/LoginViewController.swift',
          'Sources/App/Models/User Model.swift', // File with spaces
          'Tests/AppTests/LoginTests.swift',
        ],
        configPath: '/path/with spaces/.swiftlint.yml', // Config with spaces
      };

      const validation = validateLintFixOptions(edgeCaseLintOptions);
      expect(validation.valid).toBe(true);
      expect(edgeCaseLintOptions.changedFiles.length).toBe(3);
    });
  });
});