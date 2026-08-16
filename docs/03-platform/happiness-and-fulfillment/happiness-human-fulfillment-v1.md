# Civizen Happiness & Human Fulfillment
## Product Architecture and Implementation Specification

**Status:** Implemented (Happiness Foundation through Human Outcome & System Learning Loop).  
**Scope:** Happiness & Human Fulfillment, including Work Fulfillment & Occupational Fit, privacy-safe aggregates, Wellbeing Insights, and Human Outcome Reviews.  
**Parent capability:** Happiness & Human Fulfillment  
**Distinct subunit:** Work Fulfillment & Occupational Fit  
**Out of scope here:** public city/country rankings, organization league tables, employee ranking, sensitive-demographic dashboards, automatic Challenges/Governance, causal effectiveness claims, Happiness impact scores.

---

## 1. Purpose

Civizen should not treat happiness as a decorative metric or a public score.

The purpose of the Happiness & Human Fulfillment capability is to help people understand how well their lives are going, identify the conditions that are increasing or reducing their wellbeing, and connect them with practical ways to improve those conditions.

The system should answer four questions:

1. **How am I doing?**
2. **What is affecting how I am doing?**
3. **What can improve it?**
4. **Did the change actually help?**

The system should be private by default, simple by default, and actionable rather than merely descriptive.

---

## 2. Architectural Decision

Create:

### Happiness & Human Fulfillment

The parent unit responsible for:

- personal happiness and wellbeing monitoring;
- life-domain assessment;
- trend detection;
- root-cause identification;
- personalized improvement support;
- follow-up and outcome measurement;
- privacy-protected population insights.

Within it, create a distinct subunit:

### Work Fulfillment & Occupational Fit

Responsible for:

- current-work satisfaction;
- task-level enjoyment and frustration;
- occupational fit;
- workplace/environment fit;
- role redesign;
- career exploration;
- trial opportunities;
- learning/reskilling pathways;
- work-transition support;
- post-transition follow-up.

Work Fulfillment contributes to the broader Happiness Profile, but it must retain its own data model, assessments, recommendations, intervention workflows, and longitudinal outcomes.

---

## Implementation Status

This document is the architecture of the **current implemented system**. Later numbered sections that mention Phase 1–5 are build history — how the capability was assembled — not a member-facing product roadmap. There is no Phase 6 and no next feature phase planned from this document. Future change should come from pilot evidence, privacy/security findings, research requirements, or integration needs.

### Implemented

- Happiness Foundation — Implemented (adaptive check-in: multiple areas, supports vs problems, specific causes; today’s feeling stays distinct from Happiness & Fulfillment level)
- Work Fulfillment & Occupational Fit — Implemented
- Active Human Fulfillment Support — Implemented
- Privacy-Safe Wellbeing Intelligence — Implemented
- Institutional & Community Wellbeing Insights — Implemented
- Human Outcome & System Learning Loop — Implemented

### Intentionally deferred

- formal scientific evaluation / experimental research design
- live notification delivery (follow-up timing can be stored)
- broad Fulfillment Plan sharing
- provider marketplace
- sensitive-demographic research breakdowns
- population-informed personal recommendations
- city/country or organization league tables
- public Happiness profiles
- causal effectiveness claims and Happiness impact scores

Live aggregate thresholds are the versioned policy `wellbeing-aggregate-privacy-v1`. Compatibility tables and operator notes are in **§25**.

### Public-safe vs internet-public

**Public-safe** means a lesson was reviewed and intentionally published without restricted aggregate payloads or member identities. `human_outcome_public_lessons` are readable by signed-in Civizen members (`authenticated` SELECT). They are not anonymous internet-public, and Search must not expose restricted snapshots or private Happiness rows.

---

## 3. Do Not Use a Public Numeric Happiness Score

Civizen should **not show people a 0–100 happiness score**.

Instead, expose a five-level model.

### Recommended five public levels

1. **Struggling**
   - Wellbeing appears substantially under pressure.
   - The interface should be supportive and practical, not alarming or judgmental.

2. **Unsettled**
   - Important parts of life are not working well or feel unstable.
   - The system should help identify the main sources.

3. **Balanced**
   - Overall life experience is mixed but reasonably stable.
   - Some areas are going well, while others may need attention.

4. **Flourishing**
   - Most important areas of life are going well.
   - The person reports generally positive wellbeing, meaning, and stability.

5. **Thriving**
   - Wellbeing is consistently strong across major areas of life.
   - The person reports high life satisfaction, positive functioning, and strong fulfillment.

### Important rule

These are **states, not identities**.

Never write:

- “You are Struggling.”
- “You are a Thriving person.”

Prefer:

- “Your current happiness level is Struggling.”
- “Your recent wellbeing appears to be Flourishing.”
- “Your level has moved from Balanced to Flourishing.”

### Internal measurement

The system may retain higher-resolution internal values for:

- aggregation;
- trend detection;
- confidence estimates;
- change detection;
- research;
- threshold mapping.

These internal values must not be presented as a person's public or reputational “happiness score.”

