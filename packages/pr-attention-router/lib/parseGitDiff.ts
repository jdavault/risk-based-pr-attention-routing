export type ChangeStatus =
  | 'ADDED'
  | 'COPIED'
  | 'DELETED'
  | 'MODIFIED'
  | 'RENAMED'
  | 'TYPE_CHANGED'
  | 'UNMERGED';

export interface ChangedFile {
  readonly status: ChangeStatus;
  readonly path: string;
  readonly previousPath?: string;
}

export interface DiffTotals {
  readonly additions: number;
  readonly deletions: number;
  readonly changedLines: number;
  readonly changedFiles: number;
  readonly binaryFiles: number;
}

const statusNames: Readonly<Record<string, ChangeStatus>> = {
  A: 'ADDED',
  C: 'COPIED',
  D: 'DELETED',
  M: 'MODIFIED',
  R: 'RENAMED',
  T: 'TYPE_CHANGED',
  U: 'UNMERGED',
};

export function parseNameStatus(input: string): readonly ChangedFile[] {
  return input
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line): readonly ChangedFile[] => {
      const fields = line.split('\t');
      const rawStatus = fields[0];
      const status =
        rawStatus === undefined ? undefined : statusNames[rawStatus[0] ?? ''];

      if (status === undefined) {
        return [];
      }

      if (status === 'RENAMED' || status === 'COPIED') {
        const previousPath = fields[1];
        const path = fields[2];

        return previousPath === undefined || path === undefined
          ? []
          : [{ status, path, previousPath }];
      }

      const path = fields[1];
      return path === undefined ? [] : [{ status, path }];
    });
}

export function parseNumstat(input: string): DiffTotals {
  return input.split(/\r?\n/u).reduce<DiffTotals>(
    (totals, line) => {
      const fields = line.trim().split('\t');
      const additionsField = fields[0];
      const deletionsField = fields[1];
      const path = fields[2];

      if (
        additionsField === undefined ||
        deletionsField === undefined ||
        path === undefined
      ) {
        return totals;
      }

      if (additionsField === '-' && deletionsField === '-') {
        return {
          ...totals,
          changedFiles: totals.changedFiles + 1,
          binaryFiles: totals.binaryFiles + 1,
        };
      }

      const additions = Number.parseInt(additionsField, 10);
      const deletions = Number.parseInt(deletionsField, 10);

      if (!Number.isSafeInteger(additions) || !Number.isSafeInteger(deletions)) {
        return totals;
      }

      return {
        additions: totals.additions + additions,
        deletions: totals.deletions + deletions,
        changedLines: totals.changedLines + additions + deletions,
        changedFiles: totals.changedFiles + 1,
        binaryFiles: totals.binaryFiles,
      };
    },
    {
      additions: 0,
      deletions: 0,
      changedLines: 0,
      changedFiles: 0,
      binaryFiles: 0,
    },
  );
}
