---
title: Civizen Score Page Reorganization
status: current
canonical: true
---

# Civizen Score Page Reorganization and Implementation Specification

## 1. Purpose

This document defines the required redesign of the Civizen Home score summary and the detailed Score page.

The goal is to organize the Civizen Score into five understandable categories while preserving the existing five-segment circular design. The overall score must not be presented as being based only on endorsements, Experience, Skills, or Contributions. It must combine education and learning, experience, skills, assignment performance, contributions, ratings, evidence, and other relevant verified activity.

The design must also clearly distinguish:

- the overall Civizen Score,
- the five category scores,
- the detailed metrics inside each category,
- ratings and endorsements,
- evidence and verification,
- score confidence,
- Civizen domains or pillars.

The score is intended to summarize demonstrated activity and reliability. It must never be described as a measure of a person's intrinsic value or human worth.

---

## 2. Final Five Score Categories

Use the following single-word labels on the circular visualization:

1. **Learning**
2. **Experience**
3. **Skills**
4. **Performance**
5. **Contributions**

These are the official short labels for the five circle segments.

When additional space is available, such as in cards, expanded panels, tooltips, accessibility labels, or explanatory text, use the following full category names:

| Circle label | Full label |
|---|---|
| Learning | Learning & Qualifications |
| Experience | Experience |
| Skills | Skills |
| Performance | Performance & Reliability |
| Contributions | Contributions & Impact |

The application should store a stable internal category identifier that is separate from the displayed label.

Recommended identifiers:

```ts
type ScoreCategoryId =
  | 'learning'
  | 'experience'
  | 'skills'
  | 'performance'
  | 'contributions';
```

---

## 3. Score Hierarchy

The scoring system must follow this hierarchy:

```text
Overall Civizen Score
    └── Five Category Scores
            └── Detailed Metrics
                    └── Source Activities, Ratings, Evidence, and Verification
```

### Level 1: Overall Civizen Score

The overall score is a weighted result based on all five category scores.

### Level 2: Category Scores

The circle displays the five primary category scores:

- Learning
- Experience
- Skills
- Performance
- Contributions

### Level 3: Detailed Metrics

Each category is calculated from its own detailed metrics.

### Level 4: Source Records

Detailed metrics are supported by actual records, including:

- education records,
- qualifications,
- assessments,
- work and project history,
- skill evidence,
- assignments,
- contribution records,
- ratings,
- endorsements,
- documents,
- institutional confirmations,
- verification events,
- dispute outcomes.

---

## 4. Category Definitions and Included Metrics

## 4.1 Learning

**Full label:** Learning & Qualifications

Learning represents demonstrated education, knowledge development, qualifications, and continuing learning.

Include:

- formal education,
- degrees and diplomas,
- vocational education,
- certifications,
- professional licenses,
- courses and training,
- Civizen Study completions,
- knowledge assessments,
- assessment results,
- continuing education,
- demonstrated knowledge,
- relevance of learning to the user's activities,
- recency of learning,
- verified versus self-declared qualifications.

Important implementation rule:

The category must not privilege formal university education as the only valid form of learning. Vocational, community-based, self-directed, practical, and assessed learning must also be supported.

**Preliminary scoring (v1.2):** Learning is driven primarily by **highest education level** (middle school → doctorate), not by record count. Custom labels such as a **5-year diploma / specialist degree** normalize to master’s-equivalent. **Trainings** (continuing courses attended) are a secondary boost, capped so they cannot outrank degree attainment. Additional credentials add a small breadth bonus; verification raises the score and confidence. When level data is missing, the older quantity curve remains as a fallback.

Suggested expanded subsections:

```text
Education
Qualifications
Training
Assessments
Continuing Learning
```

---

## 4.2 Experience

Experience represents what the person has practiced, completed, managed, led, or lived through over time.

Include:

- professional roles,
- project experience,
- leadership roles,
- volunteer experience,
- community experience,
- civic experience,
- research experience,
- educational experience,
- practical experience,
- relevant lived experience,
- completed projects,
- duration,
- recency,
- relevance,
- level of responsibility,
- verified roles,
- confirmed outcomes.

