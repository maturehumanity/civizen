/**
 * Phase 4B1 Coding Agent — path/command/secret policy.
 * Tool authority is enforced here, not by model output or repository text.
 */

export const CODING_AGENT_ID = 'b0000000-0000-4000-8000-000000000006';
export const CIVIZEN_REPO_SLUG = 'maturehumanity/civizen';
export const PHASE4B1_COMMAND_POLICY = 'phase4b1_dev';

/** Host provenance — the 4B1 SQL migration is already applied. The agent must not apply it again. */
export const PHASE4B1_SQL_MIGRATION_PROVENANCE =
  'Phase 4B1 SQL migration was already applied remotely by the operator. Future remote migrations remain prohibited to the Coding Agent.';

export const CODING_CAPABILITIES = [
  'matter.read',
  'discussion.read',
  'discussion.comment',
  'task.read',
  'task.submit',
  'evidence.read',
  'evidence.add',
  'repository.read',
  'repository.write',
  'command.run',
  'test.run',
  'diff.read',
  'artifact.add',
] as const;

export const ALWAYS_DENIED_PATH_GLOBS = [
  '.env',
  '.env.*',
  '*.pem',
  '*.key',
  '*.p12',
  'id_rsa',
  'id_ed25519',
  '*.id_rsa',
  '.ssh/**',
  '**/credentials.json',
  '**/service-account*.json',
  '**/.aws/**',
  '**/.gnupg/**',
] as const;

export const ALWAYS_DENIED_BASENAMES = new Set([
  '.env',
  'id_rsa',
  'id_ed25519',
  'id_ecdsa',
  'authorized_keys',
  'known_hosts',
  'credentials',
]);

const DENIED_BINARIES = new Set([
  'sudo',
  'ssh',
  'scp',
  'rsync',
  'docker',
  'podman',
  'kubectl',
  'systemctl',
  'curl',
  'wget',
  'env',
  'printenv',
  'export',
  'bash',
  'sh',
  'zsh',
  'python',
  'python3',
  'perl',
  'ruby',
  'node',
  'chmod',
  'chown',
  'rm',
  'dd',
  'mkfs',
]);

const ALLOWED_GIT_SUBCOMMANDS = new Set([
  'status',
  'diff',
  'show',
  'log',
  'rev-parse',
  'ls-files',
]);

const DENIED_GIT_SUBCOMMANDS = new Set([
  'push',
  'fetch',
  'pull',
  'clone',
  'reset',
  'clean',
  'rebase',
  'merge',
  'tag',
  'commit',
  'checkout',
  'branch',
  'remote',
  'stash',
  'filter-branch',
  'worktree',
]);

const DENIED_NPM_SCRIPTS = new Set([
  'verify:post-dev',
  'verify:pre-push',
  'verify:ci',
  'update:application',
  'cap:android',
  'cap:ios',
  'release:bump',
  'promote:android-testing-to-release',
  'db:apply-remote-migration',
  'db:apply-remote:federation-distribution',
  'db:vps-install-agent-key',
]);

export type CodingPolicy = {
  repositorySlug: string;
  allowedPaths: string[];
  deniedPaths: string[];
  commandPolicy: typeof PHASE4B1_COMMAND_POLICY;
  networkPolicy: 'none';
  maxExecutionTimeMs: number;
  maxCommands: number;
  maxRevisionRuns: number;
  requirePlanApproval: boolean;
  requiredGates: string[];
};

export type CommandDecision = {
  allowed: boolean;
  reason: string;
  category: 'git-read' | 'test' | 'typecheck' | 'lint' | 'build' | 'verify' | 'denied';
  argv: string[];
};

export function defaultCodingPolicy(allowedPaths: string[]): CodingPolicy {
  return {
    repositorySlug: CIVIZEN_REPO_SLUG,
    allowedPaths,
    deniedPaths: [...ALWAYS_DENIED_PATH_GLOBS],
    commandPolicy: PHASE4B1_COMMAND_POLICY,
    networkPolicy: 'none',
    maxExecutionTimeMs: 180_000,
    maxCommands: 40,
    maxRevisionRuns: 3,
    requirePlanApproval: true,
    requiredGates: [],
  };
}

