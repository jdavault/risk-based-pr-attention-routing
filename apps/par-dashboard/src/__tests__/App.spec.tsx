import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

describe('App', () => {
  it('identifies the local proof of concept and preserves human authority', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'PR Attention Router' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Route attention first; automate later.'),
    ).toBeVisible();
    expect(
      screen.getByText('Proof of concept • Classification only.'),
    ).toBeVisible();
    expect(screen.getByText('Human authority preserved')).toBeVisible();
    expect(
      screen.getAllByText('Developer familiar with the affected area').length,
    ).toBeGreaterThan(0);
  });

  it('filters the review queue by attention tier', async () => {
    const user = userEvent.setup();
    render(<App />);

    const queue = screen.getByRole('region', { name: 'Review queue' });
    expect(within(queue).getByText('3 shown')).toBeVisible();
    expect(screen.getAllByText('Show tier queue')).toHaveLength(3);

    await user.click(
      screen.getByRole('button', {
        name: 'Show MEDIUM attention pull requests',
      }),
    );

    expect(within(queue).getByText('1 shown')).toBeVisible();
    expect(
      within(queue).getByRole('button', { name: /Share queue filtering state/u }),
    ).toBeVisible();
  });

  it('updates the evidence panel when a pull request is selected', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole('button', {
        name: /Protect reviewer authorization policy/u,
      }),
    );

    expect(
      screen.getByRole('heading', {
        name: 'Evidence for Protect reviewer authorization policy',
      }),
    ).toBeVisible();
    expect(screen.getByText('Tech Lead or relevant SME')).toBeVisible();
  });

  it('previews the detailed persistent comment for the selected tier', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole('button', {
        name: /Protect reviewer authorization policy/u,
      }),
    );
    await user.click(
      screen.getByText('Persistent PR comment preview'),
    );

    const preview = screen.getByText(/## PR Attention Review: HIGH/u);
    expect(preview).toHaveTextContent(
      '**Reviewer:** Tech Lead or relevant SME',
    );
    expect(preview).toHaveTextContent('**Deterministic floor:** HIGH');
    expect(preview).toHaveTextContent('### Reasons');
    expect(preview).not.toHaveTextContent('[object Object]');
  });
});
