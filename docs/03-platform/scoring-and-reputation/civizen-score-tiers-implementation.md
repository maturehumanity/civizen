---
title: Civizen Score Tiers Implementation
status: current
canonical: true
---

# Civizen Score Tiers: Complete Design and Implementation Specification

## 1. Purpose

This document defines the complete tier system to be added to the Civizen Score experience.

The tier system is intended to:

- make progress easier to understand,
- provide meaningful milestones,
- encourage verified participation and contribution,
- recognize sustained reliability and impact,
- avoid reducing a person to a numerical score,
- avoid turning Civizen into a popularity contest, loyalty program, or social caste system.

The tier system must work together with the existing five Civizen Score categories:

1. Learning
2. Experience
3. Skills
4. Performance
5. Contributions

These five categories are the **current Score model** (see [`civizen-score-page-reorganization.md`](./civizen-score-page-reorganization.md)). They are not permanently immutable. Model evolution: [`../model-evolution/shared-classification-and-model-evolution-architecture.md`](../model-evolution/shared-classification-and-model-evolution-architecture.md). Do not change live score categories, weights, calculations, or tiers from this documentation task.

The tier must be derived from the overall Civizen Score, but higher tiers must also require minimum supporting conditions so that a user cannot reach a high tier through education, experience, or self-declared information alone.

---

## 2. Final Approved Tier Names

Use the following five tier names exactly:

```text
Explorer
Builder
Contributor
Catalyst
Steward
```

The progression is:

```text
Explore → Build → Contribute → Catalyze → Steward
```

Use these names consistently across:

- the Home page,
- the Civizen Score details page,
- profile summaries,
- badges,
- achievement notifications,
- tooltips,
- accessibility labels,
- score history,
- API responses,
- analytics,
- future governance and eligibility rules.

Do not use names such as Beginner, Bronze, Silver, Gold, Elite, Master, Legend, Authority, Influencer, Leader, World Citizen, or Citizen.

Every person using Civizen is already a Civizen. The tier must not determine whether someone qualifies as a citizen of humanity.

---

## 3. Final Score Thresholds

Use the following score ranges:

| Civizen Score | Tier |
|---:|---|
| 0.0–29.9 | Explorer |
| 30.0–59.9 | Builder |
| 60.0–74.9 | Contributor |
| 75.0–84.9 | Catalyst |
| 85.0–100.0 | Steward |

Use inclusive lower bounds and exclusive upper bounds, except for the final tier.

Recommended implementation logic:

```ts
function getBaseTier(score: number): CivizenTier {
  if (score >= 85) return 'steward';
  if (score >= 75) return 'catalyst';
  if (score >= 60) return 'contributor';
  if (score >= 30) return 'builder';
  return 'explorer';
}
```

### Important

`Not yet scored` is not a tier.

It is a separate score state for users who do not yet have sufficient data to calculate a meaningful Civizen Score.

---

## 4. Tier Definitions

## 4.1 Explorer

### Score range

```text
0.0–29.9
```

### Meaning

The user is beginning the Civizen journey, establishing a profile, adding information, learning how the ecosystem works, and starting to participate.

### Typical characteristics

- profile is incomplete or newly created,
- some Learning, Experience, or Skills data may exist,
- few or no verified assignments,
- few or no verified contributions,
- limited evidence,
- low or insufficient score confidence.

### Suggested description

> You are beginning your Civizen journey. Add verified learning, experience, skills, assignments, and contributions to build a stronger profile.

### Suggested actions

- complete profile information,
- add education or qualifications,
- add experience,
- add skills,
- provide evidence,
- complete an introductory activity,
- record a first contribution,
- request a contextual endorsement.

---

## 4.2 Builder

### Score range

```text
30.0–59.9
```

### Meaning

The user is actively building a credible record of learning, experience, skills, performance, and contribution.

### Typical characteristics

- profile contains meaningful information,
- at least one verified activity exists,
- some category scores are established,
- user is participating in assignments or contributions,
- reliability history is beginning to form,
- score confidence is still developing.

