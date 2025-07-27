import { execa } from "execa";

export async function runShellCommand(cmd: string, args: string[] = []): Promise<string> {
  try {
    const { stdout } = await execa(cmd, args);
    return stdout;
  } catch (error: any) {
    return error.stdout || error.message;
  }
}

