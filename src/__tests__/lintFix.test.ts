import { vi, describe, it, expect, beforeEach } from 'vitest';
import { handleLintFix } from '../core/taskOrchestrator.js';
import type { LintFixOptions } from '../core/taskOptions.js';

// Mock the SwiftLint module
vi.mock('../core/swiftLint.js', () => ({
  checkSwiftLintInstallation: vi.fn(),
  runSwiftLintOnCodeChanges: vi.fn(),
  runSwiftLintWithConfig: vi.fn(),
}));

import { 
  checkSwiftLintInstallation, 
  runSwiftLintOnCodeChanges, 
  runSwiftLintWithConfig 
} from '../core/swiftLint.js';

describe('handleLintFix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SwiftLint Installation Check', () => {
    it('should return error when SwiftLint is not installed', async () => {
      (checkSwiftLintInstallation as any).mockResolvedValue({
        installed: false,
        error: 'SwiftLint is not installed. Please install it using: brew install swiftlint'
      });

      const options: LintFixOptions = { codeChanges: 'func test() {}' };
      const result = await handleLintFix(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('swiftlint-not-installed');
      expect(result.message).toContain('SwiftLint is not installed');
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

      const options: LintFixOptions = { codeChanges: 'func test() {}' };
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

    it('should lint code changes when provided', async () => {
      const mockLintResult = {
        success: true,
        warnings: [
          {
            file: '<code-changes>',
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
        codeChanges: 'func veryLongFunctionNameThatExceedsTheRecommendedLineLengthLimitForSwiftCode() { print("test") }',
        configPaths: ['/config/.swiftlint.yml']
      };

      const result = await handleLintFix(options);

      expect(runSwiftLintOnCodeChanges).toHaveBeenCalledWith(
        options.codeChanges,
        options.configPaths
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockLintResult);
    });

    it('should handle multiple config paths for code changes', async () => {
      const mockLintResult = { success: true, warnings: [], output: '' };
      (runSwiftLintOnCodeChanges as any).mockResolvedValue(mockLintResult);

      const options: LintFixOptions = {
        codeChanges: 'func test() {}',
        configPaths: ['/config1/.swiftlint.yml', '/config2/.swiftlint.yml']
      };

      await handleLintFix(options);

      expect(runSwiftLintOnCodeChanges).toHaveBeenCalledWith(
        options.codeChanges,
        options.configPaths
      );
    });

    it('should handle single config path as string', async () => {
      const mockLintResult = { success: true, warnings: [], output: '' };
      (runSwiftLintOnCodeChanges as any).mockResolvedValue(mockLintResult);

      const options: LintFixOptions = {
        codeChanges: 'func test() {}',
        configPaths: '/config/.swiftlint.yml'
      };

      await handleLintFix(options);

      expect(runSwiftLintOnCodeChanges).toHaveBeenCalledWith(
        options.codeChanges,
        '/config/.swiftlint.yml'
      );
    });
  });

  describe('Project Path Linting', () => {
    beforeEach(() => {
      (checkSwiftLintInstallation as any).mockResolvedValue({
        installed: true,
        version: '0.50.3'
      });
    });

    it('should lint xcworkspace when no code changes provided', async () => {
      const mockLintResult = { success: true, warnings: [], output: 'All good' };
      (runSwiftLintWithConfig as any).mockResolvedValue(mockLintResult);

      const options: LintFixOptions = {
        xcworkspace: '/path/to/project.xcworkspace',
        configPaths: '/config/.swiftlint.yml'
      };

      const result = await handleLintFix(options);

      expect(runSwiftLintWithConfig).toHaveBeenCalledWith(
        '/path/to/project', // Should remove .xcworkspace extension
        '/config/.swiftlint.yml'
      );
      expect(result.success).toBe(true);
    });

    it('should lint xcodeproj when no workspace provided', async () => {
      const mockLintResult = { success: true, warnings: [], output: 'All good' };
      (runSwiftLintWithConfig as any).mockResolvedValue(mockLintResult);

      const options: LintFixOptions = {
        xcodeproj: '/path/to/project.xcodeproj'
      };

      await handleLintFix(options);

      expect(runSwiftLintWithConfig).toHaveBeenCalledWith(
        '/path/to/project', // Should remove .xcodeproj extension
        undefined
      );
    });

    it('should use default Sources path when no project info provided', async () => {
      const mockLintResult = { success: true, warnings: [], output: 'All good' };
      (runSwiftLintWithConfig as any).mockResolvedValue(mockLintResult);

      const options: LintFixOptions = {}; // Empty options

      await handleLintFix(options);

      expect(runSwiftLintWithConfig).toHaveBeenCalledWith(
        './Sources',
        undefined
      );
    });

    it('should prefer xcworkspace over xcodeproj', async () => {
      const mockLintResult = { success: true, warnings: [], output: 'All good' };
      (runSwiftLintWithConfig as any).mockResolvedValue(mockLintResult);

      const options: LintFixOptions = {
        xcworkspace: '/path/to/workspace.xcworkspace',
        xcodeproj: '/path/to/project.xcodeproj'
      };

      await handleLintFix(options);

      expect(runSwiftLintWithConfig).toHaveBeenCalledWith(
        '/path/to/workspace',
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

      const options: LintFixOptions = { codeChanges: 'func test() {}' };
      const result = await handleLintFix(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('swiftlint-execution-failed');
      expect(result.message).toBe('SwiftLint crashed');
    });

    it('should handle missing project files', async () => {
      const error = new Error('no such file or directory');
      (runSwiftLintWithConfig as any).mockRejectedValue(error);

      const options: LintFixOptions = { xcodeproj: '/nonexistent/project.xcodeproj' };
      const result = await handleLintFix(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('missing-project');
    });

    it('should handle build errors', async () => {
      const error = new Error('build failed with xcodebuild error');
      (runSwiftLintWithConfig as any).mockRejectedValue(error);

      const options: LintFixOptions = { xcodeproj: '/path/project.xcodeproj' };
      const result = await handleLintFix(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('build-error');
    });

    it('should handle generic errors', async () => {
      const error = new Error('Some unexpected error');
      (runSwiftLintWithConfig as any).mockRejectedValue(error);

      const options: LintFixOptions = { xcodeproj: '/path/project.xcodeproj' };
      const result = await handleLintFix(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Some unexpected error');
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
            file: '<code-changes>',
            line: 5,
            column: 12,
            severity: 'warning',
            message: 'Variable name should be camelCase',
            rule: 'identifier_name'
          },
          {
            file: '<code-changes>',
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

      const options: LintFixOptions = { codeChanges: 'func test() { let Bad_Name = 5 }' };
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

      const options: LintFixOptions = { codeChanges: 'func test() { print("Hello") }' };
      const result = await handleLintFix(options);

      expect(result.success).toBe(true);
      expect(result.data?.warnings).toHaveLength(0);
    });
  });
});