### Suggested description

> You are building a demonstrated record of capability, reliability, and participation across Civizen.

### Suggested actions

- verify qualifications,
- complete more assignments,
- add evidence for skills,
- improve on-time completion,
- record contribution outcomes,
- request contextual ratings,
- strengthen lower-scoring categories.

---

## 4.3 Contributor

### Score range

```text
60.0–74.9
```

### Meaning

The user consistently creates meaningful, verified value and demonstrates reliable participation.

### Typical characteristics

- strong profile completion,
- meaningful verified contributions,
- solid assignment performance,
- demonstrated skills,
- moderate or higher score confidence,
- consistent activity,
- contextual ratings or validation.

### Suggested description

> You consistently create verified value and demonstrate reliable participation in the Civizen ecosystem.

### Additional qualification requirements

Recommended initial requirements:

```text
Overall score: 60.0–74.9
Performance score: at least 50
Contributions score: at least 50
Score confidence: Moderate or higher
Verified activity: required
```

---

## 4.4 Catalyst

### Score range

```text
75.0–84.9
```

### Meaning

The user produces broader impact, enables the progress of others, helps initiatives succeed, and demonstrates sustained reliability.

### Typical characteristics

- strong Performance score,
- strong Contributions score,
- high-quality verified activity,
- sustained participation over time,
- positive effect beyond individual tasks,
- mentoring, collaboration, initiative support, or measurable wider impact,
- high score confidence.

### Suggested description

> You help people and initiatives move forward through sustained contribution, collaboration, and measurable impact.

### Additional qualification requirements

Recommended initial requirements:

```text
Overall score: 75.0–84.9
Performance score: at least 65
Contributions score: at least 65
Score confidence: High or higher
Sustained verified activity: required
No unresolved serious integrity issue
```

---

## 4.5 Steward

### Score range

```text
85.0–100.0
```

### Meaning

The user demonstrates exceptional and sustained contribution, reliability, judgment, responsibility, and care for the Civizen ecosystem and its public-interest mission.

### Typical characteristics

- consistently high Performance,
- consistently high Contributions,
- substantial verified impact,
- strong contextual ratings,
- demonstrated judgment,
- sustained activity,
- high or very high score confidence,
- no unresolved serious integrity concerns.

### Suggested description

> You demonstrate sustained responsibility, trusted contribution, and exceptional care for the Civizen ecosystem and its mission.

### Additional qualification requirements

Recommended initial requirements:

```text
Overall score: 85.0–100.0
Performance score: at least 75
Contributions score: at least 75
Score confidence: High or Very High
Substantial verified impact: required
No unresolved serious integrity issue
```

### Important restriction

Steward tier must not automatically grant:

- governance power,
- moderation authority,
- verification authority,
- financial rewards,
- employment,
- leadership status,
- control over other users.

Steward tier may establish eligibility for such roles, but actual appointment must follow separate role-specific rules, suitability checks, consent, safeguards, and governance procedures.

---

## 5. Tier Qualification Logic

The final tier must be determined in two stages.

### Stage 1: Base tier by overall score

The overall score determines the highest possible tier.

### Stage 2: Qualification checks

The system checks whether the user satisfies the additional requirements for that tier.

If the user does not satisfy the requirements, assign the highest tier for which all requirements are met.

Example:

```text
Overall score: 78
Base tier by score: Catalyst
Performance: 61
Contributions: 68
Confidence: High

Final tier: Contributor
Reason: Performance must reach 65 for Catalyst.
```

Recommended logic:

```ts
function determineFinalTier(input: TierQualificationInput): TierResult {
  const baseTier = getBaseTier(input.overallScore);

  const orderedTiers: CivizenTier[] = [
    'steward',
    'catalyst',
    'contributor',
    'builder',
    'explorer',
  ];

  const baseTierIndex = orderedTiers.indexOf(baseTier);

  for (let i = baseTierIndex; i < orderedTiers.length; i++) {
    const tier = orderedTiers[i];

    if (meetsTierRequirements(tier, input)) {
      return {
        baseTier,
        finalTier: tier,
        qualified: tier === baseTier,
        unmetRequirements:
          tier === baseTier ? [] : getUnmetRequirements(baseTier, input),
      };
    }
  }

  return {
    baseTier,
    finalTier: 'explorer',
    qualified: baseTier === 'explorer',
    unmetRequirements: getUnmetRequirements(baseTier, input),
  };
}
```

