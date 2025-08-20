import { vi, describe, it, expect, beforeEach } from 'vitest';
import { checkSwiftLintInstallation, runSwiftLintWithConfig, runSwiftLintOnChangedFiles, type SwiftLintResult } from '../core/swiftLint.js';

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
  },
}));

import { execa } from 'execa';
import fs from 'fs-extra';

describe('SwiftLint Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkSwiftLintInstallation', () => {
    it('should return installed=true when SwiftLint is available', async () => {
      (execa as any).mockResolvedValue({ stdout: '0.50.3' });

      const result = await checkSwiftLintInstallation();

      expect(result.installed).toBe(true);
      expect(result.version).toBe('0.50.3');
      expect(execa).toHaveBeenCalledWith('swiftlint', ['version']);
    });

    it('should return installed=false with installation message when SwiftLint is not found', async () => {
      const error = new Error('Command failed');
      (error as any).code = 'ENOENT';
      (execa as any).mockRejectedValue(error);

      const result = await checkSwiftLintInstallation();

      expect(result.installed).toBe(false);
      expect(result.error).toContain('SwiftLint is not installed');
      expect(result.error).toContain('https://github.com/realm/SwiftLint');
    });

    it('should return installed=false with error message for other failures', async () => {
      const error = new Error('Permission denied');
      (execa as any).mockRejectedValue(error);

      const result = await checkSwiftLintInstallation();

      expect(result.installed).toBe(false);
      expect(result.error).toContain('SwiftLint check failed');
      expect(result.error).toContain('Permission denied');
    });
  });

  describe('runSwiftLintWithConfig', () => {
    it('should run SwiftLint with default arguments when no config provided', async () => {
      (execa as any).mockResolvedValue({ 
        stdout: '{"file":"/test/file.swift","line":10,"character":5,"severity":"warning","reason":"Test warning","rule_id":"test_rule"}',
        stderr: ''
      });

      const result = await runSwiftLintWithConfig('/test/path');

      expect(execa).toHaveBeenCalledWith('swiftlint', ['lint', '--reporter', 'json', '/test/path']);
      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toEqual({
        file: '/test/file.swift',
        line: 10,
        column: 5,
        severity: 'warning',
        message: 'Test warning',
        rule: 'test_rule'
      });
    });

    it('should include config file arguments when provided', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      (execa as any).mockResolvedValue({ stdout: '', stderr: '' });

      await runSwiftLintWithConfig('/test/path', '/config/.swiftlint.yml');

      expect(fs.pathExists).toHaveBeenCalledWith('/config/.swiftlint.yml');
      expect(execa).toHaveBeenCalledWith('swiftlint', [
        'lint', '--reporter', 'json', '--config', '/config/.swiftlint.yml', '/test/path'
      ]);
    });

    it('should skip non-existent config files', async () => {
      (fs.pathExists as any).mockResolvedValue(false);
      (execa as any).mockResolvedValue({ stdout: '', stderr: '' });

      await runSwiftLintWithConfig('/test/path', '/nonexistent/.swiftlint.yml');

      expect(execa).toHaveBeenCalledWith('swiftlint', ['lint', '--reporter', 'json', '/test/path']);
    });

    it('should handle SwiftLint execution errors', async () => {
      const error = new Error('SwiftLint failed');
      (error as any).stdout = 'Error output';
      (execa as any).mockRejectedValue(error);

      const result = await runSwiftLintWithConfig('/test/path');

      expect(result.success).toBe(false);
      expect(result.error).toBe('SwiftLint failed');
      expect(result.output).toBe('Error output');
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle plain text output when JSON parsing fails', async () => {
      (execa as any).mockResolvedValue({ 
        stdout: 'plain text warning output',
        stderr: ''
      });

      const result = await runSwiftLintWithConfig('/test/path');

      expect(result.success).toBe(true);
      expect(result.output).toBe('plain text warning output');
      expect(result.warnings).toHaveLength(0); // Should be empty when JSON parsing fails
    });
  });

  describe('runSwiftLintOnChangedFiles', () => {
    it('should lint changed files with positional arguments', async () => {
      const changedFiles = ['TestFile.swift', 'AnotherFile.swift'];
      
      (execa as any).mockResolvedValue({ 
        stdout: '{"file":"TestFile.swift","line":1,"character":1,"severity":"warning","reason":"Test warning","rule_id":"test_rule"}',
        stderr: ''
      });

      const result = await runSwiftLintOnChangedFiles(changedFiles);

      expect(execa).toHaveBeenCalledWith('swiftlint', [
        'lint', '--reporter', 'json', 'TestFile.swift', 'AnotherFile.swift'
      ]);
      
      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].file).toBe('TestFile.swift');
    });

    it('should include config file when provided', async () => {
      const changedFiles = ['TestFile.swift'];
      const configPath = '/config/.swiftlint.yml';

      (fs.pathExists as any).mockResolvedValue(true);
      (execa as any).mockResolvedValue({ stdout: '', stderr: '' });

      await runSwiftLintOnChangedFiles(changedFiles, configPath);

      expect(execa).toHaveBeenCalledWith('swiftlint', [
        'lint', '--reporter', 'json', '--config', configPath, 'TestFile.swift'
      ]);
    });

    it('should skip non-existent config files', async () => {
      const changedFiles = ['TestFile.swift'];
      
      (fs.pathExists as any).mockResolvedValue(false);
      (execa as any).mockResolvedValue({ stdout: '', stderr: '' });

      await runSwiftLintOnChangedFiles(changedFiles, '/nonexistent/.swiftlint.yml');

      expect(execa).toHaveBeenCalledWith('swiftlint', [
        'lint', '--reporter', 'json', 'TestFile.swift'
      ]);
    });

    it('should handle SwiftLint execution errors', async () => {
      const changedFiles = ['TestFile.swift'];
      const error = new Error('SwiftLint failed');
      (error as any).stdout = 'Error output';
      (execa as any).mockRejectedValue(error);

      const result = await runSwiftLintOnChangedFiles(changedFiles);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SwiftLint failed');
      expect(result.output).toBe('Error output');
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle JSON parsing errors gracefully', async () => {
      const changedFiles = ['TestFile.swift'];
      
      (execa as any).mockResolvedValue({ 
        stdout: 'invalid json output',
        stderr: ''
      });

      const result = await runSwiftLintOnChangedFiles(changedFiles);

      expect(result.success).toBe(true);
      expect(result.output).toBe('invalid json output');
      expect(result.warnings).toHaveLength(0);
    });

    it('should parse multiple warnings correctly', async () => {
      const changedFiles = ['TestFile.swift'];
      
      (execa as any).mockResolvedValue({ 
        stdout: '{"file":"TestFile.swift","line":1,"character":1,"severity":"warning","reason":"First warning","rule_id":"rule1"}\n{"file":"TestFile.swift","line":5,"character":10,"severity":"error","reason":"Second warning","rule_id":"rule2"}',
        stderr: ''
      });

      const result = await runSwiftLintOnChangedFiles(changedFiles);

      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0]).toEqual({
        file: 'TestFile.swift',
        line: 1,
        column: 1,
        severity: 'warning',
        message: 'First warning',
        rule: 'rule1'
      });
      expect(result.warnings[1]).toEqual({
        file: 'TestFile.swift',
        line: 5,
        column: 10,
        severity: 'error',
        message: 'Second warning',
        rule: 'rule2'
      });
    });
  });
});