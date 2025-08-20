import { execa } from "execa";
import fs from "fs-extra";

export interface SwiftLintWarning {
  file: string;
  line?: number;
  column?: number;
  severity: string;
  message: string;
  rule?: string;
}

export interface SwiftLintResult {
  warnings: SwiftLintWarning[];
  output: string;
  success: boolean;
  error?: string;
}

export interface SwiftLintInstallationResult {
  installed: boolean;
  version?: string;
  error?: string;
}

export async function checkSwiftLintInstallation(): Promise<SwiftLintInstallationResult> {
  try {
    const { stdout } = await execa("swiftlint", ["version"]);
    return { installed: true, version: stdout.trim() };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return { 
        installed: false, 
        error: "SwiftLint is not installed. Please install it from: https://github.com/realm/SwiftLint?tab=readme-ov-file#installation" 
      };
    }
    return { 
      installed: false, 
      error: `SwiftLint check failed: ${error.message || error.stdout || 'Unknown error'}` 
    };
  }
}

export async function runSwiftLintWithConfig(
  targetPath: string, 
  configPath?: string
): Promise<SwiftLintResult> {
  try {
    const args = ["lint", "--reporter", "json"];
    
    // Add config file argument if provided and exists
    if (configPath && await fs.pathExists(configPath)) {
      args.push("--config", configPath);
    }
    
    // Add target path as positional argument at the end
    args.push(targetPath);

    const { stdout, stderr } = await execa("swiftlint", args);
    
    // Parse JSON output to extract warnings
    let warnings: SwiftLintWarning[] = [];
    try {
      if (stdout.trim()) {
        const jsonLines = stdout.trim().split('\n');
        warnings = jsonLines.map(line => {
          const parsed = JSON.parse(line);
          return {
            file: parsed.file || '',
            line: parsed.line,
            column: parsed.character,
            severity: parsed.severity || 'warning',
            message: parsed.reason || '',
            rule: parsed.rule_id
          };
        });
      }
    } catch (parseError: any) {
      // If JSON parsing fails, treat as plain text output
      console.warn("[SwiftLint] Failed to parse JSON output, using plain text:", parseError.message);
    }

    return {
      warnings,
      output: stdout || stderr || '',
      success: true
    };
  } catch (error: any) {
    return {
      warnings: [],
      output: error.stdout || error.stderr || '',
      success: false,
      error: error.message || "[SwiftLint] Failed to run."
    };
  }
}

export async function runSwiftLintOnChangedFiles(
  changedFiles: string[],
  configPath?: string
): Promise<SwiftLintResult> {
  try {
    const args = ["lint", "--reporter", "json"];
    
    // Add config file argument if provided and exists
    if (configPath && await fs.pathExists(configPath)) {
      args.push("--config", configPath);
    }
    
    // Add each changed file as a positional argument
    args.push(...changedFiles);

    const { stdout, stderr } = await execa("swiftlint", args);
    
    // Parse JSON output to extract warnings
    let warnings: SwiftLintWarning[] = [];
    try {
      if (stdout.trim()) {
        const jsonLines = stdout.trim().split('\n');
        warnings = jsonLines.map(line => {
          const parsed = JSON.parse(line);
          return {
            file: parsed.file || '',
            line: parsed.line,
            column: parsed.character,
            severity: parsed.severity || 'warning',
            message: parsed.reason || '',
            rule: parsed.rule_id
          };
        });
      }
    } catch (parseError: any) {
      // If JSON parsing fails, treat as plain text output
      console.warn("[SwiftLint] Failed to parse JSON output, using plain text:", parseError.message);
    }

    return {
      warnings,
      output: stdout || stderr || '',
      success: true
    };
  } catch (error: any) {
    return {
      warnings: [],
      output: error.stdout || error.stderr || '',
      success: false,
      error: error.message || "[SwiftLint] Failed to run."
    };
  }
}