---

## 4. Happiness Profile

The Happiness Profile should remain multidimensional even though the primary public result uses five levels.

### Core domains

1. **Life Satisfaction**
2. **Emotional Wellbeing**
3. **Meaning & Purpose**
4. **Relationships & Belonging**
5. **Health & Vitality**
6. **Autonomy & Freedom**
7. **Security & Stability**
8. **Time & Life Balance**
9. **Environment & Community**
10. **Work / Occupation Fulfillment**

Each domain should also use human-readable levels rather than public numeric scoring where practical.

Example:

- Life Satisfaction — Flourishing
- Relationships — Thriving
- Health & Vitality — Balanced
- Time & Life Balance — Unsettled
- Work Fulfillment — Struggling

This is more useful than a single composite number because Civizen can identify what is actually driving the person's experience.

---

## 5. Happiness Level Derivation

Do not hard-code a simplistic arithmetic average and present it as scientific truth.

Use a versioned calculation framework. The current working model is **`happiness-level-v1`**. It can be replaced by a later version. Historic snapshots store `model_version` so a later formula does not silently rewrite those records. Do not describe this model as scientifically final.

### Working derivation

The system may internally normalize answers into a fine-grained scale and derive:

- each domain state;
- overall state;
- recent direction;
- confidence / data sufficiency.

### Overall level should consider

- life evaluation;
- recent emotional experience;
- meaning / purpose;
- important life-domain satisfaction;
- severity of strongly negative domains;
- consistency across recent observations;
- recency of observations.

### Important behavior

One highly distressed domain should not always disappear inside a positive average.

Example:

- most domains Flourishing;
- Work Fulfillment Struggling;
- Time Balance Struggling.

The system might still classify the overall person as Balanced or Flourishing depending on the evidence, but it must prominently identify the two high-priority areas.

### Versioning

Store a `model_version` or equivalent so calculation changes do not silently reinterpret historic records.

---

## 6. Trends Without Numeric Scores

Trend should be shown through:

- **Improving**
- **Stable**
- **Declining**

Optionally:

- “Improving for 3 weeks”
- “Recently moved from Balanced to Flourishing”
- “Work Fulfillment has declined recently”

Do not expose unnecessary decimal precision.

---

## 7. Measurement System

Use multiple levels of participation so the system does not create survey fatigue.

### 7.1 Quick Check-in

Purpose:

- very low-friction monitoring of **today’s feeling**;
- identify what is supporting or reducing happiness, not only one broad area;
- collect specific, reusable causes so Improve, Work Fulfillment, and Plans can act.

Today’s feeling is **not** the member’s Happiness & Fulfillment level. The five-level Happiness state continues to come from the versioned derivation (reviews, pulses, accumulated check-in evidence, Work Fulfillment). A check-in must not collapse to a label such as “Balanced + Work.”

The flow is short by default. Today’s feeling and optional life areas share the first screen. Deeper questions appear only after the member selects areas.

1. **How are you feeling today?** (required) and **What’s affecting this today?** (optional, multi-select) on the first Check in page — Very difficult / Difficult / Okay / Good / Very good, then the existing life areas (Work, Health, Relationships, Money / security, Family, Time, Environment, Purpose, Something else). Members may choose more than one area, or save a feeling only.
2. **For each selected area:** is it mostly helping, making things harder, or both?
3. **Concise follow-up tags** only when needed — the existing cause-tag taxonomy for problems, and a small support-tag list in the same cause groups. Skip is always allowed. Environment and Something else stay area-level only.
4. **Optional note.** If Work is a problem, a compact link to Work Fulfillment is enough; do not run a second work assessment inside check-in.

Check in is available from Overview and from the Check-ins tab. Overview stays a status home; it does not host the check-in form.

Persisted on the existing `happiness_checkins` / `happiness_causes` tables (multiple cause rows per check-in, with polarity). After several check-ins, Overview can explain what within an area appears to be affecting the member (for example Work — tasks and workload have often been making things harder) and that it may be worth addressing in Improve.

Feeling-only save remains valid. Target completion: about 15–45 seconds when the member wants depth; a few taps when they do not.

---

### 7.2 Weekly Wellbeing Pulse

Purpose:

- detect meaningful changes across core dimensions;
- remain lightweight.

Use a small rotating set of questions rather than forcing all domains every week.

The system should ensure that all important domains receive enough coverage over time.

---

### 7.3 Monthly Happiness Review

Purpose:

- provide a broader longitudinal view;
- refresh domain-level understanding;
- surface actionable areas.

It should:

- assess all major domains;
- show the current five-level state;
- show domain levels;
- show trend;
- identify strongest areas;
- identify areas needing attention;
- ask whether the person wants help improving anything.

---

### 7.4 Deeper Assessments

Architecture should support validated external instruments without coupling Civizen to one instrument.

Create a generic Assessment Instrument model supporting:

- instrument name;
- version;
- publisher/source;
- license;
- language;
- questions;
- response types;
- scoring logic;
- allowed use;
- interpretation rules;
- references.

