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
  if (!options.xcodeproj && !options.xcworkspace) {
  return { valid: false, error: "Either xcodeproj or xcworkspace must be provided" };
  }
  return { valid: true };
}
