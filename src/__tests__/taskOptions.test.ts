import { describe, it, expect } from 'vitest';
import { validateLintFixOptions, type LintFixOptions } from '../core/taskOptions.js';

describe('validateLintFixOptions', () => {
  it('should be valid when codeFileChanges array is provided', () => {
    const options: LintFixOptions = {
      codeFileChanges: [
        { name: 'test.swift', changes: 'func test() { print("hello") }' }
      ]
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should be valid when multiple codeFileChanges are provided', () => {
    const options: LintFixOptions = {
      codeFileChanges: [
        { name: 'test1.swift', changes: 'func test1() {}' },
        { name: 'test2.swift', changes: 'func test2() {}' }
      ]
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should be valid when codeFileChanges and configPath are provided', () => {
    const options: LintFixOptions = {
      codeFileChanges: [
        { name: 'test.swift', changes: 'func test() {}' }
      ],
      configPath: '/config/.swiftlint.yml'
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should be invalid when codeFileChanges is empty', () => {
    const options: LintFixOptions = {
      codeFileChanges: []
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('codeFileChanges array must be provided and non-empty for linting');
  });

  it('should be invalid when codeFileChanges is not provided', () => {
    const options: Partial<LintFixOptions> = {
      configPath: '/config/.swiftlint.yml' // Only config, no code changes
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('codeFileChanges array must be provided and non-empty for linting');
  });

  it('should be invalid when completely empty', () => {
    const options: Partial<LintFixOptions> = {};

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('codeFileChanges array must be provided and non-empty for linting');
  });

  it('should be invalid when codeFileChanges has invalid structure', () => {
    const options: any = {
      codeFileChanges: [
        { name: 'test.swift' } // Missing 'changes' field
      ]
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Each code file change must have a valid 'changes' field");
  });

  it('should be invalid when codeFileChanges missing name field', () => {
    const options: any = {
      codeFileChanges: [
        { changes: 'func test() {}' } // Missing 'name' field
      ]
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Each code file change must have a valid 'name' field");
  });

  it('should be invalid when codeFileChanges has non-string name', () => {
    const options: any = {
      codeFileChanges: [
        { name: 123, changes: 'func test() {}' } // Invalid name type
      ]
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Each code file change must have a valid 'name' field");
  });

  it('should be invalid when codeFileChanges has non-string changes', () => {
    const options: any = {
      codeFileChanges: [
        { name: 'test.swift', changes: 123 } // Invalid changes type
      ]
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Each code file change must have a valid 'changes' field");
  });
});