export function tokenizeCommand(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    if (ch === '|' || ch === ';' || ch === '&' || ch === '>' || ch === '<' || ch === '`') {
      throw new Error('Shell metacharacters are not permitted.');
    }
    current += ch;
  }
  if (quote) throw new Error('Unclosed quote in command.');
  if (current) tokens.push(current);
  return tokens;
}

function matchesGlob(relativePath: string, glob: string): boolean {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\//, '');
  const pattern = glob.replaceAll('\\', '/');
  if (pattern === normalized) return true;
  if (pattern.startsWith('**/')) {
    const rest = pattern.slice(3);
    if (normalized === rest || normalized.endsWith(`/${rest}`)) return true;
  }
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3);
    return normalized === prefix || normalized.startsWith(`${prefix}/`);
  }
  if (pattern.startsWith('*.')) {
    return normalized.endsWith(pattern.slice(1)) || normalized.split('/').pop()?.endsWith(pattern.slice(1)) === true;
  }
  if (pattern.startsWith('.env')) {
    const base = normalized.split('/').pop() ?? normalized;
    if (pattern === '.env') return base === '.env';
    if (pattern === '.env.*') return base === '.env' || base.startsWith('.env.');
  }
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::GLOBSTAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::GLOBSTAR::/g, '.*');
  return new RegExp(`^${escaped}$`).test(normalized);
}

export function isSecretPath(relativePath: string): boolean {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\//, '');
  const base = normalized.split('/').pop() ?? normalized;
  if (ALWAYS_DENIED_BASENAMES.has(base)) return true;
  if (base === '.env' || base.startsWith('.env.')) return true;
  if (base.endsWith('.pem') || base.endsWith('.key') || base.endsWith('.p12')) return true;
  if (normalized.includes('/.ssh/') || normalized.startsWith('.ssh/')) return true;
  return ALWAYS_DENIED_PATH_GLOBS.some((glob) => matchesGlob(normalized, glob));
}

export function isPathAllowed(relativePath: string, policy: CodingPolicy): boolean {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || normalized.includes('\0')) return false;
  if (normalized.split('/').some((part) => part === '..')) return false;
  if (isSecretPath(normalized)) return false;
  for (const denied of [...ALWAYS_DENIED_PATH_GLOBS, ...policy.deniedPaths]) {
    if (matchesGlob(normalized, denied)) return false;
  }
  if (policy.allowedPaths.length === 0) return false;
  return policy.allowedPaths.some((allowed) => matchesGlob(normalized, allowed));
}

