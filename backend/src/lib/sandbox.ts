import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const SANDBOX_BASE =
  process.env.SANDBOX_BASE_PATH ??
  path.resolve(process.cwd(), "..", "workspace");

const SANDBOX_IMAGE = process.env.SANDBOX_IMAGE ?? "node:20-alpine";

/**
 * Each project gets its own subfolder under the workspace directory.
 * e.g. /Users/abhishek/Claude-hackathon/workspace/my-project/
 */
export async function provisionSandbox(slug: string): Promise<string> {
  const sandboxPath = path.join(SANDBOX_BASE, slug);
  await fs.mkdir(sandboxPath, { recursive: true });
  return sandboxPath;
}

export async function destroySandbox(sandboxPath: string): Promise<void> {
  try {
    await fs.rm(sandboxPath, { recursive: true, force: true });
  } catch {
    // Ignore errors when destroying
  }
}

/**
 * The sandbox cwd IS the project folder directly (no nested workspace dir).
 * /Users/abhishek/Claude-hackathon/workspace/my-project/
 */
export function getSandboxCwd(sandboxPath: string): string {
  return sandboxPath;
}

export async function runInSandbox(
  sandboxPath: string,
  command: string
): Promise<{ stdout: string; stderr: string }> {
  const cwd = getSandboxCwd(sandboxPath);
  try {
    return await execAsync(command, { cwd, timeout: 60_000 });
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? e.message ?? "Unknown error",
    };
  }
}
