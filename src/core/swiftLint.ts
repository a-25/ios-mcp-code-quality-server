import { execa } from "execa";
import fs from "fs-extra";
import path from "path";
import os from "os";

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

export async function checkSwiftLintInstallation(): Promise<{ installed: boolean; version?: string; error?: string }> {
  try {
    const { stdout } = await execa("swiftlint", ["version"]);
    return { installed: true, version: stdout.trim() };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return { 
        installed: false, 
        error: "SwiftLint is not installed. Please install it using: brew install swiftlint" 
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
  configPaths?: string | string[]
): Promise<SwiftLintResult> {
  try {
    const args = ["lint", "--path", targetPath, "--reporter", "json"];
    
    // Add config file arguments
    if (configPaths) {
      const configs = Array.isArray(configPaths) ? configPaths : [configPaths];
      for (const configPath of configs) {
        if (await fs.pathExists(configPath)) {
          args.push("--config", configPath);
        }
      }
    }

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
    } catch (parseError) {
      // If JSON parsing fails, treat as plain text output
      console.warn("[SwiftLint] Failed to parse JSON output, using plain text");
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

export async function runSwiftLintOnCodeChanges(
  codeChanges: string,
  configPaths?: string | string[]
): Promise<SwiftLintResult> {
  try {
    // Create a temporary Swift file with the code changes
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swiftlint-'));
    const tempFile = path.join(tempDir, 'temp.swift');
    
    try {
      await fs.writeFile(tempFile, codeChanges);
      const result = await runSwiftLintWithConfig(tempFile, configPaths);
      
      // Update file paths in warnings to be more meaningful
      result.warnings = result.warnings.map(warning => ({
        ...warning,
        file: warning.file.replace(tempFile, '<code-changes>')
      }));
      
      return result;
    } catch (error: any) {
      return {
        warnings: [],
        output: '',
        success: false,
        error: `Failed to create temp file for linting: ${error.message}`
      };
    } finally {
      // Clean up temp file
      try {
        await fs.remove(tempDir);
      } catch (cleanupError) {
        console.warn("[SwiftLint] Failed to cleanup temp file:", cleanupError);
      }
    }
  } catch (error: any) {
    return {
      warnings: [],
      output: '',
      success: false,
      error: `Failed to create temp file for linting: ${error.message}`
    };
  }
}

export async function runSwiftLint(targetPath: string): Promise<string> {
  try {
    const { stdout } = await execa("swiftlint", ["lint", "--path", targetPath]);
    return stdout;
  } catch (error: any) {
    return error.stdout || "[SwiftLint] Failed to run.";
  }
}

export async function runSwiftLintFix(targetPath: string): Promise<string> {
  try {
    const { stdout } = await execa("swiftlint", ["autocorrect", "--path", targetPath]);
    return stdout;
  } catch (error: any) {
    return error.stdout || "[SwiftLint] Fix failed.";
  }
}