export function classifyCommand(raw: string, policy: CodingPolicy): CommandDecision {
  if (policy.commandPolicy !== PHASE4B1_COMMAND_POLICY) {
    return { allowed: false, reason: 'Unknown command policy.', category: 'denied', argv: [] };
  }
  let argv: string[];
  try {
    argv = tokenizeCommand(raw.trim());
  } catch (error) {
    return {
      allowed: false,
      reason: error instanceof Error ? error.message : 'Invalid command.',
      category: 'denied',
      argv: [],
    };
  }
  if (argv.length === 0) {
    return { allowed: false, reason: 'Empty command.', category: 'denied', argv };
  }
  const bin = argv[0];
  if (DENIED_BINARIES.has(bin) && bin !== 'npm' && bin !== 'npx') {
    return { allowed: false, reason: `${bin} is not permitted in Phase 4B1.`, category: 'denied', argv };
  }
  if (bin === 'git') {
    const sub = argv[1] ?? '';
    if (DENIED_GIT_SUBCOMMANDS.has(sub)) {
      return { allowed: false, reason: `git ${sub} is denied. Publication remains a human action.`, category: 'denied', argv };
    }
    if (!ALLOWED_GIT_SUBCOMMANDS.has(sub)) {
      return { allowed: false, reason: `git ${sub || '(missing)'} is not on the Phase 4B1 allowlist.`, category: 'denied', argv };
    }
    return { allowed: true, reason: 'Read-only git inspection.', category: 'git-read', argv };
  }
  if (bin === 'npx' && argv[1] === 'tsc' && argv.includes('--noEmit')) {
    if (argv.some((arg) => arg === '-b' || arg === '--build')) {
      return { allowed: false, reason: 'Project-build tsc is out of scope for Phase 4B1 targeted checks.', category: 'denied', argv };
    }
    return { allowed: true, reason: 'TypeScript noEmit check.', category: 'typecheck', argv };
  }
  if (bin === 'npm' && argv[1] === 'test') {
    return { allowed: true, reason: 'Targeted package tests.', category: 'test', argv };
  }
  if (bin === 'npm' && argv[1] === 'run') {
    const script = argv[2] ?? '';
    if (DENIED_NPM_SCRIPTS.has(script)) {
      return { allowed: false, reason: `${script} is a high-impact gate or deploy path and is denied.`, category: 'denied', argv };
    }
    if (script === 'build' || script === 'lint' || script === 'standards:check') {
      return { allowed: true, reason: 'Approved development check.', category: script === 'build' ? 'build' : 'lint', argv };
    }
    if (script.startsWith('verify:')) {
      return { allowed: true, reason: 'Approved targeted verification script.', category: 'verify', argv };
    }
    return { allowed: false, reason: `npm run ${script || '(missing)'} is not allowlisted.`, category: 'denied', argv };
  }
  return { allowed: false, reason: `${bin} is not an allowlisted Coding Agent command.`, category: 'denied', argv };
}

export function parseCodingPolicy(raw: unknown): CodingPolicy {
  const row = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const allowedPaths = Array.isArray(row.allowed_paths ?? row.allowedPaths)
    ? (row.allowed_paths ?? row.allowedPaths as unknown[]).map((value) => String(value).trim()).filter(Boolean)
    : [];
  const deniedPaths = Array.isArray(row.denied_paths ?? row.deniedPaths)
    ? (row.denied_paths ?? row.deniedPaths as unknown[]).map((value) => String(value).trim()).filter(Boolean)
    : [];
  const requiredGates = Array.isArray(row.required_gates ?? row.requiredGates)
    ? (row.required_gates ?? row.requiredGates as unknown[]).map((value) => String(value))
    : [];
  const base = defaultCodingPolicy(allowedPaths);
  return {
    ...base,
    repositorySlug: String(row.repository_slug ?? row.repositorySlug ?? CIVIZEN_REPO_SLUG),
    deniedPaths: [...new Set([...base.deniedPaths, ...deniedPaths])],
    maxExecutionTimeMs: Number(row.max_execution_time_ms ?? row.maxExecutionTimeMs) || base.maxExecutionTimeMs,
    maxCommands: Number(row.max_commands ?? row.maxCommands) || base.maxCommands,
    maxRevisionRuns: Number(row.max_revision_runs ?? row.maxRevisionRuns) || base.maxRevisionRuns,
    requirePlanApproval: row.require_plan_approval === false || row.requirePlanApproval === false
      ? false
      : true,
    requiredGates,
  };
}

export function codingPolicyToJson(policy: CodingPolicy): Record<string, unknown> {
  return {
    repository_slug: policy.repositorySlug,
    allowed_paths: policy.allowedPaths,
    denied_paths: policy.deniedPaths,
    command_policy: policy.commandPolicy,
    network_policy: policy.networkPolicy,
    max_execution_time_ms: policy.maxExecutionTimeMs,
    max_commands: policy.maxCommands,
    max_revision_runs: policy.maxRevisionRuns,
    require_plan_approval: policy.requirePlanApproval,
    required_gates: policy.requiredGates,
  };
}

export type ImplementationPlan = {
  title: string;
  steps: string[];
  files: string[];
  tests: string[];
  concerns: string[];
};

