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
  xcodeproj?: string;
  xcworkspace?: string;
  codeChanges?: string;
  configPaths?: string | string[];
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
  // For LintFix, we don't require xcodeproj/xcworkspace as we can lint code changes directly
  // The main requirement is that we have either codeChanges or a project structure to work with
  if (!options.codeChanges && !options.xcodeproj && !options.xcworkspace) {
    return { valid: false, error: "Either codeChanges or project path (xcodeproj/xcworkspace) must be provided for linting" };
  }
  return { valid: true };
}