Experience must not increase without limit based only on years. Recency, relevance, responsibility, evidence, and demonstrated results must also matter.

Suggested expanded subsections:

```text
Professional
Projects
Leadership
Community
Other Relevant Experience
```

---

## 4.3 Skills

Skills represents demonstrated abilities that the person can apply.

Include:

- individual skill proficiency,
- skill assessments,
- work samples,
- evidence,
- successful use in assignments,
- successful use in contributions,
- expert validation,
- peer validation,
- institutional validation,
- endorsements attached to a specific skill,
- frequency of demonstrated use,
- recency of demonstrated use,
- quality of outcomes connected to the skill.

Each skill should have its own record and score. The Skills category score should summarize the user's supported and relevant skill records.

Example skill record:

```text
Skill: Project Management
Proficiency: 78
Evidence items: 6
Verified uses: 4
Endorsements: 3
Last demonstrated: 2026-07-18
Confidence: High
```

Suggested expanded subsections:

```text
Top Skills
Assessed Skills
Verified Skills
Recently Demonstrated
Needs Evidence
```

---

## 4.4 Performance

**Full label:** Performance & Reliability

Performance represents how dependably and successfully the user responds to, accepts, performs, and completes assignments or other structured commitments.

### Live estimator (v1)

As of 2026-08-03, Performance is estimated from the Contributions activity ledger plus ratings (assignment invitation lifecycle comes later):

1. Reuse `profile_contribution_events` as the activity list (development stories, law, solutions, governance, posts, etc.).
2. **System rating** per activity: derived from capacity / impact / collaboration estimates (verified and platform-direct types weighted higher). Not editable by the subject.
3. **Peer ratings** in `profile_performance_ratings`: any signed-in member except the contributor may set one 0–100 rating per contribution event.
4. Category metrics: Engagement (recent), Activity (diminishing quantity), Reliability (verified + system), Accomplishment (mean system), Ratings (mean peer).
5. Own Performance panel is **read-only**; other Civizens’ profiles can rate activities.

This category must include the assignment-related factors already planned for Civizen.

### Engagement metrics

- assignment invitations received,
- response rate,
- response time,
- acceptance rate,
- appropriate decline rate,
- ignored invitations,
- availability accuracy.

A user must not be penalized merely for declining an unsuitable assignment. A timely and appropriate decline should be treated differently from ignoring an invitation or repeatedly accepting work that is not completed.

### Activity metrics

- assignments accepted,
- assignments started,
- assignments active,
- assignments attempted,
- assignments completed,
- relevant activity quantity,
- consistency over time.

Quantity must use diminishing returns. A large number of trivial assignments must not automatically outweigh fewer substantial assignments.

### Reliability metrics

- completion rate,
- on-time completion rate,
- cancellation rate,
- abandonment rate,
- missed commitments,
- responsiveness during an assignment,
- update frequency when updates are required,
- compliance with agreed requirements.

### Accomplishment metrics

- objectives achieved,
- deliverables accepted,
- outcome verified,
- quality requirements met,
- recipient satisfaction,
- assignment rating,
- revisions required,
- problems resolved,
- measurable effectiveness.

Suggested expanded subsections:

```text
Engagement
Activity
Reliability
Accomplishment
Ratings
```

---

## 4.5 Contributions

**Full label:** Contributions & Impact

Contributions represents the value the person creates for other people, communities, institutions, Civizen, and the wider public interest.

### Live estimator (v1)

As of 2026-08-02, Contributions is estimated from existing in-app activity (not count-only):

1. Collect domain rows (law contributions, funding `contribution_records`, solutions, governance proposals/votes, posts/comments, moderated `content_items`).
2. Persist idempotent events in `profile_contribution_events` with heuristic **capacity**, **impact**, **collaboration**, and **beneficiaries** factors.
3. Score with diminishing quantity + mean capacity/impact + type diversity + small collaboration boost (anti-gaming: many low-impact posts cannot outrank fewer verified high-impact actions).
4. Score page dial/card opens an **activity ledger** (`ContributionsDetailsPanel`) listing estimated events and factors.

