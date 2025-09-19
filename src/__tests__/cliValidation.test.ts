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

  describe('Test Command Validation', () => {
    it('should validate test command options correctly', async () => {
      const { validateTestFixOptions } = await import('../core/taskOptions.js');

      // Test valid options
      const validOptions = {
        xcworkspace: 'MyApp.xcworkspace',
        scheme: 'MyAppTests',
        destination: 'platform=iOS Simulator,name=iPhone 15',
      };
      
      const validResult = validateTestFixOptions(validOptions);
      expect(validResult.valid).toBe(true);
      expect(validResult.error).toBeUndefined();
    });

    it('should reject test options without project/workspace', async () => {
      const { validateTestFixOptions } = await import('../core/taskOptions.js');

      const invalidOptions = {
        scheme: 'MyAppTests',
      };
      
      const result = validateTestFixOptions(invalidOptions);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Either xcodeproj or xcworkspace must be provided');
    });

    it('should require scheme for workspace', async () => {
      const { validateTestFixOptions } = await import('../core/taskOptions.js');

      const invalidOptions = {
        xcworkspace: 'MyApp.xcworkspace',
        // Missing scheme
      };
      
      const result = validateTestFixOptions(invalidOptions);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Scheme is required when using xcworkspace');
    });

    it('should validate test identifiers format', async () => {
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

    it('should accept valid test identifiers', async () => {
      const { validateTestFixOptions } = await import('../core/taskOptions.js');

      const optionsWithValidTests = {
        xcworkspace: 'MyApp.xcworkspace',
        scheme: 'MyAppTests',
        tests: [
          'MyAppTests/LoginTests/testValidLogin',
          'MyAppTests/LoginTests',
          'MyAppUITests',
        ],
      };
      
      const result = validateTestFixOptions(optionsWithValidTests);
      expect(result.valid).toBe(true);
    });
  });

  describe('Lint Command Validation', () => {
    it('should validate lint command options correctly', async () => {
      const { validateLintFixOptions } = await import('../core/taskOptions.js');

      const validOptions = {
        changedFiles: ['ViewController.swift', 'Model.swift'],
        configPath: '.swiftlint.yml',
      };
      
      const result = validateLintFixOptions(validOptions);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject lint options without changed files', async () => {
      const { validateLintFixOptions } = await import('../core/taskOptions.js');

      const invalidOptions = {
        configPath: '.swiftlint.yml',
      };
      
      const result = validateLintFixOptions(invalidOptions);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('changedFiles array must be provided and non-empty');
    });

    it('should reject empty changed files array', async () => {
      const { validateLintFixOptions } = await import('../core/taskOptions.js');

      const invalidOptions = {
        changedFiles: [],
      };
      
      const result = validateLintFixOptions(invalidOptions);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('changedFiles array must be provided and non-empty');
    });

    it('should validate file path strings', async () => {
      const { validateLintFixOptions } = await import('../core/taskOptions.js');

      const invalidOptions = {
        changedFiles: ['valid.swift', '', null as any, 'another.swift'],
      };
      
      const result = validateLintFixOptions(invalidOptions);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Each file path in changedFiles must be a valid non-empty string');
    });
  });

  describe('Command Line Argument Processing', () => {
    it('should parse comma-separated file list correctly', () => {
      const fileString = 'file1.swift,file2.swift,file3.swift';
      const fileArray = fileString.split(',').map(f => f.trim());
      
      expect(fileArray).toEqual(['file1.swift', 'file2.swift', 'file3.swift']);
    });

    it('should handle file list with spaces', () => {
      const fileString = ' file1.swift , file2.swift , file3.swift ';
      const fileArray = fileString.split(',').map(f => f.trim()).filter(f => f.length > 0);
      
      expect(fileArray).toEqual(['file1.swift', 'file2.swift', 'file3.swift']);
    });

    it('should handle single file', () => {
      const fileString = 'single.swift';
      const fileArray = fileString.split(',').map(f => f.trim());
      
      expect(fileArray).toEqual(['single.swift']);
    });
  });

  describe('Integration - Command Validation Flow', () => {
    it('should validate complete test workflow', async () => {
      const { validateTestFixOptions } = await import('../core/taskOptions.js');
      const { TaskType } = await import('../core/taskOrchestrator.js');

      // Simulate full CLI test command
      const cliOptions = {
        xcworkspace: 'MyApp.xcworkspace',
        scheme: 'MyAppTests',
        destination: 'platform=iOS Simulator,name=iPhone 15',
        verbose: true,
      };

      const validation = validateTestFixOptions(cliOptions);
      expect(validation.valid).toBe(true);
      
      // Should be able to use TaskType.TestFix
      expect(TaskType.TestFix).toBe('test-fix');
    });

    it('should validate complete lint workflow', async () => {
      const { validateLintFixOptions } = await import('../core/taskOptions.js');
      const { TaskType } = await import('../core/taskOrchestrator.js');

      // Simulate full CLI lint command
      const cliOptions = {
        changedFiles: ['ViewController.swift', 'LoginModel.swift'],
        configPath: '.swiftlint.yml',
        verbose: true,
        json: false,
      };

      const validation = validateLintFixOptions(cliOptions);
      expect(validation.valid).toBe(true);
      
      // Should be able to use TaskType.LintFix
      expect(TaskType.LintFix).toBe('lint-fix');
    });
  });
});