---

## 6. Recommended Configurable Tier Rules

Do not hard-code tier rules throughout the application.

Use centralized configuration.

```ts
type CivizenTier =
  | 'explorer'
  | 'builder'
  | 'contributor'
  | 'catalyst'
  | 'steward';

interface TierRule {
  id: CivizenTier;
  label: string;
  minScore: number;
  maxScore: number;
  minPerformanceScore?: number;
  minContributionsScore?: number;
  minConfidence?: ScoreConfidence;
  requiresVerifiedActivity?: boolean;
  requiresSustainedActivity?: boolean;
  requiresSubstantialImpact?: boolean;
  requiresNoSeriousIntegrityIssue?: boolean;
}

const DEFAULT_TIER_RULES: TierRule[] = [
  {
    id: 'explorer',
    label: 'Explorer',
    minScore: 0,
    maxScore: 29.9,
  },
  {
    id: 'builder',
    label: 'Builder',
    minScore: 30,
    maxScore: 59.9,
    requiresVerifiedActivity: true,
  },
  {
    id: 'contributor',
    label: 'Contributor',
    minScore: 60,
    maxScore: 74.9,
    minPerformanceScore: 50,
    minContributionsScore: 50,
    minConfidence: 'moderate',
    requiresVerifiedActivity: true,
  },
  {
    id: 'catalyst',
    label: 'Catalyst',
    minScore: 75,
    maxScore: 84.9,
    minPerformanceScore: 65,
    minContributionsScore: 65,
    minConfidence: 'high',
    requiresSustainedActivity: true,
    requiresNoSeriousIntegrityIssue: true,
  },
  {
    id: 'steward',
    label: 'Steward',
    minScore: 85,
    maxScore: 100,
    minPerformanceScore: 75,
    minContributionsScore: 75,
    minConfidence: 'high',
    requiresSubstantialImpact: true,
    requiresNoSeriousIntegrityIssue: true,
  },
];
```

These values must remain adjustable for testing, calibration, governance review, anti-gaming improvements, future policy changes, and real-user data analysis.

---

## 7. Relationship to Score Confidence

Tier and confidence are separate concepts.

Examples:

```text
Tier: Contributor
Confidence: Moderate
```

```text
Tier: Catalyst
Confidence: High
```

Do not combine them into one label.

A user may have a high numerical score but still be ineligible for a higher tier because the score is based on limited or insufficiently verified data.

Recommended confidence order:

```ts
type ScoreConfidence =
  | 'insufficient'
  | 'low'
  | 'moderate'
  | 'high'
  | 'very_high';

const CONFIDENCE_RANK: Record<ScoreConfidence, number> = {
  insufficient: 0,
  low: 1,
  moderate: 2,
  high: 3,
  very_high: 4,
};
```

---

## 8. Relationship to the Five Score Categories

The tier system must use the overall Civizen Score, which is calculated from:

1. Learning
2. Experience
3. Skills
4. Performance
5. Contributions

The overall score alone is not sufficient for the higher tiers.

Performance and Contributions act as essential qualifying categories because:

- Learning alone does not prove contribution.
- Experience alone does not prove current reliability.
- Skills alone do not prove meaningful use.
- High credentials should not replace participation.
- Higher Civizen recognition must reflect actual contribution and dependable performance.

---

## 9. Home Page Implementation

The Home page should show the current tier directly in the score card.

### Current user example

```text
YOUR CIVIZEN SCORE

8.4 / 100
EXPLORER

Confidence: Low

21.6 points to Builder

View Score Details
```

### Higher-tier example

