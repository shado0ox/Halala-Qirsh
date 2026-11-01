import { Expense } from '../types';

export interface CandidateMatch {
  amount: number;
  date: string; // YYYY-MM-DD
  at?: number; // timestamp ms (createdAt or candidateAt)
  source: 'apple_pay' | 'sms';
}

export interface MatchOptions {
  windowMs?: number; // default 3 hours (3 * 3600 * 1000)
  maxDayDiff?: number; // default 1 day (handles midnight transaction discrepancies)
  requireWindow?: boolean; // default true. If false, relies on amount and date matching
}

/**
 * Parses YYYY-MM-DD safely into midnight timestamp (UTC or local)
 */
function parseYmdToTimestamp(ymd: string): number {
  const parts = ymd.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d).getTime();
  }
  return new Date(ymd).getTime();
}

/**
 * Finds the closest matching cross-source expense (Apple Pay vs Bank SMS).
 * 1. Requires opposite source ('apple_pay' vs 'sms').
 * 2. Only un-matched expenses (!expense.crossMatched).
 * 3. Exact amount in halalas (Math.round(a * 100) === Math.round(b * 100)).
 * 4. Local date difference <= maxDayDiff (default 1 day).
 * 5. Time window difference <= windowMs (default 3 hours) if requireWindow !== false.
 * 6. Returns the closest candidate in time if multiple matches exist.
 */
export function findCrossSourceMatch(
  candidate: CandidateMatch,
  existing: Expense[],
  opts?: MatchOptions
): Expense | null {
  const targetSource = candidate.source === 'sms' ? 'apple_pay' : 'sms';
  const candidateHalalas = Math.round(candidate.amount * 100);
  const maxDayDiff = opts?.maxDayDiff ?? 1;
  const requireWindow = opts?.requireWindow ?? true;
  const windowMs = opts?.windowMs ?? 3 * 60 * 60 * 1000;
  const candidateTime = candidate.at;
  const candidateDateTs = parseYmdToTimestamp(candidate.date);

  const matchedCandidates: Array<{ expense: Expense; timeDiff: number }> = [];

  for (const exp of existing) {
    // 1. Must be opposite source
    if (exp.source !== targetSource) continue;

    // 2. Must not be already merged
    if (exp.crossMatched) continue;

    // 3. Exact halalas match
    if (Math.round(exp.amount * 100) !== candidateHalalas) continue;

    // 4. Date difference check
    const expDateTs = parseYmdToTimestamp(exp.date);
    const dayDiff = Math.abs(candidateDateTs - expDateTs) / (24 * 60 * 60 * 1000);
    if (isNaN(dayDiff) || dayDiff > maxDayDiff + 0.05) continue;

    // 5. Time window check
    const expCreatedAt = exp.createdAt;
    let timeDiff = 0;
    if (candidateTime !== undefined && expCreatedAt !== undefined) {
      timeDiff = Math.abs(candidateTime - expCreatedAt);
      if (requireWindow && timeDiff > windowMs) {
        continue;
      }
    } else if (requireWindow) {
      // If window required but timestamps unavailable, fail match for safety
      continue;
    }

    matchedCandidates.push({ expense: exp, timeDiff });
  }

  if (matchedCandidates.length === 0) {
    return null;
  }

  // Pick closest in time
  matchedCandidates.sort((a, b) => a.timeDiff - b.timeDiff);
  return matchedCandidates[0].expense;
}

/**
 * Merges a cross-source candidate into an existing expense.
 * - Sets crossMatched: true.
 * - If existing is 'sms' and candidate is 'apple_pay', elevates title to Apple Pay merchant
 *   and source to 'apple_pay' while retaining category, date, and amount.
 * - If existing is 'apple_pay' and candidate is 'sms', preserves Apple Pay title and sets crossMatched: true.
 */
export function applyCrossMatch(
  existing: Expense,
  candidate: CandidateMatch & { title?: string; categoryId?: string }
): Expense {
  const isExistingSms = existing.source === 'sms';
  const isCandidateApplePay = candidate.source === 'apple_pay';

  if (isExistingSms && isCandidateApplePay) {
    return {
      ...existing,
      title: candidate.title && candidate.title.trim() ? candidate.title.trim() : existing.title,
      source: 'apple_pay',
      crossMatched: true,
    };
  }

  return {
    ...existing,
    crossMatched: true,
  };
}
