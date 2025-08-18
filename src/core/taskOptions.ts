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
  codeFileChanges: CodeFileChange[];
  configPath?: string;
}

import type { CodeFileChange } from './swiftLint.js';

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
  // For LintFix, we require codeFileChanges array
  if (!options.codeFileChanges || !Array.isArray(options.codeFileChanges) || options.codeFileChanges.length === 0) {
    return { valid: false, error: "codeFileChanges array must be provided and non-empty for linting" };
  }
  
  // Validate each code file change has required fields
  for (const codeChange of options.codeFileChanges) {
    if (!codeChange.name || typeof codeChange.name !== 'string') {
      return { valid: false, error: "Each code file change must have a valid 'name' field" };
    }
    if (!codeChange.changes || typeof codeChange.changes !== 'string') {
      return { valid: false, error: "Each code file change must have a valid 'changes' field" };
    }
  }
  
  return { valid: true };
}