Do not reproduce copyrighted/licensed instruments without checking their terms.

---

## 8. “What Is Affecting This?” Root-Cause Layer

Every important negative change should be explorable. Check-in follow-up tags reuse this taxonomy (problems and a small support list in the same groups) rather than a second cause system.

Examples of cause categories:

### Work

- tasks;
- workload;
- manager;
- team;
- schedule;
- commute;
- pay;
- instability;
- lack of autonomy;
- lack of purpose;
- poor fit;
- unsafe environment.

### Health

- physical discomfort;
- sleep;
- energy;
- access to care;
- movement/activity.

### Relationships

- loneliness;
- conflict;
- family pressure;
- lack of belonging.

### Security

- housing;
- money;
- employment instability;
- personal safety.

### Time

- overwork;
- caregiving;
- commute;
- insufficient rest;
- lack of personal time.

### Purpose

- feeling underused;
- lack of contribution;
- lack of progress;
- lack of direction.

The system should support:

- structured tags;
- optional free text;
- user-confirmed causes;
- AI-suggested hypotheses that are clearly marked as suggestions.

AI must not state speculative causes as fact.

---

## 9. Happiness Improvement Engine

The core loop is:

**Measure → Understand → Recommend → Act → Follow up → Learn**

### Recommendation types

- personal action;
- habit or routine;
- learning opportunity;
- contribution opportunity;
- social/community connection;
- health-related resource;
- work redesign;
- work exploration;
- organizational change;
- community challenge;
- governance/system improvement.

### Recommendation quality rules

Recommendations should:

- address a detected or user-selected need;
- explain why they are being suggested;
- allow dismissal;
- allow “not relevant” feedback;
- avoid excessive or repetitive prompting;
- never imply that all unhappiness is an individual responsibility.

### Action plan

Allow the user to choose:

- an area to improve;
- one or more actions;
- desired follow-up timing;
- outcome notes.

Then follow up:

- “Did this help?”
- “A little / Somewhat / A lot / Not at all”
- optional comment.

This creates intervention-outcome learning.

---

## 10. Work Fulfillment & Occupational Fit

This is a distinct subunit, not merely another Happiness question.

### Objective

Help people find and maintain work that fits:

- what they enjoy;
- what they are good at;
- what they value;
- how they like to work;
- how they want to live;
- what gives them meaning.

### Core Work Fulfillment Profile

Capture:

#### Enjoyment

- activities enjoyed;
- tasks enjoyed;
- activities disliked;
- tasks consistently avoided or draining.

#### Capabilities

Use existing Civizen:

- Skills;
- Experience;
- Contributions;
- demonstrated work;
- assessments where relevant.

#### Values

Examples:

- creativity;
- service;
- learning;
- independence;
- stability;
- income;
- impact;
- mastery;
- leadership;
- exploration.

#### Work environment preferences

- individual vs team;
- quiet vs active;
- remote vs on-site;
- structured vs flexible;
- predictable vs changing;
- indoor vs outdoor;
- public-facing vs independent;
- high collaboration vs deep focus.

#### Autonomy

- desired control over methods;
- schedule;
- task selection;
- decision-making.

#### Lifestyle fit

- schedule;
- commute;
- location;
- physical demands;
- family/care responsibilities;
- income/security requirements.

#### Purpose fit

- whether the work feels meaningful;
- whether abilities are being used;
- whether the person sees value in the result.

---

## 11. Work Joy Monitor

The Work Joy Monitor should capture actual lived experience instead of relying only on one-time career assessments.

Example:

**How did today's work feel?**

- Draining
- Mostly unpleasant
- Neutral
- Enjoyable
- Energizing

Optional:

- “What were you doing?”
- task/activity tag;
- project;
- team/context;
- free-text note.

Over time, Civizen can identify:

- activities repeatedly associated with enjoyment;
- activities repeatedly associated with frustration;
- environmental conditions correlated with higher fulfillment;
- mismatch between title and actual task experience.

This should inform recommendations but not make irreversible decisions automatically.

---

## 12. Work Intervention Ladder

Low Work Fulfillment should not automatically trigger “find a new career.”

Use this ladder:

1. **Understand the problem**
2. **Improve the current role**
3. **Redesign tasks**
4. **Adjust workload or schedule**
5. **Change team or environment**
6. **Explore adjacent roles**
7. **Try alternative work through a project/contribution**
8. **Learn or reskill**
9. **Transition to a new role/occupation**
10. **Monitor post-transition fulfillment**

This reduces unnecessary disruption and acknowledges that dissatisfaction may be caused by the environment rather than the profession.

---

## 13. Integration With Existing Civizen Capabilities

### Study

If the user wants a different role but lacks skills:

- recommend relevant learning;
- connect learning completion to opportunity exploration.

### Contribute

Use low-risk contribution opportunities to let people try activities before making a career change.

Example:

- person may enjoy teaching;
- suggest mentoring or training contribution;
- use their feedback afterward to improve Work Fit understanding.

### Opportunities

Use Work Fulfillment Profile as one signal for optional opportunity matching.