```text
YOUR CIVIZEN SCORE

68.7 / 100
CONTRIBUTOR

Confidence: High

6.3 points to Catalyst

View Score Details
```

### Not-yet-scored example

```text
YOUR CIVIZEN SCORE

Not yet scored

Complete your profile and begin verified activity
to establish your Civizen Score.

View Score Details
```

### Home card requirements

- show overall score,
- show tier,
- show confidence,
- show next-tier progress,
- link to Score Details,
- do not show endorsements as the main explanation,
- do not display `0.0` for insufficient data,
- do not use red solely because the score is low.

---

## 10. Score Details Page Implementation

The top section should display:

```text
Civizen Score
68.7 / 100

Tier: Contributor
Confidence: High
Last updated: August 2, 2026
```

Below it, show a tier progress section.

```text
Progress to Catalyst

Current score: 68.7
Required score: 75.0

Performance: 71
Required: 65

Contributions: 62
Required: 65

Confidence: High
Required: High
```

The interface must explain both numerical progress and unmet substantive requirements.

Do not show only:

```text
6.3 points remaining
```

That would encourage point collection without meaningful participation.

---

## 11. Tier Progress Component

Create a reusable tier progress component.

```ts
interface TierProgress {
  currentTier: CivizenTier;
  nextTier: CivizenTier | null;
  currentScore: number | null;
  nextTierMinScore: number | null;
  pointsRemaining: number | null;
  requirements: Array<{
    id: string;
    label: string;
    currentValue?: number | string | boolean | null;
    requiredValue?: number | string | boolean | null;
    met: boolean;
    explanation?: string;
  }>;
}
```

Example output:

```json
{
  "currentTier": "contributor",
  "nextTier": "catalyst",
  "currentScore": 68.7,
  "nextTierMinScore": 75,
  "pointsRemaining": 6.3,
  "requirements": [
    {
      "id": "performance",
      "label": "Performance score",
      "currentValue": 71,
      "requiredValue": 65,
      "met": true
    },
    {
      "id": "contributions",
      "label": "Contributions score",
      "currentValue": 62,
      "requiredValue": 65,
      "met": false
    },
    {
      "id": "confidence",
      "label": "Score confidence",
      "currentValue": "High",
      "requiredValue": "High",
      "met": true
    }
  ]
}
```

---

## 12. Tier Badge Design

Each tier should have:

- a text label,
- an icon or emblem,
- a distinct visual treatment,
- a non-color identifier,
- accessible text.

Recommended conceptual icon directions:

| Tier | Suggested concept |
|---|---|
| Explorer | compass, path, or horizon |
| Builder | blocks, structure, or tools |
| Contributor | helping hands, connection, or contribution mark |
| Catalyst | spark, ripple, or expanding motion |
| Steward | shield, care, balance, or guiding emblem |

Avoid crowns, military insignia, luxury symbols, medal rankings, gold/silver/bronze hierarchy, or symbols implying superiority or domination.

Tier badge labels must remain visible. Do not rely on icon or color alone.

---

## 13. Recommended Color Behavior

The current implementation shows a low score in red. Change this behavior.

Red should be reserved for:

- confirmed warnings,
- serious reliability problems,
- disputed or invalid evidence,
- confirmed policy violations,
- integrity issues,
- urgent negative changes.

A low or early-stage score should use neutral Civizen colors, the tier's own accent, or muted developmental styling.

Recommended behavior:

```text
Explorer: slate `#7B8AA1`
Builder: teal `#2BA8A0`
Contributor: blue `#3B82F6`
Catalyst: violet `#8B5CF6`
Steward: warm amber `#D9A441`

Canonical source: `TIER_COLORS` / `colorHex` on each rule in `src/lib/civizen-score-tiers.ts`.
```

Do not make the tier system resemble a traffic-light judgment system.

---

## 14. Tier Advancement

When a user reaches a new tier, show a recognition message.

Example:

```text
You reached Contributor

