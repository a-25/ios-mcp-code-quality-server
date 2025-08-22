export interface ValidationResult {
  valid: boolean;
  error?: string;
}
export type TestType = 'unit' | 'ui' | 'all';

export interface TestFixOptions {
  xcodeproj?: string;
  xcworkspace?: string;
  scheme: string;
  destination?: string;
  testType?: TestType; // Specify the type of tests to run
  testTarget?: string; // Specific test target (e.g., "MyAppUITests")
  includeScreenshots?: boolean; // Whether to include screenshot attachments in results
}

export interface LintFixOptions {
  /**
   * List of file paths that have been changed and should be linted.
   * These should be relative paths from the project root.
   * Hint: You can extract changed files using `git diff --name-status` command.
   */
  changedFiles: string[];
  configPath?: string;
}

export function validateTestFixOptions(options: Partial<TestFixOptions>): ValidationResult {
  if (!options.xcodeproj && !options.xcworkspace) {
  return { valid: false, error: "Either xcodeproj or xcworkspace must be provided" };
  }
  if (!options.scheme) {
  return { valid: false, error: "Scheme must be provided for test-fix" };
  }
  
  // Validate testType if provided
  if (options.testType && !['unit', 'ui', 'all'].includes(options.testType)) {
    return { valid: false, error: "testType must be one of: 'unit', 'ui', or 'all'" };
  }
  
  return { valid: true };
}

export function validateLintFixOptions(options: Partial<LintFixOptions>): ValidationResult {
  // For LintFix, we require changedFiles array
  if (!options.changedFiles || !Array.isArray(options.changedFiles) || options.changedFiles.length === 0) {
    return { valid: false, error: "changedFiles array must be provided and non-empty for linting" };
  }
  
  // Validate each file path is a non-empty string
  for (const filePath of options.changedFiles) {
    if (!filePath || typeof filePath !== 'string') {
      return { valid: false, error: "Each file path in changedFiles must be a valid non-empty string" };
    }
  }
  
  return { valid: true };
}