Do not expose private wellbeing information to opportunity publishers.

### Skills / Experience / Contributions

These help determine realistic fit and pathways.

Happiness state itself must not become a reputation signal.

### Community Challenges

If multiple people identify the same systemic problem:

- excessive commute;
- unsafe workplace;
- lack of childcare;
- local isolation;
- poor public space;

privacy-safe aggregated evidence may inform a Community Challenge.

### Governance Solutions

Large-scale recurring wellbeing problems may become evidence for policy/system proposals.

---

## 14. Privacy and Ethical Rules

These rules are non-negotiable.

### Private by default

Individual:

- Happiness Level;
- domain states;
- check-ins;
- work satisfaction;
- emotional notes;
- causes;
- recommendations;
- intervention history;

must be private by default.

### Never use individual happiness data for

- Civizen Score;
- public reputation;
- trust ranking;
- governance voting power;
- employment ranking;
- hiring eligibility;
- insurance decisions;
- credit decisions;
- access to rights or services;
- disciplinary decisions.

### Organizational access

Employers or organizations must never receive identifiable individual wellbeing profiles by default.

Only privacy-protected aggregated insights may be made available when sufficient participation exists.

### Minimum cohort thresholds

Do not display group-level wellbeing statistics for very small cohorts.

Exact thresholds should be configurable and privacy-reviewed before institutional deployment.

### User control

Users should be able to:

- see what has been collected;
- correct it;
- delete appropriate data;
- disable check-ins;
- stop recommendations;
- control optional sharing;
- opt into or withdraw from privacy-protected aggregate wellbeing participation (separate from optional sharing, Job Fit, employer access, and Civi).

### AI behavior

AI may:

- summarize patterns;
- suggest possible causes;
- suggest practical next steps.

AI must not:

- diagnose medical or mental-health conditions from happiness data;
- claim causality without sufficient evidence;
- pressure a person to make a job or life change;
- expose private wellbeing information.

---

## 15. Population and Institutional Insights

Phase 4A is the privacy-safe foundation. Phase 4B Wellbeing Insights consume it for authorized operational insight UI.

Do not treat Phase 4A aggregates as scientific findings, public rankings, or employer access to individuals.

See §19 for the implemented architecture.

The purpose is to improve systems, not rank populations.

---

## 16. Phase 1 — Happiness Foundation

### Build now

1. Happiness & Human Fulfillment entry point
2. My Happiness page
3. Five-level Happiness state
4. Overall trend
5. Ten-domain Happiness Profile
6. Quick Check-in
7. Weekly Pulse infrastructure
8. Monthly Review infrastructure
9. cause tagging
10. history/trends
11. basic personalized insights
12. user-selected improvement area
13. lightweight intervention/action record
14. follow-up outcome record
15. privacy controls
16. assessment instrument architecture
17. Work Fulfillment domain models (later built as the live `/happiness/work` workspace)
18. integration hooks for Study, Contribute and Opportunities

### Do not build yet

- employer dashboards;
- city/country rankings;
- public happiness profiles;
- predictive job matching;
- automatic career-changing recommendations;
- clinical mental-health diagnosis;
- complex AI causal inference;
- unsuppressed cross-user analytics of private Happiness rows (privacy-safe aggregates are implemented separately);
- wellbeing-based governance or reputation logic.

---

## 17. Phase 2 — Work Fulfillment & Occupational Fit

Build:

1. Work Fulfillment page
2. current-work assessment
3. Work Joy Monitor
4. task preference history
5. environment preference profile
6. values profile
7. autonomy and schedule preferences
8. current-role diagnosis
9. intervention ladder
10. role-redesign suggestions
11. adjacent-role exploration
12. trial-through-Contribute workflow
13. learning/reskilling connection
14. Opportunity Fit model
15. post-transition follow-up

---

## 18. Phase 3 — Active Human Fulfillment Support

**Status:** implemented (working product, 2026-08-15; acceptance pass closed the remaining Phase 3 gaps below)

Phase 3 organizes Phase 1 improvement actions into private **Fulfillment Plans** under Happiness **Improve**. The operating loop is Understand → Plan → Try → Support → Follow up → Learn → Adapt. This is not generic AI life coaching, therapy, or a diagnostic system.

### Fulfillment Plans

A plan belongs to the member and is owner-only (RLS via `happiness_owns_profile`). It connects one Happiness domain, a member-defined concern, a desired outcome (free text, not a numeric goal), contributing factors with distinct certainty (`member_confirmed` / `observed_pattern` / `hypothesis`), chosen actions (reusing `happiness_actions`), support options, follow-ups, and qualitative progress.

Statuses: Exploring · Active · Paused · Completed · Stopped. Pause and Stop are not treated as failure. Resume returns a paused plan to Active. Progress is qualitative (Exploring, Trying something, Seeing improvement, Needs another approach) — never a percent complete. If a Happiness domain later looks better, copy stays observational (“Your Time & Life Balance has improved since you started this plan”) and never claims “This plan improved your Happiness.” Member **Did this help?** remains the stronger evidence.

