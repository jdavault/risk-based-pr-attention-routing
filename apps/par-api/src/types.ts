import type { Publication } from '@p3sg/pr-attention-router/publication';
export interface PullView {
  number: number; title: string; repository: string; url: string; headSha: string; draft: boolean;
  checks: string;
  classification: { status: 'current' | 'stale' | 'unavailable'; result: Publication | null; commentUrl: string | null; reason: string | null };
}
export interface Queue { pulls: PullView[]; truncated: boolean; fetchedAt: string }