Your verified contributions and reliable performance
have established you as a Contributor in Civizen.
```

Include:

- previous tier,
- new tier,
- date,
- reason,
- contributing score changes,
- newly available opportunities,
- next-tier requirements.

Do not use manipulative language, artificial urgency, or excessive celebration.

---

## 15. Tier Regression

A user's tier may decrease if:

- the scoring model changes,
- verified information is removed or invalidated,
- assignment reliability declines,
- confirmed contribution records are reversed,
- serious disputes are resolved against the user,
- required confidence falls,
- required supporting conditions are no longer met.

Tier regression must be:

- explainable,
- auditable,
- visible in Score History,
- appealable where appropriate,
- based on explicit rules,
- protected against arbitrary manual changes.

Example:

```text
Tier changed from Catalyst to Contributor

Reason:
Contributions score changed from 66 to 62 after
two contribution records were invalidated.

You can review or appeal the affected records.
```

---

## 16. Tier Benefits and Eligibility

Tiers may unlock eligibility, recognition, and relevant opportunities.

### Explorer

Possible benefits:

- profile-building guidance,
- introductory activities,
- learning recommendations,
- standard community participation.

### Builder

Possible benefits:

- broader assignment access,
- participation badge,
- profile-development recommendations,
- contextual endorsement requests.

### Contributor

Possible benefits:

- advanced assignments,
- greater visibility for verified contributions,
- collaboration opportunities,
- contributor-role eligibility,
- mentoring preparation.

### Catalyst

Possible benefits:

- higher-impact assignments,
- mentoring eligibility,
- initiative leadership eligibility,
- project coordination opportunities,
- collaboration and facilitation roles.

### Steward

Possible benefits:

- stewardship-role eligibility,
- verification-role eligibility,
- moderation-role eligibility,
- governance-role eligibility,
- mission-support responsibilities,
- high-responsibility assignments.

### Important rule

Tier benefits must create eligibility, not automatic authority.

The application must not automatically grant voting weight, moderation powers, employment, financial priority, control over others, or institutional authority.

Any such role must have separate requirements and governance approval.

---

## 17. Anti-Gaming Rules

The tier system must not encourage meaningless score optimization.

Implement safeguards against:

- repetitive low-value contributions,
- self-rating,
- reciprocal rating rings,
- endorsement trading,
- duplicate evidence,
- assignment farming,
- trivial task inflation,
- artificial quantity,
- fake institutional verification,
- coordinated manipulation,
- conflict-of-interest ratings,
- rapid suspicious score increases.

Recommended measures:

- diminishing returns for repeated low-value activity,
- verification weighting,
- contextual ratings,
- conflict-of-interest detection,
- source diversity checks,
- rate limits,
- anomaly detection,
- audit logs,
- dispute and appeal processes,
- score confidence controls.

---

## 18. Fairness and Inclusion Safeguards

The tier system must not unfairly penalize users because of:

- disability,
- illness,
- caregiving responsibilities,
- temporary unemployment,
- limited internet access,
- geographic location,
- language,
- age,
- lack of formal education,
- lack of institutional connections,
- inability to participate continuously.

Requirements:

- do not reward constant availability as a universal virtue,
- allow appropriate assignment declines,
- recognize non-formal learning,
- recognize unpaid and community contribution,
- distinguish inactivity from unreliability,
- allow context-sensitive explanations,
- avoid permanent penalties,
- support accessibility,
- support appeals.

---

## 19. Required Explanatory Text

Add an information control near the tier display.

Recommended text:

> Civizen tiers recognize demonstrated participation, reliability, contribution, and impact within the Civizen ecosystem. They do not measure a person's dignity, intelligence, social worth, or right to participate.

Add another explanation for higher-tier eligibility:

> Higher tiers require both a sufficient overall score and demonstrated performance, contribution, verification, and score confidence.

---

## 20. Data Model

```ts
interface CivizenTierStatus {
  scoreState: 'not_scored' | 'scored';
  baseTier: CivizenTier | null;
  finalTier: CivizenTier | null;
  currentScore: number | null;
  confidence: ScoreConfidence;
  qualifiedForBaseTier: boolean;
  unmetRequirements: TierRequirementResult[];
  nextTier: CivizenTier | null;
  nextTierMinScore: number | null;
  pointsToNextTier: number | null;
  calculatedAt: string | null;
  rulesVersion: string;
}