Work Fulfillment domain **delegates** to `/happiness/work`. Phase 3 does not duplicate Work diagnosis.

Existing Phase 1/2 action and Work intervention records are not migrated. New Improve actions attach `plan_id` when created from a Plan.

### Recommendation engine

Versioned library `fulfillment-library-v1` and model `fulfillment-recommendation-v1` live in `src/lib/happiness/fulfillment/`. UI does not hard-code dozens of suggestions. Ranking is explainable (domain, confirmed vs observed vs hypothesis, smallest useful next step, prior helpfulness, human support, system/community constraint). Each recommendation can answer **Why am I seeing this?**

Feedback persists: **Not relevant**, **Tried before**, **Not now**, **Save for later**. Not relevant is not immediately re-shown on later plans. Not now hides the item in the current list only. Tried before hides it in the current list and may lower rank later. Save for later is omitted from the default three and remains discoverable on Improve. Previously helpful interventions may be ranked higher with cautious copy (“This kind of action helped you before”), never “This will work.” Previously unhelpful interventions are not blindly promoted.

### Marketplace Jobs vs Contribute vs Study

Architectural distinction (do not collapse):

- **Work Fulfillment** — understand fit, improve current work, explore alternatives, guide transitions (`/happiness/work`).
- **Contribute / Opportunities** — try activities, participate, gain experience (**Contribution Fit**).
- **Study** — learn/reskill where capability gaps exist.
- **Marketplace → Jobs** — actual employment and employer/job matching (**Job Fit**) at `/market?section=jobs`.

When a pathway reaches seeking actual employment, the destination is Marketplace Jobs, not merely Contribute Opportunities. Members may **intentionally** carry **approved/shareable** Work Fit preferences into Jobs (role/type, location, remote/on-site, schedule). Private Happiness Level, Work Joy, dissatisfaction, employer/manager/team concerns, notes, diagnoses, intervention history, and follow-ups never transfer. There is no public numeric Job Fit score.

### Human support

Support options are library records (friend/family, mentor, professional, Study, Contribute, Work Fulfillment, Marketplace Jobs, Community Challenges, Governance Solutions). Civizen does not assume a provider marketplace. Health/emotional language stays wellbeing-oriented; no diagnosis, therapy claim, or medication advice. Community Challenges and Governance Solutions are never auto-published from a private plan; the member must open that path.

### Civi

Minimum clean integration: the Plan detail shows a grounded brief with **What you said**, **What Civizen observed**, and **Suggestions (not facts)**, plus a link to Messaging (`/messaging`). Civi must not diagnose, invent prior actions or causes, or leak private Plan data outside the authorized Happiness context. Broader assistant architecture was not redesigned. Plan follow-up cadence (none / weekly / chosen date / later) is stored; notification delivery is not live.

A member can remove one Plan (plan-specific private records) without deleting unrelated check-ins or Work Fulfillment. Delete-all Happiness data still clears Phase 3 Plan tables together with Phase 1/2 Happiness and Work data.

### Schema

`fulfillment_plans`, `fulfillment_plan_factors`, `fulfillment_plan_interventions`, `fulfillment_plan_support`, `fulfillment_recommendation_feedback`, `fulfillment_plan_outcomes`. `happiness_actions` gained `plan_id`, `status`, `intervention_key`, and version metadata.

### Out of scope (unchanged)

No employer dashboards, population analytics, public rankings, Score coupling, automatic Challenges/governance, broad Plan sharing, or clinical triage. Dashboards belong to Phase 4B. Phase 4A is the privacy/aggregation foundation only.

---

## 19. Phase 4 — Institutional and Community Insights

Phase 4 answers a different question from Phases 1–3:

> When many people are experiencing similar problems, is there evidence that the surrounding system, institution, workplace, community, or environment may need improvement?

**Core rule:** aggregate insight must never become a back door to individual Happiness surveillance.

### 19.1 Phase 4A vs Phase 4B

**Phase 4A (implemented):** privacy architecture, participation/consent, eligibility, aggregation service, cohort and small-cell suppression, dimension registry, query restrictions, audit, provenance, systemic-issue candidates, tests. Member UI is the Happiness Privacy participation control.

**Phase 4B (implemented):** authorized-viewer **Wellbeing Insights** at `/wellbeing-insights` (Overview · Patterns · Action). It consumes only Phase 4A snapshots, systemic candidates, and `getWellbeingAggregate`. There is no Organization or Community Happiness Score, no ranking, no participant list, and no automatic Challenge or Governance publication.

### 19.2 Private vs aggregate data

Individual Happiness & Fulfillment records remain **private by default** (levels, domain states, check-ins, notes, causes, plans, Work Joy, recommendations, outcomes, Civi private summaries). Organizations do not receive individual rows because a member belongs to them.

Aggregate intelligence is a **separate layer**:

Private member record → participation/eligibility → safe structured derivation → aggregation → suppression → approved insight.

Phase 4B must call `getWellbeingAggregate` / `get_wellbeing_aggregate`. It must not query `happiness_checkins`, `fulfillment_plans`, `work_joy_entries`, or other private tables.

