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

export interface SwiftLintInstallationResult {
  installed: boolean;
  version?: string;
  error?: string;
}

export interface CodeFileChange {
  name: string;
  changes: string;
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
    } catch (parseError) {
      // If JSON parsing fails, treat as plain text output
      console.warn("[SwiftLint] Failed to parse JSON output, using plain text:", (parseError as Error).message);
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
  codeFileChanges: CodeFileChange[],
  configPath?: string
): Promise<SwiftLintResult> {
  try {
    // Create a temporary directory for all the changed files
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swiftlint-'));
    const tempFiles: string[] = [];
    
    try {
      // Create temporary files for each code change
      for (const codeChange of codeFileChanges) {
        const tempFile = path.join(tempDir, codeChange.name);
        // Ensure the directory structure exists
        await fs.ensureDir(path.dirname(tempFile));
        await fs.writeFile(tempFile, codeChange.changes);
        tempFiles.push(tempFile);
      }

      // Run SwiftLint on the entire temp directory
      const result = await runSwiftLintWithConfig(tempDir, configPath);
      
      // Update file paths in warnings to map back to original file names
      result.warnings = result.warnings.map(warning => {
        // Find which original file this warning corresponds to
        for (const codeChange of codeFileChanges) {
          const expectedTempPath = path.join(tempDir, codeChange.name);
          if (warning.file === expectedTempPath) {
            return {
              ...warning,
              file: codeChange.name
            };
          }
        }
        // If no match found, use relative path from temp dir
        return {
          ...warning,
          file: warning.file.replace(tempDir + path.sep, '')
        };
      });
      
      return result;
    } catch (error: any) {
      return {
        warnings: [],
        output: '',
        success: false,
        error: `Failed to process code changes: ${error.message}`
      };
    } finally {
      // Clean up temp directory
      try {
        await fs.remove(tempDir);
      } catch (cleanupError) {
        console.warn("[SwiftLint] Failed to cleanup temp directory", tempDir, ":", (cleanupError as Error).message);
      }
    }
  } catch (error: any) {
    return {
      warnings: [],
      output: '',
      success: false,
      error: `Failed to create temp directory for linting: ${error.message}`
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