interface TierRequirementResult {
  id: string;
  label: string;
  type:
    | 'score'
    | 'category_score'
    | 'confidence'
    | 'verified_activity'
    | 'sustained_activity'
    | 'impact'
    | 'integrity';
  currentValue: number | string | boolean | null;
  requiredValue: number | string | boolean | null;
  met: boolean;
  explanation?: string;
}
```

---

## 21. API Response

```json
{
  "score": {
    "overall": 68.7,
    "confidence": "high",
    "lastCalculatedAt": "2026-08-02T20:15:00-07:00"
  },
  "tier": {
    "baseTier": "contributor",
    "finalTier": "contributor",
    "qualifiedForBaseTier": true,
    "nextTier": "catalyst",
    "nextTierMinScore": 75,
    "pointsToNextTier": 6.3,
    "rulesVersion": "1.0.0",
    "requirements": [
      {
        "id": "overall_score",
        "label": "Overall score",
        "currentValue": 68.7,
        "requiredValue": 75,
        "met": false
      },
      {
        "id": "performance_score",
        "label": "Performance score",
        "currentValue": 71,
        "requiredValue": 65,
        "met": true
      },
      {
        "id": "contributions_score",
        "label": "Contributions score",
        "currentValue": 62,
        "requiredValue": 65,
        "met": false
      },
      {
        "id": "confidence",
        "label": "Score confidence",
        "currentValue": "high",
        "requiredValue": "high",
        "met": true
      }
    ]
  }
}
```

---

## 22. Score History Integration

Tier changes must appear in Score History.

Example:

```text
August 2, 2026

Tier changed:
Builder → Contributor

Reason:
Overall score reached 61.2.
Performance reached 57.
Contributions reached 54.
Confidence reached Moderate.
```

Record:

- previous tier,
- new tier,
- previous score,
- new score,
- date,
- triggered requirements,
- calculation version,
- rules version,
- source events,
- appeal status where applicable.

---

## 23. Notifications

Recommended notification types:

- approaching next tier,
- reached next tier,
- requirement completed,
- tier qualification blocked,
- tier changed,
- tier recalculated after model update.

Examples:

```text
You are close to Contributor.
Your overall score is 58.9.
```

```text
Your score is high enough for Catalyst,
but your Contributions score must reach 65.
```

Do not send excessive reminders.

Tier notifications must be configurable and dismissible.

---

## 24. Accessibility

Implement:

- semantic tier labels,
- accessible score descriptions,
- screen-reader-compatible progress,
- visible focus states,
- keyboard navigation,
- non-color indicators,
- sufficient contrast,
- minimum touch target sizes,
- reduced-motion support,
- clear empty states.

Example screen-reader text:

```text
Civizen Score 68.7 out of 100.
Current tier Contributor.
Score confidence High.
6.3 points to Catalyst.
Contributions requirement not yet met.
```

---

## 25. Responsive Layout

### Mobile

Recommended order:

1. overall score,
2. tier badge,
3. confidence,
4. next-tier progress,
5. circle,
6. category scores,
7. tier requirements,
8. score history.

### Tablet and Desktop

Recommended layout:

- score and tier summary at top,
- circle on the left,
- tier progress and requirements on the right,
- category details below,
- score history below.

---

## 26. Migration From Current UI

Current implementation includes:

```text
Stage: Building
```

Replace it with:

```text
Tier: Explorer
```

For a score of 8.4:

```text
Civizen Score
8.4 / 100