export function parseImplementationPlan(body: string): ImplementationPlan {
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
    return {
      title: String(data.title ?? 'Proposed implementation'),
      steps: Array.isArray(data.steps) ? data.steps.map((step) => String(step)) : [],
      files: Array.isArray(data.files) ? data.files.map((file) => String(file)) : [],
      tests: Array.isArray(data.tests) ? data.tests.map((test) => String(test)) : [],
      concerns: Array.isArray(data.concerns) ? data.concerns.map((item) => String(item)) : [],
    };
  } catch {
    const steps = body.split('\n').filter((line) => /^\d+\./.test(line.trim())).map((line) => line.trim());
    return { title: 'Proposed implementation', steps, files: [], tests: [], concerns: [] };
  }
}

export type CodeChangeArtifact = {
  baseCommitSha: string;
  changedFiles: string[];
  diff: string;
  tests: Array<{ name: string; result: 'PASS' | 'FAIL' | 'NOT RUN'; output?: string }>;
  commands: Array<{ command: string; allowed: boolean; exitCode?: number; category: string }>;
  workspaceRef: string;
  readyForHumanCommit: boolean;
  migrationsCreatedNotApplied: boolean;
  edgeFunctionsNotDeployed: boolean;
  remainingConcerns: string[];
};

export function parseCodeChangeArtifact(body: string): CodeChangeArtifact | null {
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
    if (!data.base_commit_sha && !data.baseCommitSha) return null;
    return {
      baseCommitSha: String(data.base_commit_sha ?? data.baseCommitSha),
      changedFiles: Array.isArray(data.changed_files ?? data.changedFiles)
        ? (data.changed_files ?? data.changedFiles as unknown[]).map(String)
        : [],
      diff: String(data.diff ?? ''),
      tests: Array.isArray(data.tests)
        ? data.tests.map((row) => {
          const item = row as Record<string, unknown>;
          const result = item.result === 'PASS' || item.result === 'FAIL' ? item.result : 'NOT RUN';
          return { name: String(item.name ?? 'test'), result, output: item.output ? String(item.output) : undefined };
        })
        : [],
      commands: Array.isArray(data.commands)
        ? data.commands.map((row) => {
          const item = row as Record<string, unknown>;
          return {
            command: String(item.command ?? ''),
            allowed: Boolean(item.allowed),
            exitCode: typeof item.exit_code === 'number' ? item.exit_code : undefined,
            category: String(item.category ?? ''),
          };
        })
        : [],
      workspaceRef: String(data.workspace_ref ?? data.workspaceRef ?? ''),
      readyForHumanCommit: Boolean(data.ready_for_human_commit ?? data.readyForHumanCommit),
      migrationsCreatedNotApplied: Boolean(data.migrations_created_not_applied ?? data.migrationsCreatedNotApplied),
      edgeFunctionsNotDeployed: Boolean(data.edge_functions_not_deployed ?? data.edgeFunctionsNotDeployed ?? true),
      remainingConcerns: Array.isArray(data.remaining_concerns ?? data.remainingConcerns)
        ? (data.remaining_concerns ?? data.remainingConcerns as unknown[]).map(String)
        : [],
    };
  } catch {
    return null;
  }
}

export function filterCommandOutput(text: string): string {
  return text
    .replace(/(api[_-]?key|token|secret|password)\s*[=:]\s*\S+/gi, '$1=<redacted>')
    .replace(/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '<redacted-jwt>')
    .slice(0, 8000);
}

export function promptInjectionCannotGrant(text: string): boolean {
  const lowered = text.toLowerCase();
  return /ignore (your|all) (scope|rules|policy)|run sudo|git push origin main|read \.env/.test(lowered);
}

export function parseScopeExpansionRequest(body: string): {
  path: string;
  reason: string;
  intended: string;
} | null {
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
    const path = String(data.path ?? '').trim();
    if (!path) return null;
    return {
      path,
      reason: String(data.reason ?? 'Write denied by current path scope.'),
      intended: String(data.intended ?? data.intended_modification ?? ''),
    };
  } catch {
    return null;
  }
}
