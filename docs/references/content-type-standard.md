# Content Type Standard

## Purpose

Define the two supported article types in the active content workflow so the pipeline can route the same topic through different drafting and style behaviors without changing the stable stage order.

The two supported types are:

- `深度文`
- `实用文`

This document is the source of truth for type selection, routing, and evaluation.

## Shared premise

Both types still belong to the project content scope:

- AI
- technology
- workplace and career

Both types also share these baseline requirements:

- topic must be clear before drafting
- research must be grounded in real sources
- the final piece must sound human rather than synthetic
- the article must match the declared audience and article goal

## Required route metadata

Before the main pipeline starts, declare:

- `内容类型`: `深度文` or `实用文`
- `目标受众`: `上班族` / `普通人` / `管理者`
- `文章目标`: `建立认知` / `立即上手` / `推动流程改造`

This route metadata must travel through the whole run. Downstream stages should not guess the type from the prose.

## Type 1: 深度文

### Primary goal

Help the reader see a situation more clearly.

### Best fit

- topics with strong reality friction
- topics with emotional or structural tension
- topics where the main value is a clearer judgment rather than a quick action

### Typical output effect

The reader should feel:

- "这件事我被你讲明白了"
- "原来问题卡在这里"

### Drafting spine

```text
场景
-> 摩擦 / 不适感
-> 判断
-> 上提结构问题
-> 压回个体
```

### Style rule

- preserve the existing Kabey-style strengths
- allow stronger scene-setting, emotion, metaphor, and aftertaste
- do not turn the piece into empty commentary

## Type 2: 实用文

### Primary goal

Help the reader try something immediately.

### Best fit

- low-cost AI onboarding
- common workplace use cases
- topics that can be explained clearly and tried quickly
- practical methods with visible results in a short time

### Typical output effect

The reader should feel:

- "这个我现在就能试"
- "原来普通人可以先这样接住 AI"

### Drafting spine

```text
场景
-> 卡点
-> AI 能帮什么 / 不能帮什么
-> 最小可执行动作
-> 低成本示例
-> 提炼与余味
```

### Style rule

- clarity and executability come first
- keep the author's voice, but do not let it hide the action path
- emotion, metaphor, and literary expression should mostly appear in the ending or small transition moments

### Hard rule

After style rewrite, the reader must still be able to tell at a glance what the article helps them do.

## Topic routing rule

### 深度文 topic filter

Prefer topics that:

- contain real-life discomfort, mismatch, or tension
- support a scene-to-judgment progression
- do not rely on a tool demo to be meaningful

### 实用文 topic filter

Prefer topics that:

- map to a concrete reader task
- have a low-cost or free trial path
- can be tried within a short time window
- produce a clear output or behavior change

## Node routing rule

### Must branch by content type

- topic selection
- first draft
- revision
- style rewrite

### Stay shared but must read type metadata

- research
- critique round one
- critique round two
- finalization
- 微信公众号发布准备
- 公众号正文配图
- 小红书适配
- 本地阶段产物保存

## Review rule

### 深度文 review questions

- did the judgment grow out of the scene
- is there real friction instead of abstract opinion
- does the ending land with weight

### 实用文 review questions

- is the use case clear
- can the reader actually try it after reading
- did the article drift back into loose commentary
- did the style layer overpower the practical path

## Boundary rule

The workflow supports both types, but they must not be mixed by accident.

If the user wants a deep article, do not flatten it into a checklist.
If the user wants a practical article, do not let it drift into a reflective long essay.