Tier: Explorer
Confidence: Low
```

Add:

```text
21.6 points to Builder
```

Remove the use of red merely because the score is low.

Keep `Building` only if needed as an internal profile-completion state, but do not display it as the formal score tier.

Do not show both:

```text
Stage: Building
Tier: Builder
```

That would confuse users.

Use one public tier system only.

---

## 27. Required Test Cases

Create automated tests for at least the following scenarios.

### Test 1: Not yet scored (Explorer display)

```text
Score: null
Expected scoreState: not_scored
Expected tier: Explorer
Expected display: Explorer (not “Not yet scored”)
Next tier: Builder
Points remaining: 30
```

### Test 2: Explorer

```text
Score: 8.4
Expected tier: Explorer
Next tier: Builder
Points remaining: 21.6
```

### Test 3: Builder threshold

```text
Score: 30.0
Verified activity: true
Expected tier: Builder
```

### Test 4: Builder score without verified activity

```text
Score: 42
Verified activity: false
Expected final tier: Explorer
Expected reason: Verified activity required for Builder
```

### Test 5: Contributor threshold

```text
Score: 60
Performance: 50
Contributions: 50
Confidence: Moderate
Expected tier: Contributor
```

### Test 6: Contributor score but insufficient Performance

```text
Score: 68
Performance: 42
Contributions: 61
Confidence: High
Expected final tier: Builder
Expected reason: Performance must reach 50
```

### Test 7: Catalyst threshold

```text
Score: 75
Performance: 65
Contributions: 65
Confidence: High
Sustained activity: true
No serious integrity issue: true
Expected tier: Catalyst
```

### Test 8: Catalyst score but low Contributions

```text
Score: 81
Performance: 72
Contributions: 61
Confidence: High
Expected final tier: Contributor
```

### Test 9: Steward threshold

```text
Score: 85
Performance: 75
Contributions: 75
Confidence: High
Substantial verified impact: true
No serious integrity issue: true
Expected tier: Steward
```

### Test 10: Steward score with unresolved integrity issue

```text
Score: 91
Performance: 88
Contributions: 86
Confidence: Very High
Serious integrity issue: unresolved
Expected final tier: Contributor or Catalyst according to policy
Expected reason: Steward and Catalyst require no unresolved serious integrity issue
```

### Test 11: Boundary values

```text
29.9 → Explorer
30.0 → Builder
59.9 → Builder
60.0 → Contributor
74.9 → Contributor
75.0 → Catalyst
84.9 → Catalyst
85.0 → Steward
100.0 → Steward
```

### Test 12: Score decrease

Confirm:

- tier recalculates,
- history records the change,
- user receives an explanation,
- appeal link appears if relevant.

---

## 28. Acceptance Criteria

Implementation is complete when:

- the five approved tier names are used,
- the score thresholds match the approved ranges,
- `Not yet scored` remains separate from tiers,
- higher tiers require Performance and Contributions minimums,
- confidence requirements are enforced,
- tier requirements are configurable,
- the Home page displays tier and progress,
- the Score Details page explains qualification requirements,
- the current `Stage: Building` display is replaced,
- low scores are not automatically displayed in red,
- tier progress includes substantive requirements,
- tier changes appear in Score History,
- benefits create eligibility rather than automatic authority,
- the system includes anti-gaming safeguards,
- the system includes fairness and inclusion safeguards,
- tests cover all boundary and qualification cases,
- accessibility requirements are met,
- the UI works on mobile, tablet, and desktop.

---

## 29. Final Approved Tier System

Use exactly:

```text
Explorer:      0.0–29.9
Builder:      30.0–59.9
Contributor:  60.0–74.9
Catalyst:     75.0–84.9
Steward:      85.0–100.0
```

Higher-tier qualification requirements:

```text
Contributor:
- Performance at least 50
- Contributions at least 50
- Confidence Moderate or higher
- Verified activity required

Catalyst:
- Performance at least 65
- Contributions at least 65
- Confidence High or higher
- Sustained verified activity required
- No unresolved serious integrity issue

Steward:
- Performance at least 75
- Contributions at least 75
- Confidence High or Very High
- Substantial verified impact required
- No unresolved serious integrity issue
```

Public progression phrase:

```text
Explore. Build. Contribute. Catalyze. Steward.
```
