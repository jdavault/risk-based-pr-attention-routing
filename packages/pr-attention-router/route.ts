/**
 * PR attention router. Code guarantees floors for sensitive paths, failing CI,
 * and big changes; the host rubric defines LOW, MEDIUM, and HIGH; the AI
 * applies that rubric and may raise the floor but can never lower it.
 *
 * Pure functions first; the CLI the workflow calls is at the bottom.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, matchesGlob } from 'node:path';
import { fileURLToPath } from 'node:url';

export type Tier = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Rule {
  readonly id: string;
  readonly tier: 'HIGH' | 'MEDIUM';
  readonly paths: readonly string[];
  readonly why: string;
}

export interface Evidence {
  readonly base: string;
  readonly head: string;
  readonly changedPaths: readonly string[];
  readonly changedLines: number;
  readonly validationPassed: boolean;
}

export interface PullRequest {
  readonly number: number;
  readonly title: string;
  readonly url: string;
}

export interface AiClassification {
  readonly tier: Tier;
  readonly summary: string;
  readonly reasons: readonly string[];
  readonly reviewFocus: readonly string[];
}

export interface Floor {
  readonly tier: Tier;
  readonly reasons: readonly string[];
}

export interface RouteInput {
  readonly changedPaths: readonly string[];
  readonly changedLines: number;
  readonly validationPassed: boolean;
  readonly rules: readonly Rule[];
  readonly aiClassification: unknown;
  readonly previousTier: Tier | null;
  readonly pullRequest: PullRequest;
}

export interface RouteResult {
  readonly deterministicFloor: Tier;
  readonly floorReasons: readonly string[];
  readonly finalTier: Tier;
  readonly reviewer: string;
  readonly aiUsed: boolean;
  /** The AI tier was applied but its text used authority language and was not published. */
  readonly aiTextWithheld: boolean;
  readonly comment: string;
  readonly notificationSummary: string;
  readonly shouldNotify: boolean;
}

export const largeChangeLines = 250;

const tierRank: Readonly<Record<Tier, number>> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
// Broad on purpose: a match only withholds the AI's text, never its tier, so a
// false positive (P3's "approved consulting requests") costs nothing.
const authorityLanguage =
  /\b(?:approved?|lgtm)\b|\b(?:safe|ready|ok|okay|good|fine|clear) to merge\b|\bmerge (?:it )?now\b|\bcan be merged\b|\b(?:needs|requires) no (?:human )?review\b|\bno (?:human )?review (?:is )?(?:required|needed|necessary)\b|\b(?:does not|doesn't|do not|don't) (?:need|require) (?:a |any |human )?review\b|\breview is (?:unnecessary|not (?:required|needed))\b/iu;
const maximumListedPaths = 3;

export function isTier(value: unknown): value is Tier {
  return value === 'LOW' || value === 'MEDIUM' || value === 'HIGH';
}

function isTextList(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === 'string' && item.trim().length > 0)
  );
}

/**
 * Glob match that also covers dotfiles: `matchesGlob` skips dot segments under
 * `**`, so a path is also tried with each segment's leading dot removed. This
 * only ever adds matches, so it can only raise a floor.
 */
export function pathMatches(path: string, glob: string): boolean {
  return matchesGlob(path, glob) || matchesGlob(path.replace(/(^|\/)\./gu, '$1'), glob);
}

export function reviewerFor(tier: Tier): string {
  return tier === 'HIGH'
    ? 'Tech Lead or relevant SME'
    : 'Developer familiar with the affected area';
}

/** Splits `git diff --name-only -z` output; NUL separation keeps unusual paths intact. */
export function parsePaths(nulSeparated: string): string[] {
  return nulSeparated.split('\0').filter((path) => path.length > 0);
}

/** Sums added and deleted lines from `git diff --numstat`; binary files (`-`) count 0. */
export function countChangedLines(numstat: string): number {
  return numstat.split('\n').reduce((total, line) => {
    const [added = '', deleted = ''] = line.split('\t');
    return total + (Number.parseInt(added, 10) || 0) + (Number.parseInt(deleted, 10) || 0);
  }, 0);
}

