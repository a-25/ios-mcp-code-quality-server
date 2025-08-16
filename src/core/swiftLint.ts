import { execa } from "execa";

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

