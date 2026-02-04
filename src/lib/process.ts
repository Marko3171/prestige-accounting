import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function runCommand(
  command: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv }
) {
  const mergedEnv = options?.env ? { ...process.env, ...options.env } : { ...process.env };
  const userProfile = mergedEnv.USERPROFILE ?? process.env.USERPROFILE ?? "";
  const scoopShims = userProfile
    ? path.join(userProfile, "scoop", "shims")
    : "";
  if (scoopShims && mergedEnv.PATH && !mergedEnv.PATH.includes(scoopShims)) {
    mergedEnv.PATH = `${scoopShims};${mergedEnv.PATH}`;
  }
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: options?.cwd,
    env: mergedEnv,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  return { stdout, stderr };
}
