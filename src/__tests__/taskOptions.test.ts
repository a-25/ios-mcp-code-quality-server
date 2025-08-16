import { describe, it, expect } from 'vitest';
import { validateLintFixOptions, type LintFixOptions } from '../core/taskOptions.js';

describe('validateLintFixOptions', () => {
  it('should be valid when codeChanges is provided', () => {
    const options: LintFixOptions = {
      codeChanges: 'func test() { print("hello") }'
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should be valid when xcodeproj is provided', () => {
    const options: LintFixOptions = {
      xcodeproj: '/path/to/project.xcodeproj'
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should be valid when xcworkspace is provided', () => {
    const options: LintFixOptions = {
      xcworkspace: '/path/to/workspace.xcworkspace'
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should be valid when both codeChanges and project are provided', () => {
    const options: LintFixOptions = {
      codeChanges: 'func test() {}',
      xcodeproj: '/path/to/project.xcodeproj',
      configPaths: '/config/.swiftlint.yml'
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should be valid with config paths only when used with other valid options', () => {
    const options: LintFixOptions = {
      codeChanges: 'func test() {}',
      configPaths: ['/config1/.swiftlint.yml', '/config2/.swiftlint.yml']
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should be invalid when no codeChanges or project path provided', () => {
    const options: LintFixOptions = {
      configPaths: '/config/.swiftlint.yml' // Only config, no code or project
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Either codeChanges or project path (xcodeproj/xcworkspace) must be provided for linting');
  });

  it('should be invalid when completely empty', () => {
    const options: LintFixOptions = {};

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Either codeChanges or project path (xcodeproj/xcworkspace) must be provided for linting');
  });

  it('should handle partial options objects', () => {
    const options: Partial<LintFixOptions> = {
      xcworkspace: undefined,
      xcodeproj: undefined,
      codeChanges: undefined
    };

    const result = validateLintFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Either codeChanges or project path (xcodeproj/xcworkspace) must be provided for linting');
  });
});