export interface ValidationResult {
  valid: boolean;
  error?: string;
}
export interface TestFixOptions {
  xcodeproj?: string;
  xcworkspace?: string;
  scheme: string;
  destination?: string;
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

export interface LintOptions {
  /**
   * Path to analyze (required)
   */
  path: string;
  xcodeproj?: string;
  xcworkspace?: string;
}

export function validateTestFixOptions(options: Partial<TestFixOptions>): ValidationResult {
  if (!options.xcodeproj && !options.xcworkspace) {
    return { valid: false, error: "Either xcodeproj or xcworkspace must be provided" };
  }
  if (!options.scheme) {
    return { valid: false, error: "Scheme must be provided for test-fix" };
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

export function validateLintOptions(options: Partial<LintOptions>): ValidationResult {
  if (!options.path || typeof options.path !== 'string') {
    return { valid: false, error: "Path must be provided and be a valid string" };
  }
  
  return { valid: true };
}
