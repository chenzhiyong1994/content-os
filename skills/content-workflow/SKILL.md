---
name: content-workflow
description: 用于运行 content-os 的完整内容生产流程：选题、研究、带作者声音的初稿、编辑修改、必做风格深化、最终稿、公众号发布准备、小红书适配和图片生成。触发词：帮我做一篇，做一期内容，从头写一篇，写篇公众号，开始内容创作。
---

# content-os 内容流程

## 先读

- `docs/operations/workflow-rules.md`
- `docs/references/content-type-standard.md`
- `docs/references/` 下与任务相关的标准
- 当前节点对应的项目 skill

如果流程从热点收集开始，也读取 `docs/operations/web-access-setup.md`。AI 话题可以先运行无需浏览器的 AI HOT 快速扫描；开始社交验证前，选择用户明确指定且具备登录态的浏览器表面，再执行内容级健康检查。

本 skill 只负责项目编排。环境级 `web-access` 和 `imagegen` 能力不复制到本仓库。

## 职责

本 skill 只负责识别“完整内容流程”并路由到节点 skill。

不要在本文件解释阶段顺序、gate、产物编号、写作引擎或外部动作规则；这些只以 `docs/operations/workflow-rules.md` 为准。

## 节点路由

| 节点 | 使用 |
| --- | --- |
| AI 快速信号 | `skills/aihot-signal/SKILL.md`，由热点收集按需调用 |
| 热点收集 | `skills/social-hotspot-collector/SKILL.md` |
| 研究素材 | `skills/content-research/SKILL.md` |
| 微信公众号初稿 | `skills/wechat-draft/SKILL.md` |
| 微信公众号修改稿 | `skills/wechat-revise/SKILL.md` |
| 风格深化（每篇必做） | `skills/style-refine/SKILL.md` |
| 微信公众号最终稿 | `skills/wechat-finalize/SKILL.md` |
| 微信公众号发布准备和待发布源稿回读 | `skills/wechat-publish-prep/SKILL.md` |
| 公众号正文配图 | `skills/wechat-article-illustration/SKILL.md` |
| 小红书适配 | `skills/xiaohongshu-adapt/SKILL.md` |
| 小红书图片生成 | `skills/xiaohongshu-image-generation/SKILL.md` |

## 辅助路由

| 场景 | 使用 |
| --- | --- |
| 用户审核反馈、草稿箱手动校准、风格或内容经验沉淀 | `skills/style-feedback/SKILL.md` |
| 用户明确要求单独审稿、挑毛病或只诊断不修改 | `skills/simulated-critique/SKILL.md` |

## 不适用

- 单节点请求，例如“改写这一段”
- 用户明确要求停在某个阶段的任务