Historical rows are backfilled by migration; client `syncContributionEvents` refreshes the ledger on Score/Home load.

Include:

- contribution quantity,
- contribution quality,
- difficulty,
- effort,
- originality,
- collaboration,
- community value,
- number of people or groups benefited,
- measurable result,
- long-term usefulness,
- sustainability,
- relevance,
- verified impact,
- consistency over time,
- contribution-related ratings,
- institutional confirmation,
- supporting evidence.

Contributions must not be scored only by count. A small number of substantial, verified contributions may be more meaningful than many minor actions.

Suggested expanded subsections:

```text
Recent Contributions
Verified Contributions
Impact
Collaboration
Beneficiaries
Ratings
```

**Not yet in v1:** off-platform declaration panel, AI content estimation, contextual contribution ratings (Ratings metric stays unscored).

---

## 5. Ratings, Endorsements, Evidence, and Verification

Ratings, endorsements, evidence, and verification are not a sixth circle category.

They are cross-cutting inputs that support or affect the appropriate category.

## 5.1 Ratings

A rating must be attached to a specific context.

Examples:

- assignment performance rating,
- contribution impact rating,
- collaboration rating,
- skill demonstration rating,
- learning activity rating,
- experience confirmation rating.

Avoid a generic unrestricted prompt such as:

```text
Rate this person from 1 to 5.
```

A generic person rating can become popularity-based, subjective, discriminatory, or unrelated to demonstrated activity.

Every rating should record:

```ts
interface ContextualRating {
  id: string;
  subjectUserId: string;
  raterUserId: string;
  contextType:
    | 'assignment'
    | 'contribution'
    | 'skill'
    | 'learning'
    | 'experience'
    | 'collaboration';
  contextId: string;
  score: number;
  criteriaScores?: Record<string, number>;
  comment?: string;
  createdAt: string;
  verificationStatus: VerificationStatus;
  disputeStatus?: DisputeStatus;
}
```

## 5.2 Endorsements

An endorsement should confirm a specific claim, not increase the overall score automatically.

Supported endorsement targets:

- a skill,
- an experience record,
- a contribution,
- an assignment outcome,
- a qualification,
- a role.

Endorsements should be weighted based on:

- relationship to the endorsed activity,
- relevance,
- verifier identity,
- institutional role where applicable,
- supporting evidence,
- history of reliable endorsements,
- conflict-of-interest checks.

## 5.3 Evidence

Evidence may include:

- documents,
- certificates,
- licenses,
- links,
- work samples,
- project records,
- institutional records,
- assignment deliverables,
- contribution results,
- media,
- references,
- assessment results.

Evidence must be linked to the record it supports.

## 5.4 Verification

Verification should confirm authenticity or completion.

Verification types may include:

- identity verification,
- document verification,
- institutional verification,
- peer confirmation,
- expert confirmation,
- system-confirmed assignment completion,
- assessment verification,
- contribution outcome verification.

## 5.5 Score Confidence

Score confidence must be displayed separately from the numerical score.

Recommended confidence states:

```ts
type ScoreConfidence =
  | 'insufficient'
  | 'low'
  | 'moderate'
  | 'high'
  | 'very_high';
```

Examples:

```text
Score: 74.2
Confidence: High
```

```text
Preliminary score: 74.2
Confidence: Low
```

A low-confidence score must not be presented as equally reliable to a score supported by extensive verified activity.

---

## 6. Initial Weighting Model

Use configurable weights. Do not hard-code the values throughout the interface or business logic.

Recommended initial defaults:

| Category | Initial weight |
|---|---:|
| Learning | 15% |
| Experience | 20% |
| Skills | 20% |
| Performance | 20% |
| Contributions | 25% |
| **Total** | **100%** |

Recommended configuration structure:

```ts
const DEFAULT_SCORE_WEIGHTS: Record<ScoreCategoryId, number> = {
  learning: 0.15,
  experience: 0.20,
  skills: 0.20,
  performance: 0.20,
  contributions: 0.25,
};
```

These are initial implementation values, not a permanent constitutional rule. They must remain adjustable for testing, calibration, governance review, and later policy decisions.

