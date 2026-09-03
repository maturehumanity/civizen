/**
 * Phase 4B1 trusted Coding Agent runner primitives.
 * Executes only inside an isolated git worktree. Never mutates the primary tree.
 */
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
  existsSync,
  lstatSync,
  unlinkSync,
  rmSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

import {
  classifyCommand,
  filterCommandOutput,
  isPathAllowed,
  type CodingPolicy,
  type CommandDecision,
} from '@/lib/matters-coding-policy';

export type IsolatedWorkspace = {
  root: string;
  baseCommitSha: string;
  primaryRoot: string;
  primaryDirtySummary: string;
};

function runGit(cwd: string, args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 2_000_000 });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

export function gitHeadSha(repoRoot: string): string {
  const result = runGit(repoRoot, ['rev-parse', 'HEAD']);
  if (result.status !== 0) throw new Error('Could not read repository HEAD.');
  return result.stdout.trim();
}

export function gitDirtySummary(repoRoot: string): string {
  const result = runGit(repoRoot, ['status', '--porcelain']);
  return result.stdout.trim();
}

export function resolveRepoSlug(repoRoot: string): string | null {
  const result = runGit(repoRoot, ['remote', 'get-url', 'origin']);
  if (result.status !== 0) return null;
  const url = result.stdout.trim();
  const match = url.match(/github\.com[:/]([^/]+\/[^/.]+)(?:\.git)?$/i);
  return match ? match[1].replace(/\.git$/, '') : null;
}

function assertInside(workspaceRoot: string, candidate: string): string {
  const rootReal = realpathSync(workspaceRoot);
  let targetReal: string;
  try {
    targetReal = realpathSync(candidate);
  } catch {
    const parent = dirname(candidate);
    const parentReal = existsSync(parent) ? realpathSync(parent) : rootReal;
    targetReal = join(parentReal, candidate.slice(parent.length));
  }
  const rel = relative(rootReal, targetReal);
  if (rel.startsWith('..') || rel.includes(`..${sep}`) || resolve(rootReal, rel) === rel && !targetReal.startsWith(rootReal)) {
    throw new Error('Path escapes the isolated workspace.');
  }
  if (!targetReal.startsWith(rootReal + sep) && targetReal !== rootReal) {
    throw new Error('Path escapes the isolated workspace.');
  }
  return targetReal;
}

export function toWorkspaceRelative(workspaceRoot: string, absPath: string): string {
  return relative(realpathSync(workspaceRoot), absPath).replaceAll('\\', '/');
}

export function createIsolatedWorktree(
  primaryRoot: string,
  worktreeParent: string,
  runId: string,
  baseSha?: string,
): IsolatedWorkspace {
  const sha = (baseSha && /^[0-9a-f]{7,40}$/i.test(baseSha)) ? baseSha : gitHeadSha(primaryRoot);
  const dirty = gitDirtySummary(primaryRoot);
  mkdirSync(worktreeParent, { recursive: true });
  const root = join(worktreeParent, `run-${runId}`);
  if (existsSync(root)) {
    runGit(primaryRoot, ['worktree', 'remove', '--force', root]);
    if (existsSync(root)) {
      rmSync(root, { recursive: true, force: true });
    }
  }
  const added = runGit(primaryRoot, ['worktree', 'add', '--detach', root, sha]);
  if (added.status !== 0) {
    throw new Error(added.stderr || 'Could not create isolated git worktree.');
  }
  const workspace: IsolatedWorkspace = {
    root: realpathSync(root),
    baseCommitSha: runGit(root, ['rev-parse', 'HEAD']).stdout.trim(),
    primaryRoot: realpathSync(primaryRoot),
    primaryDirtySummary: dirty,
  };
  linkWorkspaceDependencies(workspace);
  return workspace;
}

/** Share the primary tree's node_modules; never copy .env or secrets. */
export function linkWorkspaceDependencies(workspace: IsolatedWorkspace): void {
  const primaryModules = join(workspace.primaryRoot, 'node_modules');
  const workspaceModules = join(workspace.root, 'node_modules');
  if (!existsSync(primaryModules) || existsSync(workspaceModules)) return;
  symlinkSync(primaryModules, workspaceModules);
}

