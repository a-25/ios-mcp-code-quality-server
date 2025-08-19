import { vi, describe, it, expect, beforeEach } from 'vitest';
import { handleLintFix } from '../core/taskOrchestrator.js';
import type { LintFixOptions } from '../core/taskOptions.js';

// Mock the SwiftLint module
vi.mock('../core/swiftLint.js', () => ({
  checkSwiftLintInstallation: vi.fn(),
  runSwiftLintOnCodeChanges: vi.fn(),
}));

import { 
  checkSwiftLintInstallation, 
  runSwiftLintOnCodeChanges 
} from '../core/swiftLint.js';

describe('handleLintFix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SwiftLint Installation Check', () => {
    it('should return error when SwiftLint is not installed', async () => {
      (checkSwiftLintInstallation as any).mockResolvedValue({
        installed: false,
        error: 'SwiftLint is not installed. Please install it from: https://github.com/realm/SwiftLint?tab=readme-ov-file#installation'
      });

      const options: LintFixOptions = { 
        codeFileChanges: [{ name: 'test.swift', changes: 'func test() {}' }] 
      };
      const result = await handleLintFix(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('swiftlint-not-installed');
      expect(result.message).toContain('is not installed');
    });

    it('should proceed when SwiftLint is installed', async () => {
      (checkSwiftLintInstallation as any).mockResolvedValue({
        installed: true,
        version: '0.50.3'
      });
      (runSwiftLintOnCodeChanges as any).mockResolvedValue({
        success: true,
        warnings: [],
        output: 'No issues found'
      });

      const options: LintFixOptions = { 
        codeFileChanges: [{ name: 'test.swift', changes: 'func test() {}' }] 
      };
      const result = await handleLintFix(options);

      expect(checkSwiftLintInstallation).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('Code Changes Linting', () => {
    beforeEach(() => {
      (checkSwiftLintInstallation as any).mockResolvedValue({
        installed: true,
        version: '0.50.3'
      });
    });

    it('should lint code file changes when provided', async () => {
      const mockLintResult = {
        success: true,
        warnings: [
          {
            file: 'LongNamedFile.swift',
            line: 1,
            column: 10,
            severity: 'warning',
            message: 'Line should be 80 characters or less',
            rule: 'line_length'
          }
        ],
        output: 'Found 1 warning'
      };
      (runSwiftLintOnCodeChanges as any).mockResolvedValue(mockLintResult);

      const options: LintFixOptions = {
        codeFileChanges: [
          { 
            name: 'LongNamedFile.swift',
            changes: 'func veryLongFunctionNameThatExceedsTheRecommendedLineLengthLimitForSwiftCode() { print("test") }'
          }
        ],
        configPath: '/config/.swiftlint.yml'
      };

      const result = await handleLintFix(options);

      expect(runSwiftLintOnCodeChanges).toHaveBeenCalledWith(
        options.codeFileChanges,
        options.configPath
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockLintResult);
    });

    it('should handle single config path', async () => {
      const mockLintResult = { success: true, warnings: [], output: '' };
      (runSwiftLintOnCodeChanges as any).mockResolvedValue(mockLintResult);

      const options: LintFixOptions = {
        codeFileChanges: [{ name: 'test.swift', changes: 'func test() {}' }],
        configPath: '/config/.swiftlint.yml'
      };

      await handleLintFix(options);

      expect(runSwiftLintOnCodeChanges).toHaveBeenCalledWith(
        options.codeFileChanges,
        '/config/.swiftlint.yml'
      );
    });

    it('should handle multiple code file changes', async () => {
      const mockLintResult = { success: true, warnings: [], output: '' };
      (runSwiftLintOnCodeChanges as any).mockResolvedValue(mockLintResult);

      const options: LintFixOptions = {
        codeFileChanges: [
          { name: 'File1.swift', changes: 'func test1() {}' },
          { name: 'File2.swift', changes: 'func test2() {}' },
          { name: 'File3.swift', changes: 'func test3() {}' }
        ]
      };

      await handleLintFix(options);

      expect(runSwiftLintOnCodeChanges).toHaveBeenCalledWith(
        options.codeFileChanges,
        undefined
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (checkSwiftLintInstallation as any).mockResolvedValue({
        installed: true,
        version: '0.50.3'
      });
    });

    it('should return error when SwiftLint execution fails', async () => {
      (runSwiftLintOnCodeChanges as any).mockResolvedValue({
        success: false,
        error: 'SwiftLint crashed',
        warnings: [],
        output: ''
      });

      const options: LintFixOptions = { 
        codeFileChanges: [{ name: 'test.swift', changes: 'func test() {}' }] 
      };
      const result = await handleLintFix(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('swiftlint-execution-failed');
      expect(result.message).toBe('SwiftLint crashed');
    });

    it('should handle unexpected errors during processing', async () => {
      const error = new Error('Unexpected processing error');
      (runSwiftLintOnCodeChanges as any).mockRejectedValue(error);

      const options: LintFixOptions = { 
        codeFileChanges: [{ name: 'test.swift', changes: 'func test() {}' }] 
      };
      const result = await handleLintFix(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected processing error');
    });
  });

  describe('Return Data', () => {
    beforeEach(() => {
      (checkSwiftLintInstallation as any).mockResolvedValue({
        installed: true,
        version: '0.50.3'
      });
    });

    it('should return structured warning data', async () => {
      const mockLintResult = {
        success: true,
        warnings: [
          {
            file: 'TestFile.swift',
            line: 5,
            column: 12,
            severity: 'warning',
            message: 'Variable name should be camelCase',
            rule: 'identifier_name'
          },
          {
            file: 'TestFile.swift',
            line: 10,
            column: 1,
            severity: 'error',
            message: 'Missing return statement',
            rule: 'return_value_from_void_function'
          }
        ],
        output: 'Found 2 violations'
      };
      (runSwiftLintOnCodeChanges as any).mockResolvedValue(mockLintResult);

      const options: LintFixOptions = { 
        codeFileChanges: [{ name: 'TestFile.swift', changes: 'func test() { let Bad_Name = 5 }' }] 
      };
      const result = await handleLintFix(options);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockLintResult);
      expect(result.data?.warnings).toHaveLength(2);
    });

    it('should return empty warnings when no issues found', async () => {
      const mockLintResult = {
        success: true,
        warnings: [],
        output: 'No violations found'
      };
      (runSwiftLintOnCodeChanges as any).mockResolvedValue(mockLintResult);

      const options: LintFixOptions = { 
        codeFileChanges: [{ name: 'test.swift', changes: 'func test() { print("Hello") }' }]
      };
      const result = await handleLintFix(options);

      expect(result.success).toBe(true);
      expect(result.data?.warnings).toHaveLength(0);
    });
  });
});