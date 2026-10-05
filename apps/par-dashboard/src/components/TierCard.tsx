import type { ReactElement } from 'react';

import type { RiskTier, TierDefinition } from '../domain/attention';
import styles from './TierCard.module.css';

interface TierCardProps {
  readonly definition: TierDefinition;
  readonly count: number;
  readonly selected: boolean;
  readonly onSelect: (tier: RiskTier) => void;
}

// Acceptance probe: a component-local comment should retain the LOW floor.
export function TierCard({
  definition,
  count,
  selected,
  onSelect,
}: TierCardProps): ReactElement {
  const { guidance, label, reviewer, tier } = definition;

  return (
    <article className={`${styles.card} ${styles[tier.toLowerCase()]}`}>
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>{label}</p>
          <h2>{tier}</h2>
        </div>
        <span className={styles.count} aria-label={`${count} pull requests`}>
          {count}
        </span>
      </div>

      <p className={styles.reviewer}>{reviewer}</p>
      <p className={styles.guidance}>{guidance}</p>

      <button
        aria-label={`Show ${tier} attention pull requests`}
        aria-pressed={selected}
        className={styles.filterButton}
        type="button"
        onClick={() => onSelect(tier)}
      >
        Filter queue
      </button>
    </article>
  );
}