export function removeIsolatedWorktree(primaryRoot: string, workspaceRoot: string): void {
  const modules = join(workspaceRoot, 'node_modules');
  try {
    if (existsSync(modules) && lstatSync(modules).isSymbolicLink()) {
      unlinkSync(modules);
    }
  } catch {
    // cleanup is best-effort
  }
  runGit(primaryRoot, ['worktree', 'remove', '--force', workspaceRoot]);
}

export function readWorkspaceFile(
  workspace: IsolatedWorkspace,
  relativePath: string,
  policy: CodingPolicy,
): string {
  if (!isPathAllowed(relativePath, policy)) {
    throw new Error(`Read denied by policy: ${relativePath}`);
  }
  const abs = assertInside(workspace.root, join(workspace.root, relativePath));
  if (lstatSync(abs).isSymbolicLink()) {
    const real = realpathSync(abs);
    assertInside(workspace.root, real);
    const rel = toWorkspaceRelative(workspace.root, real);
    if (!isPathAllowed(rel, policy)) {
      throw new Error(`Read denied through symlink: ${relativePath}`);
    }
  }
  const content = readFileSync(abs, 'utf8');
  if (/\b(GEMINI_API_KEY|SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE|BEGIN OPENSSH PRIVATE KEY)\b/.test(content)) {
    throw new Error('Refusing to load secret-bearing file contents.');
  }
  return content.length > 80_000 ? `${content.slice(0, 80_000)}\n/* truncated */` : content;
}

export function writeWorkspaceFile(
  workspace: IsolatedWorkspace,
  relativePath: string,
  content: string,
  policy: CodingPolicy,
): void {
  if (!isPathAllowed(relativePath, policy)) {
    throw new Error(`Write denied by policy: ${relativePath}`);
  }
  const abs = join(workspace.root, relativePath);
  mkdirSync(dirname(abs), { recursive: true });
  const parent = dirname(abs);
  assertInside(workspace.root, parent);
  if (existsSync(abs) && lstatSync(abs).isSymbolicLink()) {
    throw new Error('Refusing to write through a symlink.');
  }
  writeFileSync(abs, content, { encoding: 'utf8', flag: 'w' });
  assertInside(workspace.root, abs);
}

export function runAllowedCommand(
  workspace: IsolatedWorkspace,
  rawCommand: string,
  policy: CodingPolicy,
  commandCount: number,
): CommandDecision & { exitCode: number; output: string } {
  if (commandCount >= policy.maxCommands) {
    return {
      allowed: false,
      reason: 'Command budget exhausted.',
      category: 'denied',
      argv: [],
      exitCode: 126,
      output: '',
    };
  }
  const decision = classifyCommand(rawCommand, policy);
  if (!decision.allowed) {
    return { ...decision, exitCode: 126, output: '' };
  }
  const result = spawnSync(decision.argv[0], decision.argv.slice(1), {
    cwd: workspace.root,
    encoding: 'utf8',
    timeout: Math.min(policy.maxExecutionTimeMs, 120_000),
    maxBuffer: 2_000_000,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
    },
  });
  const output = filterCommandOutput(`${result.stdout ?? ''}${result.stderr ?? ''}`);
  return {
    ...decision,
    exitCode: result.status ?? 1,
    output,
  };
}

export function workspaceDiff(workspace: IsolatedWorkspace, policy: CodingPolicy): {
  changedFiles: string[];
  diff: string;
} {
  const names = runGit(workspace.root, ['diff', '--name-only', workspace.baseCommitSha]);
  const changedFiles = names.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => isPathAllowed(file, policy));
  const diff = runGit(workspace.root, ['diff', workspace.baseCommitSha, '--', ...changedFiles]);
  return {
    changedFiles,
    diff: filterCommandOutput(diff.stdout).slice(0, 60_000),
  };
}

export function listAllowedFiles(workspace: IsolatedWorkspace, policy: CodingPolicy): string[] {
  const listed = runGit(workspace.root, ['ls-files']);
  return listed.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => isPathAllowed(file, policy));
}

/** Test helper: create a symlink that should be rejected by policy. */
export function plantEscapeSymlink(workspace: IsolatedWorkspace, linkName: string, target: string): void {
  symlinkSync(target, join(workspace.root, linkName));
}
