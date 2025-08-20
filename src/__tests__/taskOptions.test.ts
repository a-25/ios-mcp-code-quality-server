import { describe, it, expect } from 'vitest';
import { validateLintFixOptions, type LintFixOptions } from '../core/taskOptions.js';

describe('validateLintFixOptions', () => {
  it('should be valid when changedFiles array is provided', () => {
    const options: LintFixOptions = {
      changedFiles: ['test.swift']
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should be valid when multiple changedFiles are provided', () => {
    const options: LintFixOptions = {
      changedFiles: ['test1.swift', 'test2.swift']
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should be valid when changedFiles and configPath are provided', () => {
    const options: LintFixOptions = {
      changedFiles: ['test.swift'],
      configPath: '/config/.swiftlint.yml'
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should be invalid when changedFiles is empty', () => {
    const options: LintFixOptions = {
      changedFiles: []
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('changedFiles array must be provided and non-empty for linting');
  });

  it('should be invalid when changedFiles is not provided', () => {
    const options: Partial<LintFixOptions> = {
      configPath: '/config/.swiftlint.yml' // Only config, no changed files
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('changedFiles array must be provided and non-empty for linting');
  });

  it('should be invalid when completely empty', () => {
    const options: Partial<LintFixOptions> = {};

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('changedFiles array must be provided and non-empty for linting');
  });

  it('should be invalid when changedFiles has empty string', () => {
    const options: any = {
      changedFiles: [''] // Empty file path
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Each file path in changedFiles must be a valid non-empty string");
  });

  it('should be invalid when changedFiles has non-string value', () => {
    const options: any = {
      changedFiles: [123] // Invalid file path type
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Each file path in changedFiles must be a valid non-empty string");
  });

  it('should be invalid when changedFiles has null value', () => {
    const options: any = {
      changedFiles: [null] // Invalid file path value
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Each file path in changedFiles must be a valid non-empty string");
  });
});