Conceptual formula:

```text
Overall Score =
    Learning Score × Learning Weight
  + Experience Score × Experience Weight
  + Skills Score × Skills Weight
  + Performance Score × Performance Weight
  + Contributions Score × Contributions Weight
```

The calculation service must:

- ignore unavailable category scores only according to an explicit insufficient-data policy,
- avoid silently treating missing data as zero,
- distinguish `not scored` from `0`,
- store calculation version,
- store calculation date,
- provide a human-readable explanation of contributing factors,
- support future formula changes without rewriting historical results.

---

## 7. Missing Data and New User States

Do not display `0.0` when the user has not yet been evaluated.

Use:

```text
Not yet scored
```

A numerical zero means the user was evaluated and received the lowest possible result. That is not the same as having insufficient information.

Recommended score states:

| State | Meaning |
|---|---|
| Not yet scored | Insufficient information for a numerical score |
| Building | Some data exists, but confidence is insufficient |
| Developing | A preliminary score is available |
| Established | A substantial verified history exists |
| Highly Established | Extensive and consistently verified history exists |

The profile stage must remain separate from the numerical score.

Suggested model:

```ts
interface ScoreSummary {
  overallScore: number | null;
  stage:
    | 'not_scored'
    | 'building'
    | 'developing'
    | 'established'
    | 'highly_established';
  confidence: ScoreConfidence;
  categoryScores: Record<ScoreCategoryId, number | null>;
  evidenceCount: number;
  verifiedEvidenceCount: number;
  ratingCount: number;
  endorsementCount: number;
  lastCalculatedAt: string | null;
  calculationVersion: string;
}
```

---

## 8. Home Page Changes

The Home page should remain a concise dashboard. It should not attempt to show every detailed metric.

## 8.1 Replace the current score card content

Current presentation:

```text
Your Civizen Score
0.0
0 total endorsements
View details
```

Replace it with a multidimensional score summary.

### New user example

```text
YOUR CIVIZEN SCORE

Not yet scored
Building

Complete your profile and begin participating
to establish your Civizen Score.

View Score Details
```

### Scored user example

```text
YOUR CIVIZEN SCORE

74.2 / 100
Established

Learning          71
Experience        76
Skills            69
Performance       81
Contributions     75

Confidence: High
Based on 38 verified activities

View Score Details
```

On small mobile screens, the five category values may be displayed as:

- a horizontally scrollable row,
- a compact two-row grid,
- or a shortened summary followed by the details button.

Do not reduce the summary to endorsements alone.

## 8.2 Home card terminology

Use:

- **Your Civizen Score**
- **View Score Details**
- **Not yet scored**
- **Score confidence**
- **Verified activities**

Do not use:

- `0 total endorsements` as the primary explanation of the score,
- `0.0` for a profile that has not been evaluated,
- language implying that endorsements alone determine the score.

## 8.3 Home page Recent Activity

The current empty state is endorsement-specific even though the section is titled Recent Activity.

Replace:

```text
No endorsements yet.
Share your profile to start receiving endorsements.
```

With:

```text
No activity yet

Add learning, experience, skills, assignments,
or contributions to begin building your Civizen profile.
```

Recommended primary actions:

```text
Add Experience
Add Skill
Add Contribution
```

Optional secondary actions:

```text
Add Qualification
Request Endorsement
```

Recent Activity should eventually include:

- learning records added or verified,
- experience records added or confirmed,
- skills added or verified,
- assignments accepted,
- assignments completed,
- on-time accomplishments,
- contributions recorded,
- evidence added,
- ratings received,
- endorsements received,
- category score changes,
- overall score changes,
- governance activity where applicable.

---

## 9. Detailed Score Page Changes

The page opened through **View Score Details** should be titled:

```text
Civizen Score
```

The page should be organized in the following order.

## 9.1 Score Overview

Display:

```text
Civizen Score
74.2 / 100

Stage: Established
Confidence: High
Based on 38 verified activities
Last updated: August 2, 2026
```

For a new user:

```text
Civizen Score
Not yet scored

Stage: Building
Confidence: Insufficient
Add information and verified activity to establish your score.
```

