import { describe, expect, it } from 'vitest';

import {
  deriveEvaluatorReputation,
  dissentIsLegitimate,
  effectiveRatingWeight,
  recomputeStable,
  type ImmutableRatingEvent,
} from '@/lib/civizen-evaluator-reputation';
import { observationWeight } from '@/lib/civizen-score-model';

function rating(overrides: Partial<ImmutableRatingEvent> & Pick<ImmutableRatingEvent, 'id' | 'raterId' | 'subjectRootId'>): ImmutableRatingEvent {
  return {
    value: 70,
    occurredAt: '2026-08-01T00:00:00.000Z',
    role: 'peer',
    evidenceSupplied: true,
    affected: false,
    originalWeight: 1,
    ...overrides,
  };
}

describe('evaluator reputation', () => {
  it('L: fair dissenting evaluator is not penalized for disagreement', () => {
    const ratings = [
      rating({ id: '1', raterId: 'majority-a', subjectRootId: 'c1', value: 80 }),
      rating({ id: '2', raterId: 'majority-b', subjectRootId: 'c1', value: 82 }),
      rating({ id: '3', raterId: 'dissent', subjectRootId: 'c1', value: 48, evidenceSupplied: true }),
    ];
    expect(dissentIsLegitimate('dissent', ratings)).toBe(true);
    const dissent = deriveEvaluatorReputation('dissent', ratings);
    const majority = deriveEvaluatorReputation('majority-a', ratings);
    expect(dissent.dissentPenalized).toBe(false);
    expect(dissent.fairness).toBeGreaterThan(60);
    expect(dissent.fairness).toBeGreaterThan(majority.fairness - 15);
  });

  it('M: collusive evaluator pattern lowers fairness', () => {
    const ratings: ImmutableRatingEvent[] = [];
    for (let i = 0; i < 6; i += 1) {
      ratings.push(rating({ id: `a${i}`, raterId: 'collude-a', subjectRootId: `s${i}`, value: 97 }));
      ratings.push(rating({ id: `b${i}`, raterId: 'collude-b', subjectRootId: `s${i}`, value: 96 }));
    }
    const collude = deriveEvaluatorReputation('collude-a', ratings);
    expect(collude.collusive).toBe(true);
    expect(collude.fairness).toBeLessThan(40);
  });

  it('N: evaluator reputation change keeps the raw rating immutable', () => {
    const event = rating({ id: 'r1', raterId: 'e1', subjectRootId: 'c1', originalWeight: 1, value: 77 });
    const before = deriveEvaluatorReputation('e1', [event]);
    const after = deriveEvaluatorReputation('e1', [
      event,
      ...Array.from({ length: 6 }, (_, i) => rating({ id: `x${i}`, raterId: 'e1', subjectRootId: `s${i}`, value: 98 })),
    ]);
    expect(event.value).toBe(77);
    expect(event.originalWeight).toBe(1);
    const reweighted = effectiveRatingWeight(event, after);
    expect(reweighted.originalWeight).toBe(1);
    expect(reweighted.currentWeight).not.toBe(before.effectiveWeight);
  });

  it('O: evaluator cycle recomputes stably without feedback loops', () => {
    const ratings = [
      rating({ id: 'ab', raterId: 'A', subjectRootId: 'B', value: 70 }),
      rating({ id: 'ba', raterId: 'B', subjectRootId: 'A', value: 72 }),
    ];
    const first = recomputeStable(ratings, []);
    const second = recomputeStable(ratings, []);
    expect(first.get('A')).toEqual(second.get('A'));
    expect(first.get('B')).toEqual(second.get('B'));
    expect(first.get('A')?.effectiveWeight).toBe(second.get('A')?.effectiveWeight);
  });

  it('P: new evaluator is neither worthless nor highly trusted', () => {
    const neu = deriveEvaluatorReputation('new', []);
    expect(neu.effectiveWeight).toBeGreaterThanOrEqual(0.35);
    expect(neu.effectiveWeight).toBeLessThan(0.9);
    expect(neu.confidence).toBe('low');
  });

  it('shallow rating volume does not create a strong evaluator', () => {
    const ratings = Array.from({ length: 100 }, (_, i) => rating({
      id: `s${i}`,
      raterId: 'spam',
      subjectRootId: `x${i}`,
      value: 90,
      evidenceSupplied: false,
    }));
    const spam = deriveEvaluatorReputation('spam', ratings);
    expect(spam.effectiveWeight).toBeLessThan(0.9);
    expect(spam.confidence).toBe('low');
  });

  it('Q: domain-expert evaluator gets a bounded relevance increase', () => {
    const ratings = [
      rating({ id: '1', raterId: 'edu', subjectRootId: 'c1', role: 'expert', domain: 'education', value: 70 }),
      rating({ id: '2', raterId: 'edu', subjectRootId: 'c2', role: 'expert', domain: 'education', value: 72 }),
    ];
    const relevant = deriveEvaluatorReputation('edu', ratings, [], { domain: 'education' });
    const other = deriveEvaluatorReputation('edu', ratings, [], { domain: 'health' });
    expect(relevant.effectiveWeight).toBeGreaterThan(other.effectiveWeight);
    expect(relevant.effectiveWeight).toBeLessThanOrEqual(1.22);
  });

  it('R: beneficiary without expert credentials can still provide strong impact evidence', () => {
    const ratings = [rating({ id: '1', raterId: 'user', subjectRootId: 'c1', role: 'beneficiary', affected: true, value: 64 })];
    const beneficiary = deriveEvaluatorReputation('user', ratings);
    const weight = effectiveRatingWeight(ratings[0]!, beneficiary);
    expect(weight.currentWeight).toBeGreaterThan(0.5);
  });

  it('bounded evaluator reliability cannot dominate observation weight', () => {
    const base = observationWeight({ evidenceRootId: 'a', value: 70, verified: true });
    const boosted = observationWeight({ evidenceRootId: 'a', value: 70, verified: true, evaluatorReliability: 1.22 });
    expect(boosted / base).toBeLessThan(1.3);
  });
});
