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

草稿箱回读是上述闭环的窄分支：只学习用户修改后的表达与节奏，服务于风格画像；不自动修稿、不学习排版，也不触发平台规则或流程技能迭代。用户另行明确提出修改或流程反馈时，才应用下文的通用路由。

The goal is not to make one draft endlessly revise itself. The goal is to make the next run start with better taste, constraints, and examples.

## When To Run

Run this loop when any of these happen:

- the user gives direct feedback such as "这里不对", "不像我", "改成这样", "这个标题不行"
- the user edits a draft and explains the reason
- a WeChat draft-box style sample differs in wording or sentence/paragraph breaks from the saved uploaded text baseline
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
| `platform-fit` | WeChat mobile reading and visual package, from explicit user feedback | relevant workflow or skill, plus case library |
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
- downstream surface affected: draft, critique, style rewrite, final draft, WeChat
- confidence: `high`, `medium`, or `low`

Use `high` only when the user explicitly explains the reason, or when a reviewed-source diff clearly repeats a known preference. Use `medium` when the inference is plausible but not stated. Use `low` only for notes that should not update rules yet.

## Decision Rules

### Update The Current Artifact

Always fix the current draft first when the user is asking for a revision. Do not stop at documenting the feedback.

### Update The Style Profile

Update `docs/references/style-profile.md` when the learning changes the author's durable voice, title preference, opening/ending style, paragraph rhythm, or recurring anti-AI pattern.

Keep the rule general enough to reuse, but concrete enough to act on. Avoid vague entries like "更有人味" or "更高级".

改写画像中最近的现役条款并移除被替代说法，不追加迭代日志。来源、前后对照、适用边界和置信度放在案例库。

### Update The Case Library

Update `docs/references/content-feedback-library.md` when the feedback is best understood through examples:

- accepted vs rejected title directions
- before/after opening patterns
- structural changes that are hard to express as a single rule
- platform-specific edits from explicit WeChat review feedback
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

## 草稿箱回读：仅用于风格画像

1. 用户表示手动编辑完成后，按对应 `draft_media_id` 读取远端正文。确认结果 `fetch_mode=remote`、`purpose=style-feedback-only`；`dry-run/` 模拟结果不能用于学习。
2. 以脚本返回的 `style_feedback_baseline_path`（上传时文本）对比 `style_feedback_source_path`（修改后文本）。两份文本使用相同抽取规则，避免把上传时自动断句或分段当成人工偏好；不直接拿排版前的 `05_最终稿` 做风格差异基线。`baseline_status` 不是 `available` 时，报告缺少或不匹配的上传记录，不推断哪些改动出自用户。
3. 只看修改后的表述、用词、标点、断句、分段、语气和阅读节奏。不审查字体、颜色、加粗、引用框、列表或表格样式、图片位置、分割线和固定尾注。上传自动小标题和其他自动呈现不进入风格结论；用户改写标题时可以观察措辞，不据此改变正文结构规则。
4. 将可复用偏好归纳到 `docs/references/style-profile.md` 的现役条款。必要的前后对照、来源和置信度放在案例库，仅作画像证据。无可靠差异则不更新画像；原因不明的单篇变化不升级为长期规则。
5. 简短报告学到的表达偏好和落点。回读文件只作学习材料，HTML 只作来源留档；不修改已校准草稿、不生成下游发布源、不更新配图或排版规则。回读失败只暂停风格学习，不阻塞公众号生产流程。

## Output Format

When reporting a completed feedback-loop pass, include:

- current artifact changed or not changed
- durable update destination
- 1-3 learned rules or cases
- any skill/workflow change made
- anything intentionally not persisted

Keep this report short. The user should be able to see what the system learned without reading every file.
