import { spawn } from "child_process";
import fs from "fs-extra";

export async function spawnAndCollectOutput(cmd: string): Promise<{ stdout: string, stderr: string }> {
  const outFile = './xcodebuild.stdout.log';
  const errFile = './xcodebuild.stderr.log';
  let outStream: fs.WriteStream | undefined;
  let errStream: fs.WriteStream | undefined;
  try {
    outStream = fs.createWriteStream(outFile);
    errStream = fs.createWriteStream(errFile);
    const child = spawn(cmd, { shell: true });
    child.stdout.pipe(outStream);
    child.stderr.pipe(errStream);
    await new Promise((resolve, reject) => {
      child.on('close', resolve);
      child.on('error', reject);
    });
    await Promise.all([
      new Promise<void>(res => {
        if (outStream) outStream.on('finish', () => res()); else res();
        setTimeout(res, 5000);
      }),
      new Promise<void>(res => {
        if (errStream) errStream.on('finish', () => res()); else res();
        setTimeout(res, 5000);
      })
    ]);
    const stdout = await fs.readFile(outFile, 'utf8');
    const stderr = await fs.readFile(errFile, 'utf8');
    return { stdout, stderr };
  } finally {
    if (outStream && !outStream.closed) outStream.end();
    if (errStream && !errStream.closed) errStream.end();
    try { await fs.remove(outFile); } catch {}
    try { await fs.remove(errFile); } catch {}
  }
}
