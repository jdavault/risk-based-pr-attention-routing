import type { ReactElement } from 'react';

import type { SamplePullRequest } from '../domain/attention';
import styles from './ReviewQueue.module.css';

interface ReviewQueueProps {
  readonly pullRequests: readonly SamplePullRequest[];
  readonly selectedPullRequestId: string;
  readonly onSelect: (pullRequestId: string) => void;
}

export function ReviewQueue({
  pullRequests,
  selectedPullRequestId,
  onSelect,
}: ReviewQueueProps): ReactElement {
  return (
    <section className={styles.panel} aria-labelledby="review-queue-heading">
      <div className={styles.panelHeading}>
        <div>
          <p className={styles.eyebrow}>Synthetic pull requests</p>
          <h2 id="review-queue-heading">Review queue</h2>
        </div>
        <span>{pullRequests.length} shown</span>
      </div>

      <ul className={styles.list}>
        {pullRequests.map((pullRequest) => (
          <li key={pullRequest.id}>
            <button
              aria-pressed={selectedPullRequestId === pullRequest.id}
              className={styles.queueItem}
              type="button"
              onClick={() => onSelect(pullRequest.id)}
            >
              <span className={styles.itemTopLine}>
                <span
                  className={`${styles.tier} ${styles[pullRequest.tier.toLowerCase()]}`}
                >
                  {pullRequest.tier}
                </span>
                <span>#{pullRequest.number}</span>
              </span>

              <strong>{pullRequest.title}</strong>
              <span className={styles.repository}>{pullRequest.repository}</span>

              <span className={styles.chips} aria-label="Evidence">
                {pullRequest.evidence.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </span>

              <span className={styles.reviewer}>
                Reviewer: {pullRequest.reviewerLabel}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