Structured signals only. No free-text notes, Civi transcripts, or private action descriptions.

### 19.3 Participation and withdrawal

Default: **private use only**. Aggregate participation is optional, reversible, and separate from optional sharing, Job Fit, employer access, Civi, and public profile.

Copy must not imply that an employer can see the member’s Happiness. Prefer **privacy-protected aggregate insights**, not “completely anonymous”.

**Withdrawal (v1):** records stop contributing to **newly generated** aggregates. Historic privacy-safe snapshots are **not automatically rewritten**. Private source records stay under existing Happiness settings.

Organization/community insight exists only when the **approved scope is enabled**, members participate, the effective cohort qualifies, and an authorized viewer exists. Membership alone is not enough.

### 19.4 Privacy policy `wellbeing-aggregate-privacy-v1`

Working parameters (provisional, not legally or scientifically final):

- Minimum **effective** cohort: **25** participating members with relevant observations (not nominal membership)
- Small-cell minimum: **5**; tiny cells are grouped/suppressed, not returned as exact counts
- Exact participation counts are not returned; use bands (`insufficient` / `sufficient` / `broad`)
- Max extra dimensions besides required time (scope is the cohort entity, not a filter): **2**
- Time buckets: `month` | `quarter` | `rolling_6_weeks`. Reject day/week
- Geography: `city` | `region` | `community`. Reject street/building/GPS/tiny neighborhood
- Prohibited by default: race, ethnicity, religion, political affiliation, sexual orientation, medical/disability, immigration status, and similar
- Research-only until a future framework: age group, gender
- Query budget: 8 per scope in the recent-query window; overlapping/subset slices restricted
- Approved stable cohorts only (registered organization, community, program, city/region, approved large team)

Centralized in `src/lib/happiness/aggregate/policy.ts` and `wellbeing_aggregate_policies`. Do not hard-code thresholds in UI.

### 19.5 Aggregation model `wellbeing-aggregate-v1`

Versioned separately from the privacy policy. Insights use cautious, non-causal language. No public Organization/Community Happiness Score. No employee ranking, disciplinary, promotion, or hiring use. No Civizen Score coupling.

Intervention outcomes may later say that positive helpfulness was commonly reported among qualifying participants who tried a **broad** intervention type. Do not claim “Intervention X improves Happiness by 32%.”

### 19.6 Systemic pattern model `systemic-pattern-v1`

A **Systemic Issue Candidate** is a recurring privacy-safe pattern (Observing → Emerging → Established pattern → Needs review → Archived). v1 requires **3** qualifying periods for Established. Evidence references aggregate snapshots, never private rows.

Must **not** auto-create Community Challenges, Governance Solutions, public posts, or complaints.

### 19.7 Phase 4B service contract

```
getWellbeingAggregate(query, requesterContext) →
  privacy-safe insight | suppressed result with a safe reason
```

The service validates authorization, approved scope, allowed dimensions, participation, effective cohort, small cells, overlap/query budget, then returns only privacy-safe output and writes audit metadata (requester, scope, broad query, suppression, policy/model versions). It does not log raw private wellbeing data.

Suppression reasons include: insufficient participation, cohort too small, combination too specific, not enough observations, time period too narrow, dimension/geography not permitted, unauthorized, scope not enabled, similar slice restricted, query budget exceeded.

Frontend hiding is not a privacy control.

### 19.8 Phase 4B Wellbeing Insights

Authorized organization and community viewers use **Wellbeing Insights** (`/wellbeing-insights?scope=&section=overview|patterns|action`) to understand qualifying group conditions.

**Viewer roles:** only `wellbeing_aggregate_scopes.viewer_profile_ids` (Phase 4A `can_view_scope`). Ordinary members, anonymous users, and unauthorized organization members do not receive the insight surface.

**Overview** answers “what should I know right now?” with a small set of privacy-safe signals: Going well, Needs attention, Emerging patterns, Recent movement (Improving / Stable / Declining). Opening a domain shows current condition, trend, associated structured factors, cautious problem kind, sufficiency, and caveats.

**Patterns** groups systemic candidates by Phase 4A status: Emerging, Established (`established_pattern` / `needs_review`), Monitoring (`observing`). Evidence references aggregate snapshots only.

**Action** is deliberate: Investigate further, Continue monitoring, view/link an existing Challenge or Governance effort, or open a **draft** Community Challenge / Governance Solution. Nothing auto-publishes. Handoff copy is aggregate-safe and states that evidence does not identify members and does not establish causation.

**Suppression UX** is a valid product state: “Not enough qualifying information yet” with the safe reason from Phase 4A. No exact low counts, no charts of hidden cells, no UI override, no suggestion to lower privacy requirements.

**Civi** may receive `toCiviInsightContext` (Phase 4A aggregate context plus Overview summaries). If the insight is suppressed or unauthorized, `scopeId` is null and Civi must not reconstruct the missing result from private records (`civiMayReconstructSuppressed() === false`).

