export interface SpawnOutputResult {
  stdout: string;
  stderr: string;
}
import { execa } from "execa";
export interface SpawnOutputResult {
  stdout: string;
  stderr: string;
}

export async function spawnAndCollectOutput(cmd: string): Promise<SpawnOutputResult> {
  try {
    const { stdout, stderr } = await execa(cmd, { shell: true });
    return { stdout, stderr };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || ''
    };
  }
}