/** Codex's final message, or null when it is empty or not JSON. */
export function parseAiOutput(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function evaluateFloor(
  evidence: Pick<Evidence, 'changedPaths' | 'changedLines' | 'validationPassed'>,
  rules: readonly Rule[],
): Floor {
  const high: string[] = [];
  const medium: string[] = [];

  for (const rule of rules) {
    const matched = evidence.changedPaths.filter((path) =>
      rule.paths.some((glob) => pathMatches(path, glob)),
    );
    if (matched.length === 0) continue;

    const extra = matched.length - maximumListedPaths;
    const listed = matched.slice(0, maximumListedPaths).join(', ') + (extra > 0 ? `, +${extra} more` : '');
    (rule.tier === 'HIGH' ? high : medium).push(`${rule.why} [${rule.id}: ${listed}]`);
  }

  if (!evidence.validationPassed) medium.push('Required validation did not pass.');
  if (evidence.changedLines >= largeChangeLines) {
    medium.push(`${evidence.changedLines} changed lines (${largeChangeLines} or more).`);
  }

  // Only the reasons at the floor's tier are reported, so a path that matches
  // both a HIGH and a MEDIUM rule appears once.
  if (high.length > 0) return { tier: 'HIGH', reasons: high };
  if (medium.length > 0) return { tier: 'MEDIUM', reasons: medium };
  return { tier: 'LOW', reasons: [] };
}

/** The AI result, or null when it is unusable (missing, wrong shape, or invalid tier). */
export function parseAiClassification(value: unknown): AiClassification | null {
  if (typeof value !== 'object' || value === null) return null;

  const { tier, summary, reasons, reviewFocus } = value as Record<string, unknown>;
  if (
    !isTier(tier) ||
    typeof summary !== 'string' ||
    summary.trim().length === 0 ||
    !isTextList(reasons) ||
    !isTextList(reviewFocus)
  ) {
    return null;
  }
  return { tier, summary, reasons, reviewFocus };
}

/** True when the AI's prose approves, waves through, or dismisses review. */
export function containsAuthorityLanguage(ai: AiClassification): boolean {
  return authorityLanguage.test([ai.summary, ...ai.reasons, ...ai.reviewFocus].join('\n'));
}

function clean(text: string): string {
  return text.replaceAll('@', '@​').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** Comment text: also escapes brackets so paths and AI text cannot render links or images. */
function cleanMarkdown(text: string): string {
  return clean(text).replace(/[[\]]/gu, '\\$&');
}

function bulletList(items: readonly string[]): string {
  return items.map((item) => `- ${cleanMarkdown(item)}`).join('\n');
}

function renderComment(
  finalTier: Tier,
  floor: Floor,
  ai: AiClassification | null,
  textWithheld: boolean,
): string {
  const floorReasons =
    floor.reasons.length > 0 ? bulletList(floor.reasons) : '- No deterministic signals.';
  const analysis =
    ai === null
      ? '> AI unavailable; using deterministic floor.'
      : textWithheld
        ? '> AI text withheld (authority language).'
        : [
          cleanMarkdown(ai.summary),
          '',
          '### Reasons',
          '',
          bulletList(ai.reasons),
          '',
          '### Review focus',
          '',
          bulletList(ai.reviewFocus),
        ].join('\n');

  return [
    `<!-- par:v1 tier=${finalTier} -->`,
    `## PR Attention Review: ${finalTier}`,
    '',
    '> Classification only. Human review and every merge decision stay with people.',
    '',
    `**Reviewer:** ${reviewerFor(finalTier)}`,
    '',
    `**Deterministic floor:** ${floor.tier}`,
    '',
    floorReasons,
    '',
    analysis,
    '',
  ].join('\n');
}

function renderNotificationSummary(finalTier: Tier, floor: Floor, pullRequest: PullRequest): string {
  return [
    `[${finalTier}] PR #${pullRequest.number}: ${clean(pullRequest.title)}`,
    `Reviewer: ${reviewerFor(finalTier)} · Floor: ${floor.tier}`,
    pullRequest.url,
  ].join('\n');
}

export function route(input: RouteInput): RouteResult {
  const floor = evaluateFloor(input, input.rules);
  const ai = parseAiClassification(input.aiClassification);
  // Authority language withholds the AI's text, never its tier: the tier can only raise the floor.
  const textWithheld = ai !== null && containsAuthorityLanguage(ai);
  const finalTier =
    ai !== null && tierRank[ai.tier] > tierRank[floor.tier] ? ai.tier : floor.tier;

  return {
    deterministicFloor: floor.tier,
    floorReasons: floor.reasons,
    finalTier,
    reviewer: reviewerFor(finalTier),
    aiUsed: ai !== null,
    aiTextWithheld: textWithheld,
    comment: renderComment(finalTier, floor, ai, textWithheld),
    notificationSummary: renderNotificationSummary(finalTier, floor, input.pullRequest),
    shouldNotify: input.previousTier !== finalTier,
  };
}

export interface PromptInput {
  readonly genericPrompt: string;
  readonly rubric: string;
  readonly evidence: Evidence;
  readonly floor: Floor;
  readonly title: string;
  readonly body: string;
}

/** Generic process, then the PR (as untrusted evidence), the host rubric, and the floor. */
export function buildPrompt(input: PromptInput): string {
  const floorReasons =
    input.floor.reasons.length > 0
      ? input.floor.reasons.map((reason) => `- ${reason}`).join('\n')
      : '- No deterministic signals.';

  return [
    input.genericPrompt.trim(),
    '',
    '# Pull request diff',
    '',
    `Classify the changes shown by \`git diff ${input.evidence.base}...${input.evidence.head}\` in this checkout.`,
    '',
    '# Pull request description (untrusted evidence)',
    '',
    `Title: ${input.title}`,
    '',
    input.body.trim().length > 0 ? input.body.trim() : '(No description.)',
    '',
    '# Repository rubric',
    '',
    input.rubric.trim(),
    '',
    '# Deterministic floor',
    '',
    `Floor: ${input.floor.tier}`,
    floorReasons,
    '',
  ].join('\n');
}

/**
 * Validates a host adapter. With tracked files, every individual glob must
 * match at least one tracked path, so one valid glob cannot hide a stale one.
 */
export function validateConfig(
  rulesText: string,
  rubricText: string,
  trackedFiles: readonly string[] | null,
): string[] {
  const failures: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(rulesText) as unknown;
  } catch {
    failures.push('rules.json is not valid JSON.');
  }

  const rules =
    typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>).rules : undefined;
  if (parsed !== undefined && !Array.isArray(rules)) failures.push('rules.json must have a "rules" array.');

  const seen = new Set<string>();
  for (const [index, rule] of (Array.isArray(rules) ? rules : []).entries()) {
    const { id, tier, paths, why } = (typeof rule === 'object' && rule !== null ? rule : {}) as Record<string, unknown>;
    const hasId = typeof id === 'string' && id.trim().length > 0;
    const name = hasId ? id : `rule ${index + 1}`;

    if (!hasId) failures.push(`${name}: missing id.`);
    else if (seen.has(name)) failures.push(`${name}: duplicate id.`);
    else seen.add(name);

    if (tier !== 'HIGH' && tier !== 'MEDIUM') failures.push(`${name}: tier must be HIGH or MEDIUM.`);
    if (typeof why !== 'string' || why.trim().length === 0) failures.push(`${name}: missing why.`);
    if (!isTextList(paths)) {
      failures.push(`${name}: paths must be a non-empty list of globs.`);
      continue;
    }

    if (trackedFiles === null) continue;
    for (const glob of paths) {
      // Strict on purpose: the check validates author intent, so a rule for a
      // dotfile must state the dot. Runtime matching stays dot-aware.
      if (!trackedFiles.some((file) => matchesGlob(file, glob))) {
        failures.push(`${name}: no tracked file matches ${glob}`);
      }
    }
  }

  for (const heading of ['LOW', 'MEDIUM', 'HIGH']) {
    if (!new RegExp(`^## ${heading}\\s*$`, 'mu').test(rubricText)) {
      failures.push(`rubric.md: missing "## ${heading}" heading.`);
    }
  }

  return failures;
}