Add an information control with the following explanation:

> The Civizen Score reflects demonstrated learning, experience, skills, performance, contributions, and supporting validation. It does not measure a person's intrinsic value or human worth.

## 9.2 Circular Score Visualization

Keep the existing five-segment circle design.

Replace the current segment labels with the final single-word score labels:

- Learning
- Experience
- Skills
- Performance
- Contributions

Recommended segment order, clockwise from the top:

1. Learning
2. Skills
3. Performance
4. Contributions
5. Experience

This order creates a logical progression from learning and capability to action and impact while preserving a balanced five-part circle.

The center should continue to display the user image if that is part of the current design. The overall score should appear clearly near or inside the center area without obscuring the profile photo.

Each segment must show:

- category name,
- category score or `—`,
- category icon,
- selected state,
- accessible label.

Example accessibility label:

```text
Performance, score 81 out of 100, high confidence
```

Tapping a segment must:

- select the category,
- visually highlight the segment,
- scroll to or open the corresponding category details,
- preserve keyboard and screen-reader access on web,
- preserve touch accessibility on mobile.

## 9.3 Category Summary Cards

Below the circle, display five cards:

```text
Learning
Experience
Skills
Performance
Contributions
```

Each card should contain:

- current category score,
- score confidence,
- number of supporting records,
- number of verified records,
- short explanation,
- primary action,
- link to full breakdown.

Examples:

```text
Learning
71 / 100
High confidence
8 verified records
View Learning Details
```

```text
Performance
Not yet scored
Complete your first assignment to establish this score.
Browse Assignments
```

## 9.4 Detailed Metric Breakdown

Selecting a category should reveal its detailed metrics.

### Learning breakdown

```text
Education
Qualifications
Training
Assessments
Continuing Learning
```

### Experience breakdown

```text
Professional
Projects
Leadership
Community
Other Relevant Experience
```

### Skills breakdown

```text
Top Skills
Assessed Skills
Verified Skills
Recently Demonstrated
Needs Evidence
```

### Performance breakdown

```text
Engagement
Activity
Reliability
Accomplishment
Ratings
```

### Contributions breakdown

```text
Recent Contributions
Verified Contributions
Impact
Collaboration
Beneficiaries
Ratings
```

## 9.5 Evidence and Validation

Rename the existing endorsement-only area to:

```text
Evidence & Validation
```

Display:

```text
Evidence items
Verified evidence
Ratings
Endorsements
Institutional confirmations
Disputed items
```

Primary actions:

```text
Add Evidence
Request Verification
Request Endorsement
```

Endorsement must not be the only or dominant action.

## 9.6 Score History

Add:

```text
Score History
```

Each history item should explain what changed and why.

Example:

```text
Assignment completed on time
Performance: 76 → 78
Overall score: 72.8 → 73.4
```

```text
Professional certificate verified
Learning: 68 → 71
Overall score: 73.4 → 73.9
```

Store and display:

- event date,
- affected category,
- previous value,
- new value,
- effect on overall score,
- reason,
- source record,
- calculation version.

## 9.7 Recommended Next Steps

Add a personalized section:

```text
Strengthen Your Profile
```

Examples:

- Add evidence for two skills.
- Verify an existing qualification.
- Complete an active assignment.
- Record the outcome of a contribution.
- Request a contextual rating from an assignment recipient.
- Confirm an experience record.

Recommendations must encourage meaningful profile completion and participation, not artificial score chasing.

---

## 10. Civizen Domains and Pillars

The five score categories are not the same as Civizen domains or pillars.

The circle on the Score page must represent score categories, not societal domains.

If the application continues to use domains such as Health, Education, Culture, Responsibility, Environment, Community, or Economy, display them in a separate section named:

```text
Activity by Domain
```

or:

```text
Civizen Domains
```

A domain indicates where activity occurred. A score category indicates how that activity is evaluated.

Example:

```text
Domain: Education

Learning: 82
Experience: 74
Skills: 78
Performance: 85
Contributions: 72
```

Do not mix domain names and score category names in the same circle.

