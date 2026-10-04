import { useMemo, useState, type ReactElement } from 'react';

import styles from './App.module.css';
import { EvidencePanel } from './components/EvidencePanel';
import { ReviewQueue } from './components/ReviewQueue';
import { TierCard } from './components/TierCard';
import { samplePullRequests } from './data/samplePullRequests';
import {
  tierDefinitions,
  type RiskTier,
  type SamplePullRequest,
} from './domain/attention';

type TierFilter = 'ALL' | RiskTier;

function getInitialPullRequest(): SamplePullRequest {
  const initialPullRequest = samplePullRequests.at(0);

  if (initialPullRequest === undefined) {
    throw new Error('At least one sample pull request is required.');
  }

  return initialPullRequest;
}

const initialPullRequest = getInitialPullRequest();

function countPullRequests(tier: RiskTier): number {
  return samplePullRequests.filter((pullRequest) => pullRequest.tier === tier)
    .length;
}

export function App(): ReactElement {
  const [filter, setFilter] = useState<TierFilter>('ALL');
  const [selectedPullRequestId, setSelectedPullRequestId] = useState(
    initialPullRequest.id,
  );

  const filteredPullRequests = useMemo(
    () =>
      filter === 'ALL'
        ? samplePullRequests
        : samplePullRequests.filter(
            (pullRequest) => pullRequest.tier === filter,
          ),
    [filter],
  );

  const selectedPullRequest =
    filteredPullRequests.find(
      (pullRequest) => pullRequest.id === selectedPullRequestId,
    ) ?? filteredPullRequests[0];

  function selectTier(tier: RiskTier): void {
    const nextPullRequest = samplePullRequests.find(
      (pullRequest) => pullRequest.tier === tier,
    );

    setFilter(tier);
    if (nextPullRequest !== undefined) {
      setSelectedPullRequestId(nextPullRequest.id);
    }
  }

  function showAllPullRequests(): void {
    setFilter('ALL');
  }

  return (
    <div className={styles.appShell}>
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.productLabel}>Proof of concept • Classification only.</p>
          <h1>PR Attention Router</h1>
          <p className={styles.tagline}>Route attention first; automate later.</p>
          <p className={styles.intro}>
            Direct human review toward the changes with the greatest probability,
            impact, difficulty of detection, and blast radius.
          </p>
        </div>

        <div className={styles.boundary}>
          <span aria-hidden="true">●</span>
          <div>
            <strong>Human authority preserved</strong>
            <p>No approval, merge, deployment, or release authority.</p>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.tierSection} aria-labelledby="tiers-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p>Required human attention</p>
              <h2 id="tiers-heading">Route by evidence, not instinct</h2>
            </div>
            <button
              aria-pressed={filter === 'ALL'}
              className={styles.showAllButton}
              type="button"
              onClick={showAllPullRequests}
            >
              Show all pull requests
            </button>
          </div>
          <div className={styles.tierGrid}>
            {tierDefinitions.map((definition) => (
              <TierCard
                key={definition.tier}
                count={countPullRequests(definition.tier)}
                definition={definition}
                selected={filter === definition.tier}
                onSelect={selectTier}
              />
            ))}
          </div>
        </section>

        {selectedPullRequest !== undefined && (
          <div className={styles.workspace} aria-live="polite">
            <ReviewQueue
              pullRequests={filteredPullRequests}
              selectedPullRequestId={selectedPullRequest.id}
              onSelect={setSelectedPullRequestId}
            />
            <EvidencePanel pullRequest={selectedPullRequest} />
          </div>
        )}

        <section className={styles.policy} aria-labelledby="policy-heading">
          <div>
            <p className={styles.policyLabel}>Routing policy</p>
            <h2 id="policy-heading">A floor, never a shortcut</h2>
          </div>
          <div className={styles.policyRule}>
            <span>01</span>
            <p>
              Deterministic repository signals establish the minimum attention
              tier.
            </p>
          </div>
          <div className={styles.policyRule}>
            <span>02</span>
            <p>AI judgment may raise the tier when context warrants it.</p>
          </div>
          <div className={styles.policyRule}>
            <span>03</span>
            <p>AI can never lower the deterministic minimum.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