function readText(path: string): string {
  return readFileSync(path, 'utf8');
}

/** Reads and validates `rules.json` and `rubric.md` from a host adapter directory. */
export function loadAdapter(adapterDir: string): { readonly rules: readonly Rule[]; readonly rubric: string } {
  const rulesText = readText(join(adapterDir, 'rules.json'));
  const rubric = readText(join(adapterDir, 'rubric.md'));
  const failures = validateConfig(rulesText, rubric, null);

  if (failures.length > 0) {
    throw new Error(`Invalid attention-router config in ${adapterDir}:\n${failures.join('\n')}`);
  }

  return { rules: (JSON.parse(rulesText) as { rules: Rule[] }).rules, rubric };
}

function argument(values: readonly string[], index: number, name: string): string {
  const value = values[index];
  if (value === undefined || value.length === 0) throw new Error(`Missing <${name}>.\n${usage}`);
  return value;
}

const usage = `Usage:
  route.ts evidence <paths-z-file> <numstat-file> <verify-conclusion> <base-sha> <head-sha>
  route.ts prompt <adapter-dir> <evidence.json> <pull-request.json>
  route.ts route <adapter-dir> <evidence.json> <ai-output-file> <pull-request.json> [previous-tier]
  route.ts check <adapter-dir> <repo-root>`;