---

## 11. Recommended Icons

Use the existing visual language where possible.

Suggested icon mapping:

| Category | Suggested icon concept |
|---|---|
| Learning | graduation cap or open book |
| Experience | timeline, briefcase, or pathway |
| Skills | tools, spark, or capability symbol |
| Performance | checkmark, speedometer, or completed task |
| Contributions | people, hands, community, or impact symbol |

Icons must remain understandable at small sizes and must not rely on color alone.

---

## 12. Color and Visual Behavior

Preserve the existing Civizen dark interface and five-segment circle style.

Requirements:

- retain one distinct accent treatment per category,
- preserve sufficient contrast,
- do not use color as the only means of identification,
- provide selected, hover, focus, pressed, and disabled states,
- support light mode later if the design system includes it,
- keep labels readable on mobile,
- prevent curved labels from colliding with icons or scores,
- test long localized labels even though the English circle labels are single words.

Recommended label display:

```text
Learning
71
```

Do not place full labels such as `Learning & Qualifications` on the circle.

---

## 13. Responsive Layout

## Mobile

Recommended order:

1. page title,
2. score overview,
3. circle,
4. selected category summary,
5. five category cards or compact list,
6. detailed metrics,
7. Evidence & Validation,
8. Score History,
9. Strengthen Your Profile.

The circle must fit without horizontal clipping.

## Tablet and Desktop

Use:

- circle on the left,
- score overview and category summaries on the right,
- full-width detailed sections below.

Maintain the same content and terminology across platforms.

---

## 14. Accessibility Requirements

Implement:

- semantic headings,
- keyboard navigation,
- visible focus indicators,
- screen-reader labels,
- accessible score descriptions,
- non-color indicators,
- minimum touch target sizes,
- sufficient contrast,
- reduced-motion support,
- meaningful empty states,
- correct reading order.

Do not expose only visual curved text without an accessible text equivalent.

---

## 15. Data and API Requirements

The UI should consume a structured score response.

Recommended example:

```ts
interface CivizenScoreResponse {
  userId: string;
  overall: {
    score: number | null;
    stage:
      | 'not_scored'
      | 'building'
      | 'developing'
      | 'established'
      | 'highly_established';
    confidence: ScoreConfidence;
    lastCalculatedAt: string | null;
    calculationVersion: string;
  };
  categories: Array<{
    id: ScoreCategoryId;
    shortLabel: string;
    fullLabel: string;
    score: number | null;
    confidence: ScoreConfidence;
    sourceCount: number;
    verifiedSourceCount: number;
    metrics: Array<{
      id: string;
      label: string;
      value: number | null;
      unit?: string;
      confidence?: ScoreConfidence;
      sourceCount?: number;
    }>;
  }>;
  validation: {
    evidenceCount: number;
    verifiedEvidenceCount: number;
    ratingCount: number;
    endorsementCount: number;
    institutionalConfirmationCount: number;
    disputedItemCount: number;
  };
  nextSteps: Array<{
    id: string;
    label: string;
    actionType: string;
    actionTarget?: string;
    priority: number;
  }>;
}
```

Requirements:

- use `null` for unavailable scores,
- do not convert missing data to zero,
- include calculation version,
- include confidence,
- include source and verification counts,
- support category-level and overall explanations,
- support score history,
- support future metric additions without changing the five circle categories.

---

## 16. Calculation Transparency

Every numerical score should provide an explanation view.

The explanation should show:

- category weights,
- included metrics,
- excluded metrics,
- missing data,
- evidence counts,
- verification status,
- ratings used,
- deductions or penalties,
- last calculation date,
- calculation version.

Avoid unexplained score changes.

Any penalty related to misconduct, fraud, manipulation, abandonment, or confirmed disputes must:

- be based on an explicit rule,
- be auditable,
- be appealable where appropriate,
- not be hidden inside an unrelated category,
- not remain indefinitely without a defined policy.

---

## 17. Migration From the Current Interface

Implement the following changes to the current UI.

### Home page

