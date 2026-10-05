import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parse, stringify } from 'yaml';

import { checkWorkflowContract } from '../lib/checkWorkflowContract.ts';

const compliant = `
name: PR Attention Review
on:
  workflow_run:
    workflows: [Validate repository]
    types: [completed]
permissions:
  contents: read
jobs:
  evidence:
    runs-on: ubuntu-24.04
    permissions:
      contents: read
      pull-requests: read
    steps:
      - uses: actions/checkout@v7
        with:
          ref: \${{ github.sha }}
          persist-credentials: false
      - uses: actions/checkout@v7
        with:
          ref: \${{ github.event.workflow_run.pull_requests[0].head.sha }}
          persist-credentials: false
          path: .par/target
      - env:
          PR_TITLE: \${{ steps.context.outputs.title }}
        run: node collect.ts --title "$PR_TITLE"
  classify:
    runs-on: ubuntu-24.04
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v7
        with:
          ref: \${{ github.sha }}
          persist-credentials: false
      - uses: actions/checkout@v7
        with:
          ref: \${{ github.event.workflow_run.pull_requests[0].head.sha }}
          persist-credentials: false
          path: .par/target
      - uses: openai/codex-action@v1.8
        with:
          openai-api-key: \${{ secrets.OPENAI_API_KEY }}
          safety-strategy: read-only
          working-directory: .par/target
  email:
    runs-on: ubuntu-24.04
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v7
        with:
          ref: \${{ github.sha }}
          persist-credentials: false
      - run: npm ci --omit=dev --ignore-scripts --workspace @scope/pr-attention-router
  publish:
    runs-on: ubuntu-24.04
    permissions:
      contents: read
      issues: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v7
        with:
          ref: \${{ github.sha }}
          persist-credentials: false
`;

type WorkflowJob = {
  permissions?: Record<string, string>;
  env?: Record<string, unknown>;
  container?: unknown;
  services?: unknown;
  steps: Array<Record<string, unknown>>;
};

type Workflow = {
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  jobs: Record<string, WorkflowJob>;
};

function mutate(change: (workflow: Workflow) => void): string {
  const workflow = parse(compliant) as Workflow;
  change(workflow);
  return stringify(workflow);
}

function rules(source: string): readonly string[] {
  return checkWorkflowContract(source).map(({ rule }) => rule);
}

function expectRule(source: string, rule: string): void {
  assert.ok(rules(source).includes(rule), `Expected violation: ${rule}`);
}

function step(workflow: Workflow, jobName: string, index: number) {
  const found = workflow.jobs[jobName]?.steps[index];
  if (found === undefined) {
    throw new Error(`Missing ${jobName} step ${index}.`);
  }
  return found;
}

function withOptions(stepValue: Record<string, unknown>): Record<string, unknown> {
  const value = stepValue.with;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Step has no with mapping.');
  }
  return value as Record<string, unknown>;
}

describe('checkWorkflowContract', () => {
  it('accepts the compliant workflow', () => {
    assert.deepEqual(checkWorkflowContract(compliant), []);
  });

  it('rejects extra triggers', () => {
    expectRule(
      mutate((workflow) => {
        workflow.on.pull_request_target = {};
      }),
      'The only trigger must be workflow_run.',
    );
  });

  it('rejects broad workflow permissions', () => {
    expectRule(
      mutate((workflow) => {
        workflow.permissions = { contents: 'write' };
      }),
      'Workflow default permissions must be exactly contents: read.',
    );
  });

  it('rejects missing job permissions', () => {
    expectRule(
      mutate((workflow) => {
        delete workflow.jobs.email?.permissions;
      }),
      'Job permissions must be explicit.',
    );
  });

  it('rejects contents write', () => {
    expectRule(
      mutate((workflow) => {
        workflow.jobs.publish!.permissions!.contents = 'write';
      }),
      'Job may not hold contents: write.',
    );
  });

  it('rejects a second writer', () => {
    expectRule(
      mutate((workflow) => {
        workflow.jobs.email!.permissions!.issues = 'write';
      }),
      'Only one job may hold write permissions.',
    );
  });

  it('rejects write permissions beside pull request source', () => {
    expectRule(
      mutate((workflow) => {
        workflow.jobs.classify!.permissions!.issues = 'write';
      }),
      'A job that checks out the pull request may not hold write permissions.',
    );
  });

  it('rejects persisted checkout credentials', () => {
    expectRule(
      mutate((workflow) => {
        withOptions(step(workflow, 'publish', 0))['persist-credentials'] = true;
      }),
      'Every checkout must set persist-credentials: false.',
    );
  });

  it('rejects a trusted checkout not pinned to github.sha', () => {
    expectRule(
      mutate((workflow) => {
        withOptions(step(workflow, 'publish', 0)).ref = 'main';
      }),
      'Trusted router checkouts must pin ref to github.sha.',
    );
  });

  it('rejects a pull request checkout outside .par', () => {
    expectRule(
      mutate((workflow) => {
        delete withOptions(step(workflow, 'evidence', 1)).path;
      }),
      'The pull request must be checked out under .par/.',
    );
  });

  it('rejects Codex without read-only safety', () => {
    expectRule(
      mutate((workflow) => {
        withOptions(step(workflow, 'classify', 2))['safety-strategy'] = 'unsafe';
      }),
      'Codex must run with safety-strategy: read-only.',
    );
  });

  it('rejects Codex outside .par/target', () => {
    expectRule(
      mutate((workflow) => {
        withOptions(step(workflow, 'classify', 2))['working-directory'] = '.';
      }),
      'Codex must run inside .par/target.',
    );
  });

  it('rejects expressions interpolated into run scripts', () => {
    expectRule(
      mutate((workflow) => {
        step(workflow, 'evidence', 2).run = 'node collect.ts \${{ secrets.BAD }}';
      }),
      'Run scripts must read values from env, never interpolate ${{ }} expressions.',
    );
  });

  it('rejects shell execution inside the pull request checkout', () => {
    expectRule(
      mutate((workflow) => {
        step(workflow, 'evidence', 2)['working-directory'] = '.par/target';
      }),
      'Run steps may not execute inside the pull request checkout.',
    );
  });

  it('rejects job-level secrets beside pull request source', () => {
    expectRule(
      mutate((workflow) => {
        workflow.jobs.evidence!.env = { TOKEN: '\${{ secrets.BAD }}' };
      }),
      'Secrets may not reach a job beside the pull request checkout.',
    );
  });

  it('rejects step-level secrets outside the Codex step', () => {
    expectRule(
      mutate((workflow) => {
        step(workflow, 'evidence', 2).env = { TOKEN: '\${{ secrets.BAD }}' };
      }),
      'Only the read-only Codex step may hold a secret beside the pull request checkout.',
    );
  });

  for (const command of [
    'npm ci',
    'npm install',
    'pnpm install',
    'yarn install',
  ]) {
    it(`rejects ${command} outside the email job`, () => {
      expectRule(
        mutate((workflow) => {
          step(workflow, 'evidence', 2).run = command;
        }),
        'Only the email job may install packages.',
      );
    });
  }
});