**Language:** reported association and member-reported helpfulness, not causal conclusions. Prefer “participating members in this qualifying group,” not “employees have poor work-life balance.”

Phase 4B does not add sensitive-demographic breakdowns, scope league tables, Jobs correlation, Score coupling, or population-driven personal recommendations.

### 19.9 Trusted snapshot generation

Phase 4A generation path:

1. **Collect (privileged):** `collect_wellbeing_structured_signals(scope, period, time_bucket)` — `service_role` only. Reads structured domain states for participating members in an approved scope. Does not return notes, plan text, Work Joy text, or raw profile IDs (opaque `member_key` only for counting).
2. **Derive (trusted engine):** `generateWellbeingAggregateSnapshot` / `applyWellbeingAggregatePrivacy` — applies `wellbeing-aggregate-privacy-v1` (eligibility, dimensions, effective cohort, small cells). There is no raw or unsuppressed mode.
3. **Persist (privileged):** `persist_wellbeing_aggregate_snapshot` — `service_role` only. Stores privacy-safe JSON. `ON CONFLICT DO NOTHING` so historic snapshots are not rewritten.
4. **Read (viewer):** `getWellbeingAggregate` / `get_wellbeing_aggregate` — authenticated scope viewers. Returns stored snapshots or a safe suppression. **Does not accept raw observations and does not SELECT private Happiness tables.** `raw` / `unsuppressed` flags are rejected (`bypass_not_permitted`). Viewers have SELECT on snapshots only — not INSERT/UPDATE/DELETE/TRUNCATE. `wellbeing_aggregate_can_view_scope` is `SECURITY DEFINER` so approved viewers can list their scopes without RLS recursion; it still requires the caller’s profile id to be in `viewer_profile_ids`.

An institutional viewer cannot execute collect/persist (`auth.role()` must be `service_role`; EXECUTE is revoked from `authenticated`). Participation/withdrawal is checked at collect time (`wellbeing_aggregate_participation.enabled`). Withdrawn members stop contributing to newly generated aggregates; already stored snapshots remain.

### 19.10 Civi

Civi may receive `toCiviAggregateContext` / `toCiviInsightContext` (summary, scope, time, sufficiency, caveats, versions, Overview signals). It must not receive names, notes, or individual check-ins to “summarize” an aggregate. If Phase 4A suppressed the request, Civi must not reconstruct it from private Happiness records.

---

## 20. Phase 5 — Human Outcome & System Learning Loop

Phase 5 closes the remaining loop after Phases 1–4B:

**Human experience**  
→ **private measurement**  
→ **privacy-safe collective pattern**  
→ **systemic issue**  
→ **investigation**  
→ **action / intervention**  
→ **Project / implementation**  
→ **operational outcome**  
→ **later wellbeing evidence**  
→ **Human Outcome Review**  
→ **reusable knowledge**  
→ **better future decisions**

Architecture name: **Human Outcome & System Learning Loop**. Coordinator-facing labels: Human Outcome Review, What changed?, Human outcomes, Learn from this. There is no Civilization Score, Humanity Effectiveness Score, or Happiness Impact Score.

### 20.1 Sequence is not causality

Civizen does **not** conclude that a Project increased Happiness because wellbeing improved afterward. Distinguish:

- action occurred;
- operational outcome occurred;
- wellbeing changed afterward (privacy-safe pattern);
- member-reported helpfulness exists (category-level, not Project-proof);
- association is plausible;
- causality established (requires a future formal evaluation/research standard).

The operational product stops before claiming causality.

### 20.2 Integrate existing systems

Human Outcome Reviews link existing entities. They do not duplicate Projects, Challenges, Governance Solutions, Solution Records, wellbeing snapshots, or Happiness assessments.

**Systemic Issue Candidate** → **Wellbeing Insight Review** → **Challenge / Governance / institutional action** → **Project** → **Project Outcome** → **Solution Record** → **Human Outcome Review** → **Knowledge**.

An authorized coordinator must deliberately state that an action is intended to address a wellbeing pattern. Civizen does not infer that every Project affects Happiness.

### 20.3 Evidence

Reviews consume **Phase 4A snapshots only**. Never individual Happiness rows, member identities, Work Joy notes, Fulfillment Plan text, or private check-ins. Baseline and follow-up windows use approved Phase 4A time granularity. If no qualifying baseline exists, show **No qualifying baseline available**. If a follow-up is suppressed, show **Not enough qualifying evidence yet**. Do not weaken privacy thresholds.

Comparison engine: `compareHumanOutcomeEvidence` (`human-outcome-compare-v1`). Evidence classification: `human-outcome-evidence-v1` (Observation, Early association, Repeated association, Supporting reported helpfulness, Evaluated evidence). Levels 1–4 are not causal. Historic reviews retain version metadata.

Operational outcome and human-outcome evidence stay separate. A Project can succeed operationally without clear human-outcome improvement.

### 20.4 Review, publication, and learning

