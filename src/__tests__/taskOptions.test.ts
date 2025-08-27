import { describe, it, expect } from 'vitest';
import { validateLintFixOptions, validateTestFixOptions, validateLintOptions, type LintFixOptions, type TestFixOptions, type LintOptions } from '../core/taskOptions.js';

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

describe('validateTestFixOptions', () => {
  describe('basic validation', () => {
    it('should be valid when xcodeproj and scheme are provided', () => {
      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyApp'
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should be valid when xcworkspace and scheme are provided', () => {
      const options: TestFixOptions = {
        xcworkspace: 'MyApp.xcworkspace',
        scheme: 'MyApp'
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });


    it('should be invalid when neither xcodeproj nor xcworkspace are provided', () => {
      const options: Partial<TestFixOptions> = {
        scheme: 'MyApp'
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Either xcodeproj or xcworkspace must be provided');
    });

    it('should be valid when both xcodeproj and xcworkspace are provided (xcworkspace takes precedence)', () => {
      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        xcworkspace: 'MyApp.xcworkspace',
        scheme: 'MyApp'
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should be invalid when xcworkspace is provided without scheme', () => {
      const options: Partial<TestFixOptions> = {
        xcworkspace: 'MyApp.xcworkspace'
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Scheme is required when using xcworkspace');
    });

    it('should be invalid when scheme is not provided', () => {
      const options: Partial<TestFixOptions> = {
        xcodeproj: 'MyApp.xcodeproj'
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Scheme must be provided for test-fix');
    });
  });

  describe('tests array validation', () => {
    it('should be valid with valid tests array', () => {
      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyApp',
        tests: ['MyAppTests/LoginTests/testValidLogin', 'MyAppTests/HomeTests']
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should be valid with empty tests array', () => {
      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyApp',
        tests: []
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should be invalid when tests is not an array', () => {
      const options: any = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyApp',
        tests: 'not-an-array'
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('tests must be an array of test names');
    });

    it('should be invalid when tests array contains empty string', () => {
      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyApp',
        tests: ['ValidTest', '', 'AnotherValidTest']
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Each test name must be a non-empty string');
    });

    it('should be invalid when tests array contains non-string', () => {
      const options: any = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyApp',
        tests: ['ValidTest', 123, 'AnotherValidTest']
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Each test name must be a non-empty string');
    });

    it('should be invalid when tests array contains whitespace-only string', () => {
      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyApp',
        tests: ['ValidTest', '   ', 'AnotherValidTest']
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Each test name must be a non-empty string');
    });
  });

  describe('target validation', () => {
    it('should be valid with valid target string', () => {
      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyApp',
        target: 'unit'
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should be valid with empty target string', () => {
      const options: TestFixOptions = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyApp',
        target: ''
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should be invalid when target is not a string', () => {
      const options: any = {
        xcodeproj: 'MyApp.xcodeproj',
        scheme: 'MyApp',
        target: 123
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('target must be a string');
    });
  });

  describe('combined validation', () => {
    it('should be valid with all optional parameters', () => {
      const options: TestFixOptions = {
        xcworkspace: 'MyApp.xcworkspace',
        scheme: 'MyApp',
        destination: 'platform=iOS Simulator,name=iPhone 15',
        tests: ['MyAppTests/LoginTests/testValidLogin'],
        target: 'integration'
      };

      const result = validateTestFixOptions(options);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});

describe('validateLintOptions', () => {
  it('should be valid when path is provided', () => {
    const options: LintOptions = {
      path: '/path/to/project'
    };

    const result = validateLintOptions(options);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should be valid with all optional parameters', () => {
    const options: LintOptions = {
      path: '/path/to/project',
      xcodeproj: 'MyApp.xcodeproj',
      xcworkspace: 'MyApp.xcworkspace'
    };

    const result = validateLintOptions(options);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should be invalid when path is not provided', () => {
    const options: Partial<LintOptions> = {
      xcodeproj: 'MyApp.xcodeproj'
    };

    const result = validateLintOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Path must be provided and be a valid string');
  });

  it('should be invalid when path is not a string', () => {
    const options: any = {
      path: 123
    };

    const result = validateLintOptions(options);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Path must be provided and be a valid string');
  });
});