- Keep the existing card location.
- Replace `0.0` with `Not yet scored` when there is insufficient data.
- Remove `0 total endorsements` as the main score explanation.
- Add stage and confidence.
- Add a compact five-category summary when space permits.
- Rename the button to `View Score Details`.
- Replace the endorsement-only Recent Activity empty state.
- Add profile-building actions.

### Detailed page

- Rename the page to `Civizen Score`.
- Keep the five-segment circle.
- Replace existing circle labels with:
  - Learning
  - Experience
  - Skills
  - Performance
  - Contributions
- Move any existing domain or pillar labels into a separate `Activity by Domain` section.
- Separate stage from numerical score.
- Add score confidence.
- Add category cards.
- Add metric breakdowns.
- Rename the endorsement area to `Evidence & Validation`.
- Add Score History.
- Add Strengthen Your Profile.
- Ensure endorsements are a supporting mechanism, not the entire scoring model.

---

## 18. Implementation Sequence

Recommended implementation order:

1. Define the five category IDs and display labels.
2. Update score data models to support nullable scores and confidence.
3. Create configurable category weights.
4. Build or update the score calculation service.
5. Add detailed metric group structures.
6. Update the Home score card.
7. Update the circle labels and category selection behavior.
8. Add category summary cards.
9. Add Evidence & Validation.
10. Add Score History.
11. Add Strengthen Your Profile.
12. Move domains or pillars out of the score circle.
13. Add accessibility behavior.
14. Add responsive layouts.
15. Add tests.
16. Seed representative demo profiles.
17. Review the interface with real data before finalizing weights.

---

## 19. Required Test Profiles

Create at least the following test cases:

### Profile A: New user

- no score,
- no records,
- no ratings,
- no endorsements.

Expected:

```text
Not yet scored
Stage: Building
Confidence: Insufficient
```

### Profile B: Education-heavy profile

- strong Learning,
- some Experience,
- some Skills,
- no assignments,
- no Contributions.

Expected:

- Performance is not scored,
- Contributions is not scored,
- no missing category is silently treated as zero,
- overall score follows the configured insufficient-data policy.

### Profile C: Active contributor

- moderate Learning,
- strong Skills,
- strong Performance,
- strong Contributions,
- extensive verified evidence.

Expected:

- complete five-category circle,
- high confidence,
- detailed activity and score history.

### Profile D: Experienced but unverified

- high self-declared Experience,
- several Skills,
- little verification.

Expected:

- preliminary category values where policy permits,
- low confidence,
- clear verification recommendations.

### Profile E: Assignment reliability problem

- high assignment acceptance,
- low completion,
- late deliveries,
- mixed ratings.

Expected:

- acceptance alone does not create a high Performance score,
- Reliability and Accomplishment reduce the category score,
- the explanation identifies the contributing metrics.

### Profile F: High quantity, low impact

- many minor contributions,
- low verification,
- limited measurable outcomes.

Expected:

- quantity uses diminishing returns,
- Contributions does not become artificially high.

---

## 20. Acceptance Criteria

Implementation is complete when:

- the existing five-segment circle is preserved,
- the circle uses the single-word labels Learning, Experience, Skills, Performance, and Contributions,
- the overall score is based on all five categories,
- education is included under Learning,
- assignment acceptance, quantity, completion, on-time performance, and accomplishment are included under Performance,
- user ratings affect the relevant context rather than acting as an unrestricted person rating,
- Contributions includes quantity, quality, and impact,
- ratings, endorsements, evidence, and verification are represented as cross-cutting inputs,
- score confidence is separate from the numerical score,
- missing scores are not displayed as zero,
- the Home page no longer implies endorsements alone determine the score,
- the detailed page includes category summaries and metric breakdowns,
- domains or pillars are separated from score categories,
- score changes are explainable,
- the layout works on mobile, tablet, and desktop,
- accessibility requirements are met,
- automated tests cover the required profile states.

---

## 21. Final Approved Circle Labels

Use exactly these English labels on the five circle segments:

```text
Learning
Experience
Skills
Performance
Contributions
```

Use the longer labels only outside the circle:

```text
Learning & Qualifications
Experience
Skills
Performance & Reliability
Contributions & Impact
```