Authorized reviewers record interpretation separately from evidence and conclusion. Causal wording is rejected. Alternative/confounding explanations are first-class. Negative, mixed, and null results are preserved. Human outcomes do not affect Civizen Score, reputation, Jobs, hiring, or governance voting power.

Public-safe lessons require an intentional publication step (`human_outcome_public_lessons`). That means **approved publication for signed-in Civizen members**, not anonymous internet access and not Search exposure of restricted aggregate snapshots. Similar-problem discovery surfaces both improvement and null lessons and must not say the same action will work here.

Civi may summarize operational vs human outcomes, evidence strength, uncertainties, and related lessons. It must not say a Project made people happier, and it must not rewrite a null result into success language.

Formal experimental-study design is out of scope. Metadata may record that evaluation is planned or cite an external research reference, kept distinct from Civizen operational observations.


---

## 21. Suggested UX Structure

### Primary entry

**Happiness & Fulfillment**

### My Happiness

Show:

- current five-level state;
- trend;
- strongest areas;
- areas needing attention;
- latest check-in;
- “Check in”;
- “Review my wellbeing”.

Improve an area lives on the Improve tab. Privacy opens from the lock beside the current Happiness level.

### Details

Tabs or sections:

- Overview
- Life Areas
- Check-ins
- Trends
- Improve

### Work Fulfillment

Live at `/happiness/work`:

- Current Work
- Work Joy
- My Fit
- Improve Current Work
- Explore Alternatives (Contribute / Study / Marketplace → Jobs)

---

## 22. Naming Guidance

Use **Happiness & Human Fulfillment** for the parent unit.

Use **Work Fulfillment & Occupational Fit** in architecture/documentation.

In member-facing navigation, shorter labels may be preferable:

- **Happiness & Fulfillment**
- **Work Fulfillment**

Avoid:

- “Happiness Department” in normal product UI;
- “Mental health score”;
- “Happiness score”;
- “Employee happiness ranking”.

---

## 23. Success Criteria for Phase 1

Phase 1 is successful when a member can:

1. open Happiness & Fulfillment;
2. understand their current state without seeing a numeric happiness score;
3. see which life areas are going well;
4. see which areas need attention;
5. complete a quick check-in;
6. complete a fuller review;
7. see changes over time;
8. identify what is affecting a difficult area;
9. choose one area to improve;
10. receive a small number of relevant suggestions;
11. record an action;
12. later say whether it helped;
13. understand that their data is private;
14. see Work Fulfillment as a meaningful distinct part of the system.

---

## 24. Design Principle

Apply Civizen's existing principle:

> **Simple by default. Detailed by choice. Everywhere.**

The default experience should not resemble a clinical survey, HR system, or analytics dashboard.

A person should first see:

- how life is going;
- what is helping;
- what needs attention;
- what they can do next.

Details, methodology, history, and deeper assessments should be available by choice.

---

## 25. Implementation history notes (2026-08-15)

The capability is live. These notes record what shipped; they are not a future roadmap.

- Entry: Profile menu → **Happiness & Fulfillment** (`/happiness`); Home Score card shows a compact Happiness state icon (no visible label) immediately to the right of the tier label, using the same gap and circular chip as View Score Details. The icon is independent of Civizen Score and the Contributor/Catalyst/Steward tier. Home loads the latest `happiness_state_snapshots.overall_level` only — not the full Happiness workspace.
- Workspace title uses a slow running line only when it does not fit on one line. Privacy is a lock icon beside the current Happiness level on Overview (“This is private to you.” on hover). Tap/click opens `/happiness/privacy`. Overview does not show a Privacy text link or an Improve an area button.
- Five public levels only (no numeric Happiness Score); working model `happiness-level-v1` (provisional, versioned)
- Quick check-in, weekly pulse, monthly review, causes, improvement actions, follow-up
- Privacy controls at `/happiness/privacy` and Settings → Privacy
- Work Fulfillment at `/happiness/work`: Overview · Current · Joy · Fit · Improve; several concurrent contexts with one primary; Contribute/Study/Marketplace Jobs handoff; owner-only RLS. No public Work Fulfillment score.
- Fulfillment Plans under Improve (`fulfillment-library-v1` / `fulfillment-recommendation-v1`)
- Privacy-safe aggregates: `wellbeing-aggregate-privacy-v1`, `wellbeing-aggregate-v1`, `systemic-pattern-v1`. Gate: `npm run verify:wellbeing-aggregate-privacy`
- Wellbeing Insights: `/wellbeing-insights` (Overview · Patterns · Action). Gate: `npm run verify:wellbeing-insights`
- Human Outcome Reviews: `/wellbeing-insights/outcome` (`human-outcome-evidence-v1`, `human-outcome-compare-v1`). Gate: `npm run verify:human-outcome-loop`
- Compatibility: `happiness_privacy_config` remains as a Phase 1 table. It is not granted to `authenticated` or `anon`. Live thresholds live in `wellbeing_aggregate_policies` / `wellbeing-aggregate-privacy-v1`. Do not drop the compatibility table without a dedicated migration.

Do not treat these notes as permission to skip the rules above, claim causality, or query private Happiness rows.