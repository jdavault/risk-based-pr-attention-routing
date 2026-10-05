import type { ReactElement } from 'react';
import { renderClassificationComment } from '@scope/pr-attention-router';

import type { RiskDimension, SamplePullRequest } from '../domain/attention';
import { toSampleClassification } from '../domain/sampleClassification';
import styles from './EvidencePanel.module.css';

interface EvidencePanelProps {
  readonly pullRequest: SamplePullRequest;
}

interface DimensionProps {
  readonly label: string;
  readonly dimension: RiskDimension;
}

function Dimension({ label, dimension }: DimensionProps): ReactElement {
  return (
    <div className={styles.dimension}>
      <dt>{label}</dt>
      <dd>
        <strong>{dimension.level}</strong>
        <span>{dimension.detail}</span>
      </dd>
    </div>
  );
}

export function EvidencePanel({
  pullRequest,
}: EvidencePanelProps): ReactElement {
  const comment = renderClassificationComment(
    toSampleClassification(pullRequest),
  );

  return (
    <aside className={styles.panel} aria-labelledby="evidence-heading">
      <p className={styles.eyebrow}>Why this tier?</p>
      <h2 id="evidence-heading">Evidence for {pullRequest.title}</h2>
      <p className={styles.summary}>{pullRequest.summary}</p>

      <dl className={styles.dimensions}>
        <Dimension label="Probability" dimension={pullRequest.probability} />
        <Dimension label="Impact" dimension={pullRequest.impact} />
        <Dimension
          label="Detectability"
          dimension={pullRequest.detectability}
        />
        <Dimension label="Blast radius" dimension={pullRequest.blastRadius} />
      </dl>

      <section className={styles.reviewFocus}>
        <h3>Review focus</h3>
        <p>{pullRequest.reviewFocus}</p>
      </section>

      <section className={styles.missingEvidence}>
        <h3>Missing evidence</h3>
        {pullRequest.missingEvidence.length === 0 ? (
          <p>None identified for this synthetic example.</p>
        ) : (
          <ul>
            {pullRequest.missingEvidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>

      <details className={styles.commentPreview}>
        <summary>Persistent PR comment preview</summary>
        <pre>{comment}</pre>
      </details>
    </aside>
  );
}
