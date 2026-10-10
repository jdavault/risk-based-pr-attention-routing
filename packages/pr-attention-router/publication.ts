import { containsAuthorityLanguage, isTier, parseAiClassification, reviewerFor, type RouteResult, type Tier } from './route.ts';

export interface Dimension { readonly level: 'Low' | 'Moderate' | 'High'; readonly detail: string }
export interface Analysis {
  readonly summary: string; readonly reasons: readonly string[]; readonly reviewFocus: readonly string[];
  readonly dimensions: Readonly<Record<'probability' | 'impact' | 'detectability' | 'blastRadius', Dimension>> | null;
  readonly missingEvidence: readonly string[] | null;
}
export interface Publication {
  readonly version: 1; readonly repository: string; readonly pullRequest: number;
  readonly headSha: string; readonly baseSha: string; readonly policySha: string;
  readonly runId: number; readonly runAttempt: number; readonly createdAt: string;
  readonly changedLines: number; readonly validationPassed: boolean;
  readonly deterministicFloor: Tier; readonly floorReasons: readonly string[];
  readonly finalTier: Tier; readonly reviewer: string; readonly aiUsed: boolean;
  readonly aiTextWithheld: boolean; readonly analysis: Analysis | null;
}
export const publicationLimit = 48_000;
const rank = { LOW: 0, MEDIUM: 1, HIGH: 2 };
const sha = /^[a-f0-9]{40}$/u;
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 1000;
const texts = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 24 && v.every(text);
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const positive = (v: unknown) => Number.isSafeInteger(v) && Number(v) > 0;
const publicationKeys = ['version', 'repository', 'pullRequest', 'headSha', 'baseSha', 'policySha',
  'runId', 'runAttempt', 'createdAt', 'changedLines', 'validationPassed', 'deterministicFloor',
  'floorReasons', 'finalTier', 'reviewer', 'aiUsed', 'aiTextWithheld', 'analysis'] as const;
const analysisKeys = ['summary', 'reasons', 'reviewFocus', 'dimensions', 'missingEvidence'] as const;
const dimensionNames = ['probability', 'impact', 'detectability', 'blastRadius'] as const;
const dimensionKeys = ['level', 'detail'] as const;
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

function validDimensions(value: unknown): value is NonNullable<Analysis['dimensions']> {
  return object(value) && exactKeys(value, dimensionNames) && dimensionNames.every((key) => {
    const d = value[key];
    return object(d) && exactKeys(d, dimensionKeys) &&
      ['Low', 'Moderate', 'High'].includes(String(d.level)) && text(d.detail);
  });
}
function validAnalysis(value: unknown): value is Analysis {
  return object(value) && exactKeys(value, analysisKeys) &&
    text(value.summary) && texts(value.reasons) && value.reasons.length > 0 &&
    texts(value.reviewFocus) && value.reviewFocus.length > 0 &&
    (value.dimensions === null || validDimensions(value.dimensions)) &&
    (value.missingEvidence === null || texts(value.missingEvidence));
}
function authorityInAnalysis(analysis: Analysis): boolean {
  return containsAuthorityLanguage({ tier: 'LOW', summary: analysis.summary,
    reasons: [...analysis.reasons, ...(analysis.missingEvidence ?? []),
      ...Object.values(analysis.dimensions ?? {}).map((d) => d.detail)], reviewFocus: analysis.reviewFocus });
}
export function parsePublication(value: unknown): Publication | null {
  if (!object(value) || !exactKeys(value, publicationKeys) ||
    JSON.stringify(value).length > publicationLimit || value.version !== 1 ||
    typeof value.repository !== 'string' || !repositoryPattern.test(value.repository) ||
    value.repository.split('/').some((p) => p === '.' || p === '..') ||
    !positive(value.pullRequest) || !positive(value.runId) || !positive(value.runAttempt) ||
    ![value.headSha, value.baseSha, value.policySha].every((v) => typeof v === 'string' && sha.test(v)) ||
    typeof value.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/u.test(value.createdAt) || !Number.isFinite(Date.parse(value.createdAt)) ||
    !Number.isSafeInteger(value.changedLines) || Number(value.changedLines) < 0 ||
    typeof value.validationPassed !== 'boolean' || !isTier(value.deterministicFloor) || !isTier(value.finalTier) ||
    rank[value.finalTier] < rank[value.deterministicFloor] || !texts(value.floorReasons) ||
    value.reviewer !== reviewerFor(value.finalTier) || typeof value.aiUsed !== 'boolean' ||
    typeof value.aiTextWithheld !== 'boolean' ||
    (value.analysis !== null && (!validAnalysis(value.analysis) || authorityInAnalysis(value.analysis))) ||
    ((value.aiTextWithheld || !value.aiUsed) && value.analysis !== null)) return null;
  return value as unknown as Publication;
}
export function createPublication(input: Omit<Publication, 'version' | 'deterministicFloor' | 'floorReasons' | 'finalTier' | 'reviewer' | 'aiUsed' | 'aiTextWithheld' | 'analysis'> & {
  result: RouteResult; aiClassification: unknown;
}): Publication {
  const ai = parseAiClassification(input.aiClassification);
  const raw = object(input.aiClassification) ? input.aiClassification : {};
  let analysis: Analysis | null = ai ? { summary: ai.summary, reasons: ai.reasons, reviewFocus: ai.reviewFocus,
    dimensions: validDimensions(raw.dimensions) ? raw.dimensions : null,
    missingEvidence: texts(raw.missingEvidence) ? raw.missingEvidence : null } : null;
  const withheld = input.result.aiTextWithheld || (analysis !== null && authorityInAnalysis(analysis));
  if (withheld || !input.result.aiUsed) analysis = null;
  const { result, aiClassification: _ai, ...metadata } = input;
  const record = parsePublication({ ...metadata, version: 1, deterministicFloor: result.deterministicFloor,
    floorReasons: result.floorReasons, finalTier: result.finalTier, reviewer: result.reviewer,
    aiUsed: result.aiUsed, aiTextWithheld: withheld, analysis });
  if (!record) throw new Error('Invalid publication record.');
  return record;
}
export function publicationMarker(record: Publication): string {
  if (!parsePublication(record)) throw new Error('Invalid publication record.');
  return `<!-- par:result:v1 ${Buffer.from(JSON.stringify(record)).toString('base64url')} -->`;
}
export function readPublication(body: string): Publication | null {
  if (body.length > 100_000) return null;
  const markers = [...body.matchAll(/<!-- par:result:v1 ([A-Za-z0-9_-]+) -->/gu)];
  if (markers.length !== 1) return null;
  try { return parsePublication(JSON.parse(Buffer.from(markers[0]![1]!, 'base64url').toString('utf8'))); }
  catch { return null; }
}
