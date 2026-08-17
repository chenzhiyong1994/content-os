---
name: aihot-signal
description: 从 AI HOT 公共接口快速获取近期 AI 新闻、模型、产品、论文、技巧和行业动态，作为 content-os 的热点发现信号。用户询问最新 AI 动态、AI HOT、AI 日报、某家公司或关键词的近期 AI 消息，或 social-hotspot-collector 需要建立初始候选池时使用；不把聚合摘要当作已核验研究证据。
---

# AI HOT 信号采集

## 职责

把 AI HOT 作为快速发现入口，输出可继续验证的 AI 资讯线索。

- 独立资讯查询：返回简洁的中文资讯列表。
- 选题发现：为 `social-hotspot-collector` 提供初始候选，不替代社交讨论扫描和来源核验。
- 研究阶段：只提供来源指针；进入 `01_研究素材.md` 前必须打开原文或官方来源核验关键事实。

## 查询方式

使用 `scripts/get-aihot.ps1`：

先配置自己的聚合接口：

```powershell
$env:AIHOT_BASE_URL = "https://your-aggregator.example"
```

接口需实现 `/api/public/items`、`/api/public/daily` 和 `/api/public/daily/YYYY-MM-DD`。仓库不内置维护者使用的服务地址；也可以每次用 `-BaseUrl` 显式传入。

```powershell
# 精选条目
.\skills\aihot-signal\scripts\get-aihot.ps1 -Mode selected -Take 50

# 全量条目
.\skills\aihot-signal\scripts\get-aihot.ps1 -Mode all -Take 50

# 关键词或分类
.\skills\aihot-signal\scripts\get-aihot.ps1 -Mode selected -Query "Anthropic" -Category paper -Take 20

# 最新日报或指定日期日报
.\skills\aihot-signal\scripts\get-aihot.ps1 -Mode daily
.\skills\aihot-signal\scripts\get-aihot.ps1 -Mode daily -Date 2026-08-12
```

如果没有配置聚合接口，跳过本快速信号节点，直接使用常规来源发现；不要猜测或回退到未知第三方服务。

默认路由：

- “最近 AI 有什么”“AI 圈有什么”：`selected`
- “AI 日报”：`daily`
- “全部”“完整”“全量”：`all`
- 公司、模型、产品或主题：使用 `-Query`
- 明确类别：加 `-Category`

## 输出和证据边界

对保留线索记录：

- 标题
- 来源名称
- 发布时间
- 简短摘要
- 原文 URL
- AI HOT 条目 URL

不要向用户展示接口调试字段、分页游标或 HTTP 细节。

AI HOT 是聚合信号，不是事实终点：

- 摘要只能用于发现和初筛，不能作为原文引语。
- 重要事实、数字、发布日期和产品能力必须回到原文或官方来源。
- `selected` 和 API score 代表聚合站筛选，不等于社交讨论度或公众号流量潜力。
- 找不到足够信号时，明确说需要观察，不为凑选题而放大弱消息。

## 接入完整选题流程

当任务目标是“找值得写的话题”而不只是资讯查询时：

1. 用本 skill 建立 AI 快速候选池。
2. 交给 `social-hotspot-collector` 完成登录态社交扫描、讨论验证、饱和度判断和流量下注。
3. 入选题按 `docs/references/hotspot-collection-standard.md` 写入轻量 `00_选题卡.md`。
4. 研究节点直接读取选题卡，不再制作跨项目 handoff 或材料包。
