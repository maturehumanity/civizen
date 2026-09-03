/**
 * Model-driven Coding Agent loop. Every file/command goes through the trusted runner.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  codingAgentSystemPrompt,
  codingAgentUserPrompt,
  wrapUntrustedRepositoryText,
  type CodingAgentMessage,
  type CodingAgentModelAdapter,
  type CodingAgentToolCall,
  CODING_AGENT_TOOL_SPECS,
} from '@/lib/matters-coding-model';
import {
  PHASE4B1_SQL_MIGRATION_PROVENANCE,
  type CodingPolicy,
  type ImplementationPlan,
} from '@/lib/matters-coding-policy';
import {
  listAllowedFiles,
  readWorkspaceFile,
  runAllowedCommand,
  workspaceDiff,
  writeWorkspaceFile,
  type IsolatedWorkspace,
} from '@/lib/matters-coding-runner';

export type CodingAgentLoopTask = {
  instructions: string;
  matterTitle?: string;
  matterDescription?: string;
  approvedPlan?: string | null;
  requestedChanges?: string | null;
  revisionNumber?: number;
};

export type CodingAgentToolTrace = {
  name: string;
  arguments: Record<string, unknown>;
  allowed: boolean;
  reason: string;
  workspaceRoot: string;
  outputExcerpt: string;
};

export type CodingAgentLoopResult = {
  stage: 'plan' | 'execute';
  executionMode: 'provider' | 'fake_model';
  provider: string;
  modelRef: string | null;
  modelDriven: true;
  workspaceRoot: string;
  baseCommitSha: string;
  plan?: ImplementationPlan;
  toolTrace: CodingAgentToolTrace[];
  commands: Array<{ command: string; allowed: boolean; exitCode?: number; category: string }>;
  tests: Array<{ name: string; result: 'PASS' | 'FAIL' | 'NOT RUN'; output?: string }>;
  changedFiles: string[];
  diff: string;
  denials: Array<{ kind: 'path' | 'command' | 'tool'; detail: string; reason: string }>;
  scopeRequests: Array<{ path: string; reason: string; intended: string }>;
  remainingConcerns: string[];
  inspectedFiles: string[];
  testsFailed: boolean;
};

const MAX_TOOL_TURNS = 20;

function excerpt(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 500);
}

function stringArg(args: Record<string, unknown>, key: string): string {
  return String(args[key] ?? '').trim();
}

function dispatchTool(
  call: CodingAgentToolCall,
  ctx: {
    stage: 'plan' | 'execute';
    workspace: IsolatedWorkspace;
    policy: CodingPolicy;
    commandCount: { value: number };
    inspected: Set<string>;
    result: CodingAgentLoopResult;
    finish: { payload: Record<string, unknown> | null };
  },
): { allowed: boolean; reason: string; content: string } {
  const name = call.name;
  const args = call.arguments ?? {};
  if (name === 'list_files') {
    const files = listAllowedFiles(ctx.workspace, ctx.policy);
    return {
      allowed: true,
      reason: 'Allowed-file listing from host policy.',
      content: files.length ? files.map((file) => `- ${file}`).join('\n') : '(no allowed files)',
    };
  }
  if (name === 'read_file') {
    const path = stringArg(args, 'path');
    try {
      const body = readWorkspaceFile(ctx.workspace, path, ctx.policy);
      ctx.inspected.add(path);
      return { allowed: true, reason: 'Read allowed by policy.', content: wrapUntrustedRepositoryText(path, body) };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Read denied.';
      ctx.result.denials.push({ kind: 'path', detail: path, reason });
      return { allowed: false, reason, content: `DENIED: ${reason}` };
    }
  }
  if (name === 'write_file') {
    const path = stringArg(args, 'path');
    if (ctx.stage === 'plan') {
      const reason = 'Writes are not permitted during planning.';
      ctx.result.denials.push({ kind: 'tool', detail: path, reason });
      return { allowed: false, reason, content: `DENIED: ${reason}` };
    }
    try {
      writeWorkspaceFile(ctx.workspace, path, String(args.content ?? ''), ctx.policy);
      ctx.inspected.add(path);
      return { allowed: true, reason: 'Write allowed by policy.', content: `Wrote ${path}` };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Write denied.';
      ctx.result.denials.push({ kind: 'path', detail: path, reason });
      if (!ctx.policy.allowedPaths.some((allowed) => path === allowed || path.startsWith(allowed.replace(/\/\*\*$/, '/')))) {
        ctx.result.scopeRequests.push({
          path,
          reason,
          intended: 'Needed for this Task but not in the authorized path list.',
        });
      }
      return { allowed: false, reason, content: `DENIED: ${reason}` };
    }
  }
  if (name === 'run_command') {
    const command = stringArg(args, 'command');
    const ran = runAllowedCommand(ctx.workspace, command, ctx.policy, ctx.commandCount.value);
    ctx.commandCount.value += 1;
    ctx.result.commands.push({
      command,
      allowed: ran.allowed,
      exitCode: ran.exitCode,
      category: ran.category,
    });
    if (!ran.allowed) {
      ctx.result.denials.push({ kind: 'command', detail: command, reason: ran.reason });
    }
    if (ran.category === 'test' || command.startsWith('npm test')) {
      ctx.result.tests.push({
        name: command,
        result: ran.allowed && ran.exitCode === 0 ? 'PASS' : ran.allowed ? 'FAIL' : 'NOT RUN',
        output: ran.output.slice(0, 500) || ran.reason,
      });
    }
    return {
      allowed: ran.allowed,
      reason: ran.reason,
      content: ran.allowed
        ? `exit=${ran.exitCode}\n${ran.output || '(no output)'}`
        : `DENIED: ${ran.reason}`,
    };
  }
  if (name === 'request_scope_expansion') {
    const path = stringArg(args, 'path');
    const reason = stringArg(args, 'reason') || 'Write denied by current path scope.';
    const intended = stringArg(args, 'intended');
    ctx.result.scopeRequests.push({ path, reason, intended });
    return { allowed: true, reason: 'Recorded for human approval.', content: `Scope expansion requested for ${path}` };
  }
  if (name === 'finish') {
    ctx.finish.payload = args;
    return { allowed: true, reason: 'Stage finished by model.', content: 'Finished.' };
  }
  const reason = `Unknown tool ${name} is not exposed by the Coding Agent host.`;
  ctx.result.denials.push({ kind: 'tool', detail: name, reason });
  return { allowed: false, reason, content: `DENIED: ${reason}` };
}

function defaultTests(
  workspace: IsolatedWorkspace,
  policy: CodingPolicy,
  commandCount: { value: number },
  result: CodingAgentLoopResult,
): void {
  if (result.tests.length > 0) return;
  const testFiles = listAllowedFiles(workspace, policy).filter((file) => /\.(test|spec)\.(ts|tsx|js)$/.test(file));
  if (testFiles.length === 0 || !existsSync(join(workspace.root, 'package.json'))) {
    result.tests.push({
      name: testFiles[0] ?? 'targeted tests',
      result: 'NOT RUN',
      output: testFiles[0]
        ? 'Test file is not runnable in this worktree (no package.json).'
        : 'No allowed test file at the recorded base commit.',
    });
    return;
  }
  const command = `npm test -- ${testFiles[0]}`;
  const ran = runAllowedCommand(workspace, command, policy, commandCount.value);
  commandCount.value += 1;
  result.commands.push({ command, allowed: ran.allowed, exitCode: ran.exitCode, category: ran.category });
  result.tests.push({
    name: testFiles[0],
    result: ran.allowed && ran.exitCode === 0 ? 'PASS' : ran.allowed ? 'FAIL' : 'NOT RUN',
    output: (ran.output || ran.reason).slice(0, 500),
  });
}

export function runCodingAgentLoop(input: {
  stage: 'plan' | 'execute';
  workspace: IsolatedWorkspace;
  policy: CodingPolicy;
  task: CodingAgentLoopTask;
  model: CodingAgentModelAdapter;
}): Promise<CodingAgentLoopResult> {
  const allowedFiles = listAllowedFiles(input.workspace, input.policy);
  const result: CodingAgentLoopResult = {
    stage: input.stage,
    executionMode: input.model.id === 'gemini' ? 'provider' : 'fake_model',
    provider: input.model.id === 'gemini' ? 'gemini' : 'fake',
    modelRef: input.model.modelRef,
    modelDriven: true,
    workspaceRoot: input.workspace.root,
    baseCommitSha: input.workspace.baseCommitSha,
    toolTrace: [],
    commands: [],
    tests: [],
    changedFiles: [],
    diff: '',
    denials: [],
    scopeRequests: [],
    remainingConcerns: [],
    inspectedFiles: [],
    testsFailed: false,
  };
  const inspected = new Set<string>();
  const commandCount = { value: 0 };
  const finish = { payload: null as Record<string, unknown> | null };
  const system = codingAgentSystemPrompt({ stage: input.stage, policy: input.policy, allowedFiles });
  const messages: CodingAgentMessage[] = [{
    role: 'user',
    content: codingAgentUserPrompt({ stage: input.stage, ...input.task }),
  }];

  const run = async () => {
    for (let turn = 0; turn < MAX_TOOL_TURNS && !finish.payload; turn += 1) {
      const modelTurn = await input.model.complete({
        system,
        messages,
        tools: CODING_AGENT_TOOL_SPECS,
      });
      const calls = modelTurn.toolCalls.filter((call) => call?.name);
      messages.push({
        role: 'assistant',
        content: modelTurn.text ?? '',
        toolCalls: calls,
      });
      if (calls.length === 0) {
        finish.payload = { summary: modelTurn.text ?? 'Model returned no tool calls.', concerns: [] };
        break;
      }
      for (const call of calls) {
        const dispatched = dispatchTool(call, {
          stage: input.stage,
          workspace: input.workspace,
          policy: input.policy,
          commandCount,
          inspected,
          result,
          finish,
        });
        result.toolTrace.push({
          name: call.name,
          arguments: call.name === 'write_file' ? { path: call.arguments?.path } : call.arguments,
          allowed: dispatched.allowed,
          reason: dispatched.reason,
          workspaceRoot: input.workspace.root,
          outputExcerpt: excerpt(dispatched.content),
        });
        messages.push({
          role: 'tool',
          toolName: call.name,
          content: dispatched.content,
        });
      }
    }
    if (!finish.payload) {
      finish.payload = { summary: 'Reached the host tool-turn budget.', concerns: ['Stopped at the host tool-turn limit.'] };
    }
    if (input.stage === 'plan') {
      const payload = finish.payload;
      result.plan = {
        title: String(payload.title ?? 'Proposed implementation'),
        steps: Array.isArray(payload.steps) ? payload.steps.map(String) : ['Inspect authorized files', 'Propose bounded edits', 'Run permitted tests'],
        files: Array.isArray(payload.files) ? payload.files.map(String) : allowedFiles,
        tests: Array.isArray(payload.tests) ? payload.tests.map(String) : input.policy.requiredGates,
        concerns: Array.isArray(payload.concerns) ? payload.concerns.map(String) : ['Will not commit, push, deploy, or apply remote migrations'],
      };
    } else {
      defaultTests(input.workspace, input.policy, commandCount, result);
      const diff = workspaceDiff(input.workspace, input.policy);
      result.changedFiles = diff.changedFiles;
      result.diff = diff.diff;
      result.testsFailed = result.tests.some((row) => row.result === 'FAIL');
    }
    result.inspectedFiles = [...inspected];
    result.remainingConcerns = [
      'Not committed, pushed, or deployed',
      PHASE4B1_SQL_MIGRATION_PROVENANCE,
      ...(Array.isArray(finish.payload.concerns) ? finish.payload.concerns.map(String) : []),
      ...result.tests.filter((row) => row.result === 'NOT RUN').map((row) => `${row.name}: NOT RUN`),
    ];
    return result;
  };
  return run();
}

export function serializeCodeChangeArtifact(result: CodingAgentLoopResult): Record<string, unknown> {
  return {
    base_commit_sha: result.baseCommitSha,
    changed_files: result.changedFiles,
    diff: result.diff,
    tests: result.tests,
    commands: result.commands,
    workspace_ref: result.workspaceRoot,
    ready_for_human_commit: !result.testsFailed && result.tests.every((row) => row.result !== 'FAIL'),
    migrations_created_not_applied: false,
    remote_migrations_applied_by_agent: false,
    edge_functions_not_deployed: true,
    remaining_concerns: result.remainingConcerns,
    inspected: result.inspectedFiles,
    execution_mode: result.executionMode,
    provider: result.provider,
    model: result.modelRef,
    model_driven: true,
    phase4b1_sql_migration: 'already_applied_by_operator',
  };
}
