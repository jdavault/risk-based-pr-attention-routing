#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { createPublication, publicationMarker } from './publication.ts';
import { parseAiOutput } from './route.ts';

// Called only by the trusted publish job. No PR code or model secret is loaded.
const result = JSON.parse(process.env.RESULT_JSON ?? 'null');
const evidence = JSON.parse(process.env.EVIDENCE_JSON ?? 'null');
const aiClassification: unknown = parseAiOutput(process.env.AI_OUTPUT ?? '');
const record = createPublication({ repository: process.env.GITHUB_REPOSITORY ?? '',
  pullRequest: Number(process.env.PAR_PR_NUMBER), headSha: evidence.head, baseSha: evidence.base,
  policySha: process.env.GITHUB_SHA ?? '', runId: Number(process.env.GITHUB_RUN_ID),
  runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT), createdAt: new Date().toISOString(),
  changedLines: evidence.changedLines, validationPassed: evidence.validationPassed, result, aiClassification });
writeFileSync('.par/classification.json', JSON.stringify(record));
// The original bounded/sanitized human-facing comment remains the readable surface.
writeFileSync('.par/comment.md', `${result.comment}\n${publicationMarker(record)}\n`);
// Explicitly validate roundtrip before any external publication.
JSON.parse(readFileSync('.par/classification.json', 'utf8'));
