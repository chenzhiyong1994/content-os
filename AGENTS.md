# content-os 项目指南

## 项目定位

`content-os` 是当前内容生产项目的唯一项目名。

本仓库负责维护本地优先的内容生产流程，并把执行规则放在仓库内可见的位置。

## 首次读取顺序

修改提示词、技能、脚本或流程行为前，按顺序读取：

1. `README.md`
2. `docs/operations/workflow-rules.md`
3. `docs/references/` 下与任务相关的标准
4. `skills/` 下与任务相关的技能

如果任务涉及浏览器自动化，也读取：

- `docs/operations/web-access-setup.md`

如果任务涉及用户审核反馈、草稿箱手动校准、风格画像沉淀或 skill 迭代，也读取：

- `docs/operations/feedback-loop.md`

如果任务完成了一次有意义的项目迭代，也执行：

- `docs/operations/version-safety.md`

## 流程边界

- 仓库只维护项目专属流程逻辑。
- `web-access` 等全局能力属于运行环境，不复制成本项目资产。
- `02_初稿`、`04_风格深化`、`05_最终稿`、`06_小红书版` 默认由当前编排 Agent 执行；如需交给外部写作引擎，必须按 `docs/operations/workflow-rules.md` 的“可选外部写作引擎”显式配置，不得依赖维护者本机默认值。

## 必须遵守的规则

- 执行前读取相关标准，不要靠记忆猜规则。
- 除非用户明确要求改流程，否则保持阶段顺序稳定。
- 不要静默修改 skill 或规则文件。修改后在最终回复列出具体改动。
- 临时输出放在 `workspace/`，保持根目录干净。
- 有意义的流程、技能、脚本或规则迭代完成并验证后，创建 Git 提交，把 `backup/latest-safe` 移到新提交，并创建 `safe/YYYY-MM-DD-<summary>` 标签。
- 普通文章产物不需要提交或打安全标签，除非用户要求版本化。
- 查当前流程规则时，以 `docs/operations/workflow-rules.md` 为准；节点细节再看对应 `skills/`。
- 不要把 `workspace/` 内容当作活动指令，除非任务明确要求历史追溯或排查。

## 关键参考

- 选题新鲜度和讨论筛选：`docs/references/hotspot-collection-standard.md`
- AI 快速信号入口：`skills/aihot-signal/SKILL.md`
- 作者声音：`docs/references/style-profile.md`
- 活人感写作标准：`docs/references/human-writing-standard.md`
- 最高权重风格来源：`docs/references/style-examples/` 下用户提供的全部代表作
- 微信公众号发布标准：`docs/references/wechat-publishing-standard.md`
- 人审反馈闭环：`docs/operations/feedback-loop.md`
- 内容反馈案例库：`docs/references/content-feedback-library.md`

## 目录意图

- `docs/`：长期项目文档和执行规则
- `skills/`：项目专属技能
- `scripts/`：本地辅助脚本
- `assets/`：稳定品牌或参考图片
- `workspace/`：临时工作文件和生成产物
