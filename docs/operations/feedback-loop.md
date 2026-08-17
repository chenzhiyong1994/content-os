# Feedback Loop

## Purpose

Turn human review into reusable project knowledge.

This project should not run creative work in an unattended loop. Most quality signals for writing, titles, rhythm, taste, and platform fit come from the user's review. The loop here is:

```text
draft or published-source
-> human review
-> structured feedback
-> current revision
-> reusable rule, case, or skill update
```

The goal is not to make one draft endlessly revise itself. The goal is to make the next run start with better taste, constraints, and examples.

## When To Run

Run this loop when any of these happen:

- the user gives direct feedback such as "这里不对", "不像我", "改成这样", "这个标题不行"
- the user edits a draft and explains the reason
- a WeChat draft-box reviewed source differs materially from the uploaded `05_最终稿`
- the same issue appears across multiple content runs
- the user asks to summarize what should be learned from a review

Do not run this loop for:

- pure WeChat HTML, divider, footer, image, or typography noise
- headings automatically inserted by WeChat upload typesetting
- one-off factual corrections that do not imply a reusable writing or workflow rule
- temporary preferences explicitly limited to the current article

## Feedback Intake

Before updating any long-term file, classify the feedback.

| Type | Meaning | Primary Destination |
| --- | --- | --- |
| `style` | author voice, wording, rhythm, title feel, opening, ending, section labels | `docs/references/style-profile.md` |
| `content-logic` | argument spine, evidence use, missing context, wrong emphasis | `docs/references/content-feedback-library.md` |
| `platform-fit` | WeChat reading rhythm, Xiaohongshu adaptation, mobile scanning, visual package | relevant workflow or skill, plus case library |
| `workflow` | wrong stage order, missing gate, bad handoff, missing validation | `docs/operations/workflow-rules.md` or relevant skill |
| `anti-pattern` | repeated AI smell, fake scene, empty transition, overused title pattern | `style-profile.md`, critique skill, or case library |
| `one-off` | only applies to the current article | current artifact only; do not update long-term docs |

If a piece of feedback fits more than one type, choose the narrowest durable destination first. Do not duplicate the same learning across many files unless each destination needs a different operational rule.

## Evidence Standard

Every durable update should preserve enough evidence to make the rule auditable later:

- source article or stage
- feedback source: user comment, manual edit, or reviewed-source diff
- before/after excerpt or concise diff summary
- inferred rule
- applicable content type: `深度文`, `实用文`, or both
- downstream surface affected: draft, critique, style rewrite, final draft, WeChat, Xiaohongshu
- confidence: `high`, `medium`, or `low`

Use `high` only when the user explicitly explains the reason, or when a reviewed-source diff clearly repeats a known preference. Use `medium` when the inference is plausible but not stated. Use `low` only for notes that should not update rules yet.

## Decision Rules

### Update The Current Artifact

Always fix the current draft first when the user is asking for a revision. Do not stop at documenting the feedback.

### Update The Style Profile

Update `docs/references/style-profile.md` when the learning changes the author's durable voice, title preference, opening/ending style, paragraph rhythm, or recurring anti-AI pattern.

Keep the rule general enough to reuse, but concrete enough to act on. Avoid vague entries like "更有人味" or "更高级".

### Update The Case Library

Update `docs/references/content-feedback-library.md` when the feedback is best understood through examples:

- accepted vs rejected title directions
- before/after opening patterns
- structural changes that are hard to express as a single rule
- platform-specific edits from WeChat or Xiaohongshu review
- low-confidence observations that need more samples

### Propose A Skill Change

Change a skill or workflow rule only when one of these is true:

- the same issue appears at least twice across separate runs
- the issue is severe enough that future runs should be blocked or routed differently
- the current skill caused the problem by asking for the wrong output
- the user explicitly asks to change the process

When changing a skill, keep the edit narrow and mention it in the final response.

### Do Not Overfit

Do not treat one article's tactical edit as a permanent rule unless the user's reason is clear.

Examples:

- "This title is better for this public outrage topic" can become a case.
- "All future titles must use this structure" is overfitting unless repeated or explicitly requested.
- "This article should be shorter" is not automatically a global brevity rule.

## Reviewed-Source Diff Handling

When feedback comes from WeChat draft-box manual edits:

1. Compare uploaded `05_最终稿` with `reviewed-source/reviewed-source.md`.
2. Ignore fixed footer, WeChat divider styles, HTML conversion artifacts, image placement noise, and automatic paragraph wrapping.
   Also ignore headings automatically inserted by upload typesetting. If the user manually rewrites a draft-box heading, classify it as `platform-fit`; do not promote it into body-writing rules.
3. Extract only substantive changes: title, opening, deleted explanation chains, new emphasis, structure, section labels, ending, and tone shifts.
4. Classify each substantive change using the intake table.
5. Update the current downstream source first.
6. Update durable docs only for changes that reveal reusable preference.

## Output Format

When reporting a completed feedback-loop pass, include:

- current artifact changed or not changed
- durable update destination
- 1-3 learned rules or cases
- any skill/workflow change made
- anything intentionally not persisted

Keep this report short. The user should be able to see what the system learned without reading every file.
