import { vi, describe, it, expect, beforeEach } from 'vitest';
import { checkSwiftLintInstallation, runSwiftLintWithConfig, runSwiftLintOnCodeChanges, type SwiftLintResult } from '../core/swiftLint.js';

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    mkdtemp: vi.fn(),
    writeFile: vi.fn(),
    remove: vi.fn(),
    pathExists: vi.fn(),
  },
}));

// Mock os
vi.mock('os', () => ({
  default: {
    tmpdir: vi.fn(() => '/tmp'),
  },
}));

// Mock path
vi.mock('path', () => ({
  default: {
    join: vi.fn((...parts) => parts.join('/')),
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
      expect(result.error).toContain('brew install swiftlint');
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

      expect(execa).toHaveBeenCalledWith('swiftlint', ['lint', '--path', '/test/path', '--reporter', 'json']);
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
        'lint', '--path', '/test/path', '--reporter', 'json', 
        '--config', '/config/.swiftlint.yml'
      ]);
    });

    it('should handle multiple config files', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      (execa as any).mockResolvedValue({ stdout: '', stderr: '' });

      await runSwiftLintWithConfig('/test/path', ['/config1/.swiftlint.yml', '/config2/.swiftlint.yml']);

      expect(execa).toHaveBeenCalledWith('swiftlint', [
        'lint', '--path', '/test/path', '--reporter', 'json',
        '--config', '/config1/.swiftlint.yml',
        '--config', '/config2/.swiftlint.yml'
      ]);
    });

    it('should skip non-existent config files', async () => {
      (fs.pathExists as any).mockResolvedValue(false);
      (execa as any).mockResolvedValue({ stdout: '', stderr: '' });

      await runSwiftLintWithConfig('/test/path', '/nonexistent/.swiftlint.yml');

      expect(execa).toHaveBeenCalledWith('swiftlint', ['lint', '--path', '/test/path', '--reporter', 'json']);
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

  describe('runSwiftLintOnCodeChanges', () => {
    it('should create temp file and lint code changes', async () => {
      const mockTempDir = '/tmp/swiftlint-123456';
      const mockTempFile = '/tmp/swiftlint-123456/temp.swift';
      const codeChanges = 'func testFunction() { print("test") }';

      (fs.mkdtemp as any).mockResolvedValue(mockTempDir);
      (fs.writeFile as any).mockResolvedValue(undefined);
      (fs.remove as any).mockResolvedValue(undefined);
      (execa as any).mockResolvedValue({ 
        stdout: `{"file":"${mockTempFile}","line":1,"character":1,"severity":"warning","reason":"Test warning","rule_id":"test_rule"}`,
        stderr: ''
      });

      const result = await runSwiftLintOnCodeChanges(codeChanges);

      expect(fs.mkdtemp).toHaveBeenCalledWith('/tmp/swiftlint-');
      expect(fs.writeFile).toHaveBeenCalledWith(mockTempFile, codeChanges);
      expect(execa).toHaveBeenCalledWith('swiftlint', ['lint', '--path', mockTempFile, '--reporter', 'json']);
      
      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].file).toBe('<code-changes>'); // Should replace temp file path
      expect(fs.remove).toHaveBeenCalledWith(mockTempDir);
    });

    it('should include config files when linting code changes', async () => {
      const mockTempDir = '/tmp/swiftlint-123456';
      const mockTempFile = '/tmp/swiftlint-123456/temp.swift';
      const codeChanges = 'func testFunction() { }';
      const configPath = '/config/.swiftlint.yml';

      (fs.mkdtemp as any).mockResolvedValue(mockTempDir);
      (fs.writeFile as any).mockResolvedValue(undefined);
      (fs.remove as any).mockResolvedValue(undefined);
      (fs.pathExists as any).mockResolvedValue(true);
      (execa as any).mockResolvedValue({ stdout: '', stderr: '' });

      await runSwiftLintOnCodeChanges(codeChanges, configPath);

      expect(execa).toHaveBeenCalledWith('swiftlint', [
        'lint', '--path', mockTempFile, '--reporter', 'json',
        '--config', configPath
      ]);
    });

    it('should handle temp file creation errors', async () => {
      const error = { message: 'Permission denied' };
      (fs.mkdtemp as any).mockRejectedValue(error);

      const result = await runSwiftLintOnCodeChanges('test code');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create temp file');
      expect(result.error).toContain('Permission denied');
    });

    it('should cleanup temp files even if linting fails', async () => {
      const mockTempDir = '/tmp/swiftlint-123456';
      const mockTempFile = '/tmp/swiftlint-123456/temp.swift';

      (fs.mkdtemp as any).mockResolvedValue(mockTempDir);
      (fs.writeFile as any).mockResolvedValue(undefined);
      (fs.remove as any).mockResolvedValue(undefined);
      
      const lintError = new Error('SwiftLint failed');
      (execa as any).mockRejectedValue(lintError);

      const result = await runSwiftLintOnCodeChanges('test code');

      expect(result.success).toBe(false);
      expect(fs.remove).toHaveBeenCalledWith(mockTempDir); // Should cleanup even on failure
    });
  });
});