function readJson<T>(path: string): T {
  return JSON.parse(readText(path)) as T;
}

function main(args: readonly string[]): void {
  const [command, ...rest] = args;

  if (command === 'evidence') {
    const evidence: Evidence = {
      base: argument(rest, 3, 'base-sha'),
      head: argument(rest, 4, 'head-sha'),
      changedPaths: parsePaths(readText(argument(rest, 0, 'paths-z-file'))),
      changedLines: countChangedLines(readText(argument(rest, 1, 'numstat-file'))),
      validationPassed: argument(rest, 2, 'verify-conclusion') === 'success',
    };
    // One line, so the workflow can pass it as a step output.
    process.stdout.write(`${JSON.stringify(evidence)}\n`);
    return;
  }

  if (command === 'prompt') {
    const { rules, rubric } = loadAdapter(argument(rest, 0, 'adapter-dir'));
    const evidence = readJson<Evidence>(argument(rest, 1, 'evidence.json'));
    const pullRequest = readJson<{ title: string; body?: string }>(argument(rest, 2, 'pull-request.json'));
    process.stdout.write(
      buildPrompt({
        genericPrompt: readText(fileURLToPath(new URL('./classification-prompt.md', import.meta.url))),
        rubric,
        evidence,
        floor: evaluateFloor(evidence, rules),
        title: pullRequest.title,
        body: pullRequest.body ?? '',
      }),
    );
    return;
  }

  if (command === 'route') {
    const { rules } = loadAdapter(argument(rest, 0, 'adapter-dir'));
    const evidence = readJson<Evidence>(argument(rest, 1, 'evidence.json'));
    const previousTier = rest[4];
    const result = route({
      changedPaths: evidence.changedPaths,
      changedLines: evidence.changedLines,
      validationPassed: evidence.validationPassed,
      rules,
      aiClassification: parseAiOutput(readText(argument(rest, 2, 'ai-output-file'))),
      previousTier: isTier(previousTier) ? previousTier : null,
      pullRequest: readJson<PullRequest>(argument(rest, 3, 'pull-request.json')),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === 'check') {
    const adapterDir = argument(rest, 0, 'adapter-dir');
    const trackedFiles = parsePaths(
      execFileSync('git', ['ls-files', '-z'], { cwd: argument(rest, 1, 'repo-root'), encoding: 'utf8' }),
    );
    const failures = validateConfig(
      readText(join(adapterDir, 'rules.json')),
      readText(join(adapterDir, 'rubric.md')),
      trackedFiles,
    );

    for (const failure of failures) process.stderr.write(`FAIL ${failure}\n`);
    process.stdout.write(
      failures.length === 0 ? `${adapterDir} is valid.\n` : `${failures.length} config problem(s).\n`,
    );
    if (failures.length > 0) process.exitCode = 1;
    return;
  }

  throw new Error(usage);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
