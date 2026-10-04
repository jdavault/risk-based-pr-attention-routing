const fs = require('node:fs');

const tierMarker = /<!-- par-risk-tier:(LOW|MEDIUM|HIGH):(\S+) -->/u;
const expectedAutomationAuthors = new Set([
  'github-actions',
  'github-actions[bot]',
]);

function requirePullRequestNumber() {
  const pullRequestNumber = Number(process.env.PAR_PR_NUMBER);

  if (!Number.isInteger(pullRequestNumber) || pullRequestNumber < 1) {
    throw new Error('PAR_PR_NUMBER must be a positive integer.');
  }

  return pullRequestNumber;
}

function readClassification() {
  const normalized = JSON.parse(
    fs.readFileSync('.par/final-classification.json', 'utf8'),
  );

  if (
    typeof normalized !== 'object' ||
    normalized === null ||
    typeof normalized.commentBody !== 'string' ||
    typeof normalized.classification !== 'object' ||
    normalized.classification === null ||
    !['LOW', 'MEDIUM', 'HIGH'].includes(normalized.classification.tier)
  ) {
    throw new Error('Normalized classification file is invalid.');
  }

  return normalized;
}

function isExpectedAutomationComment(comment) {
  return (
    typeof comment.body === 'string' &&
    tierMarker.test(comment.body) &&
    comment.user?.type === 'Bot' &&
    expectedAutomationAuthors.has(comment.user.login)
  );
}

function selectAttentionComment(comments) {
  const matches = comments.filter(isExpectedAutomationComment);

  if (matches.length > 1) {
    throw new Error('Multiple bot-authored PAR comments exist.');
  }

  return matches[0] ?? null;
}

async function publishAttentionComment({
  github,
  context,
  core,
  pullRequestNumber = requirePullRequestNumber(),
  normalized = readClassification(),
  dryRun = process.env.PAR_DRY_RUN === 'true',
}) {
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: pullRequestNumber,
    per_page: 100,
  });

  const existing = selectAttentionComment(comments);
  const previousTier =
    typeof existing?.body === 'string'
      ? (tierMarker.exec(existing.body)?.[1] ?? null)
      : null;
  const currentTier = normalized.classification.tier;
  const shouldNotify = previousTier !== currentTier;

  if (!dryRun && existing === null) {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: pullRequestNumber,
      body: normalized.commentBody,
    });
  } else if (!dryRun && existing !== null) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existing.id,
      body: normalized.commentBody,
    });
  }

  core.setOutput('should-notify', String(shouldNotify));
  core.setOutput('tier', currentTier);
  core.setOutput('classification-json', JSON.stringify(normalized));
}

module.exports = publishAttentionComment;
module.exports.selectAttentionComment = selectAttentionComment;
