import { describe, it, expect } from 'vitest';
import { validateLintFixOptions, validateTestFixOptions, type LintFixOptions, type TestFixOptions } from '../core/taskOptions.js';

describe('validateTestFixOptions', () => {
  it('should be valid for basic test options', () => {
    const options: TestFixOptions = {
      scheme: 'TestScheme',
      xcodeproj: 'Test.xcodeproj'
    };

    const result = validateTestFixOptions(options);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should be valid with UI test type', () => {
    const options: TestFixOptions = {
      scheme: 'TestScheme',
      xcworkspace: 'Test.xcworkspace',
      testType: 'ui',
      includeScreenshots: true
    };

    const result = validateTestFixOptions(options);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should be valid with unit test type and test target', () => {
    const options: TestFixOptions = {
      scheme: 'TestScheme',
      xcodeproj: 'Test.xcodeproj',
      testType: 'unit',
      testTarget: 'MyAppTests'
    };

    const result = validateTestFixOptions(options);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should be valid with all test types', () => {
    const options: TestFixOptions = {
      scheme: 'TestScheme',
      xcworkspace: 'Test.xcworkspace',
      testType: 'all',
      destination: 'platform=iOS Simulator,name=iPhone 15'
    };

    const result = validateTestFixOptions(options);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should be invalid with invalid test type', () => {
    const options: Partial<TestFixOptions> = {
      scheme: 'TestScheme',
      xcodeproj: 'Test.xcodeproj',
      testType: 'invalid' as any
    };

    const result = validateTestFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("testType must be one of: 'unit', 'ui', or 'all'");
  });

  it('should be invalid without scheme', () => {
    const options: Partial<TestFixOptions> = {
      xcodeproj: 'Test.xcodeproj'
    };

    const result = validateTestFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Scheme must be provided for test-fix");
  });

  it('should be invalid without project or workspace', () => {
    const options: Partial<TestFixOptions> = {
      scheme: 'TestScheme'
    };

    const result = validateTestFixOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Either xcodeproj or xcworkspace must be provided");
  });
});

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