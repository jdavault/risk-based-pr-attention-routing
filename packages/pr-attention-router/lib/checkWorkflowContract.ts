import { parse } from 'yaml';

export interface ContractViolation {
  readonly job: string | undefined;
  readonly rule: string;
}

type Mapping = Record<string, unknown>;

const prHeadReference = 'pull_requests[0].head.sha';
const trustedReference = '${{ github.sha }}';
const allowedWrites = new Set(['issues', 'pull-requests']);
const installCommand =
  /(?:^|[\s;&|])(npm\s+(?:ci|install)|pnpm\s+install|yarn\s+install)(?:\s|$)/iu;

function isMapping(value: unknown): value is Mapping {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stepsOf(job: Mapping): readonly Mapping[] {
  return Array.isArray(job.steps) ? job.steps.filter(isMapping) : [];
}

function usesAction(step: Mapping, action: string): boolean {
  return typeof step.uses === 'string' && step.uses.startsWith(`${action}@`);
}

function withOf(step: Mapping): Mapping {
  return isMapping(step.with) ? step.with : {};
}

function isPrHeadCheckout(step: Mapping): boolean {
  const ref = withOf(step).ref;
  return (
    usesAction(step, 'actions/checkout') &&
    typeof ref === 'string' &&
    ref.includes(prHeadReference)
  );
}

function mentionsSecret(value: unknown): boolean {
  return JSON.stringify(value ?? null).includes('secrets.');
}

function insidePrCheckout(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    (value === '.par/target' || value.startsWith('.par/target/'))
  );
}

function checkTriggers(workflow: Mapping): readonly ContractViolation[] {
  const triggers = isMapping(workflow.on) ? Object.keys(workflow.on) : [];
  return triggers.length === 1 && triggers[0] === 'workflow_run'
    ? []
    : [{ job: undefined, rule: 'The only trigger must be workflow_run.' }];
}

function checkWorkflowPermissions(
  workflow: Mapping,
): readonly ContractViolation[] {
  const permissions = workflow.permissions;
  return isMapping(permissions) &&
    Object.keys(permissions).length === 1 &&
    permissions.contents === 'read'
    ? []
    : [
        {
          job: undefined,
          rule: 'Workflow default permissions must be exactly contents: read.',
        },
      ];
}

function checkJob(name: string, job: Mapping): readonly ContractViolation[] {
  const violations: ContractViolation[] = [];
  const violation = (rule: string) => violations.push({ job: name, rule });
  const steps = stepsOf(job);
  const checksOutPrHead = steps.some(isPrHeadCheckout);

  if (!isMapping(job.permissions)) {
    violation('Job permissions must be explicit.');
  } else {
    for (const [scope, level] of Object.entries(job.permissions)) {
      if (level === 'write' && !allowedWrites.has(scope)) {
        violation(`Job may not hold ${scope}: write.`);
      }
      if (level === 'write' && checksOutPrHead) {
        violation(
          'A job that checks out the pull request may not hold write permissions.',
        );
      }
    }
  }

  if (
    checksOutPrHead &&
    (mentionsSecret(job.env) ||
      mentionsSecret(job.services) ||
      mentionsSecret(job.container))
  ) {
    violation('Secrets may not reach a job beside the pull request checkout.');
  }

  for (const step of steps) {
    if (usesAction(step, 'actions/checkout')) {
      const options = withOf(step);

      if (options['persist-credentials'] !== false) {
        violation('Every checkout must set persist-credentials: false.');
      }

      if (isPrHeadCheckout(step)) {
        if (
          typeof options.path !== 'string' ||
          !options.path.startsWith('.par/')
        ) {
          violation('The pull request must be checked out under .par/.');
        }
      } else if (options.ref !== trustedReference) {
        violation('Trusted router checkouts must pin ref to github.sha.');
      }
    }

    const isCodex = usesAction(step, 'openai/codex-action');
    if (isCodex) {
      const options = withOf(step);
      if (options['safety-strategy'] !== 'read-only') {
        violation('Codex must run with safety-strategy: read-only.');
      }
      if (!insidePrCheckout(options['working-directory'])) {
        violation('Codex must run inside .par/target.');
      }
    }

    if (typeof step.run === 'string') {
      if (step.run.includes('${{')) {
        violation(
          'Run scripts must read values from env, never interpolate ${{ }} expressions.',
        );
      }
      if (
        typeof step['working-directory'] === 'string' &&
        step['working-directory'].startsWith('.par/')
      ) {
        violation('Run steps may not execute inside the pull request checkout.');
      }
      if (name !== 'email' && installCommand.test(step.run)) {
        violation('Only the email job may install packages.');
      }
    }

    if (checksOutPrHead && mentionsSecret(step) && !isCodex) {
      violation(
        'Only the read-only Codex step may hold a secret beside the pull request checkout.',
      );
    }
  }

  return violations;
}

export function checkWorkflowContract(
  source: string,
): readonly ContractViolation[] {
  const workflow: unknown = parse(source);

  if (!isMapping(workflow) || !isMapping(workflow.jobs)) {
    return [{ job: undefined, rule: 'Workflow must define jobs.' }];
  }

  const jobs = Object.entries(workflow.jobs).filter(
    (entry): entry is [string, Mapping] => isMapping(entry[1]),
  );
  const writers = jobs.filter(
    ([, job]) =>
      isMapping(job.permissions) &&
      Object.values(job.permissions).includes('write'),
  );

  return [
    ...checkTriggers(workflow),
    ...checkWorkflowPermissions(workflow),
    ...jobs.flatMap(([name, job]) => checkJob(name, job)),
    ...(writers.length > 1
      ? [{ job: undefined, rule: 'Only one job may hold write permissions.' }]
      : []),
  ];
}
