---
name: wechat-article-illustration
description: 用于待发布源稿回读后，为微信公众号草稿箱正文规划并插入正文配图。先基于待发布源稿生成插图位置和 imagegen prompts，等用户确认后再生成图片、上传微信正文图片并更新现有草稿。
---

# 微信公众号正文配图

## 先读

- `docs/operations/workflow-rules.md`
- `docs/references/wechat-publishing-standard.md`
- `docs/operations/wechat-publish-setup.md`

## 核心职责

在待发布源稿回读之后，为微信公众号草稿箱正文添加符合段落内容的配图。

这个节点只负责公众号草稿箱正文增强。默认正文图是结合段落要点的手绘知识导图；如果用户提供品牌角色参考图，再让角色承担讲解者或视觉锚点：

1. 分析待发布源稿正文结构
2. 找到适合插图的位置
3. 提炼对应段落的核心信息与可视化结构
4. 生成插图方案和完整提示词
5. 等待用户确认生图路径、模型、尺寸、张数和 prompts
6. 通过全局 `imagegen` 生成图片
7. 上传图片为微信正文图片 URL
8. 更新现有微信公众号草稿箱正文

它不覆盖本地 `05_最终稿` 或待发布源稿，也不改变小红书适配输入。

## 阶段位置

默认顺序：

`待发布源稿` → `公众号正文配图（可选）` → `06_小红书版`

`可选` 的意思是用户可以跳过，不是执行者可以默认跳过。
到达待发布源稿回读之后，必须先停在本节点询问用户是否执行公众号正文配图。
只有用户明确跳过或确认不需要配图时，后续小红书适配才照常从待发布源稿 markdown 继续。

## 确认点

这是一个图片生成 + 外部草稿箱更新节点，必须分两段确认。

第一段可以自动执行：

- 读取待发布源稿
- 分析文章结构
- 生成插图方案

第二段必须暂停，展示：

- 文章标题
- 预计图片数量
- 每张图的插入位置和服务段落
- 每张图的视觉目标
- 每张图的完整 `imagegen` prompt
- 当前唯一生图路径
- 本次生图模型、尺寸和输出路径
- 将更新的 WeChat `draft_media_id`

没有用户明确确认，不得调用 `imagegen`。
没有展示生图路径、模型、尺寸、输出路径和完整 prompts，不得调用 `imagegen`。
没有用户确认更新草稿箱，不得写回 WeChat draft。

## 输入

- `wechat-publish-prep/reviewed-source/reviewed-source.md`
- `wechat-publish-prep/reviewed-source/reviewed-source.html`
- WeChat `draft_media_id`
- route metadata when available
- WeChat credentials:
  - `WECHAT_MP_APP_ID`
  - `WECHAT_MP_APP_SECRET`
- explicit image generation confirmation

## 输出

推荐本地产物：

`workspace/output/<article-slug>/wechat-article-illustrations/`

子目录：

- `assets/`
- `logs/`

推荐文件：

- `illustration-plan.md`
- `illustration-plan.json`
- `assets/inline-01.* ... inline-N.*`
- `logs/imagegen-*.json`
- `logs/wechat-inline-images.json`
- `logs/wechat-draft-update.json`

## 插图位置规则

默认每篇 2-4 张图。

优先插入：

- 开头现场之后，而不是正文第一段之前
- 第一个核心概念或核心隐喻附近
- 方法步骤切换处
- 结尾动作或结尾隐喻附近
- 对应段落组末尾，紧贴下一小节标题或分割线之前

避免：

- 为了装饰而插图
- 每个小标题下都插图
- 打断连续短段形成的阅读节奏
- 重复封面图创意
- 在文字已经足够清楚的位置插入解释性图片

## 内容类型规则

### 实用文

优先生成：

- 可直接帮助读者理解步骤的手绘知识导图
- 工作流、桌面、材料、交接单、检查清单等要点结构
- 由品牌角色（如有）或通用视觉锚点引导的流程分支、对比关系、行动清单
- 简单到手机端可读的 mind map infographic

避免：

- 空泛企业海报
- 复杂信息图和密集文字图
- 强行把每个步骤都画成教学卡

### 深度文

优先生成：

- 将关键矛盾、认知反转和收束隐喻提炼成手绘知识导图
- 由品牌角色（如有）或主题物件带出核心判断、反差关系和情绪结构
- 适合手机端扫读的观点地图、张力对照图、概念关系图

避免：

- 把观点文章画成教程
- 用图片过度解释已经成立的判断

## 图片规则

- 可选使用本地品牌参考图 `assets/brand/reference.png`
- 提供参考图时，品牌角色作为讲解者、观察者或视觉锚点出现，但不能喧宾夺主
- 未提供参考图时，使用主题相关的通用人物、物件或场景隐喻
- 默认图像类型为手绘知识导图，而不是普通场景图、人物插画或抽象海报
- 每张图必须基于服务段落先提炼 3-5 个核心要点，再转成可视化分支
- 默认允许短文字标签，因为知识导图需要可读标签；标签必须短、清晰、中文可读
- 禁止大段正文搬运进图片，禁止把文章段落截图化
- 默认使用公众号正文友好的横图或宽图
- 不使用小红书竖版分镜规格
- 同一篇文章内保持统一视觉风格
- 不加入额外品牌、logo、水印或无关角色
- 不把本地路径写入公众号 HTML；必须先上传为微信正文图片 URL

## 手绘知识导图 prompt 规则

每张图的完整 prompt 必须包含以下核心风格与版式要求：

- `hand-drawn sketchnote style`
- `visual note-taking`
- `mind map infographic`
- `doodles`
- `marker pen texture`
- `on clean white paper background`
- `high quality sketch`
- `central main title text`
- `branching arrows pointing outwards`
- `cute colorful icons for each section`
- `handwritten text labels`
- `colorful but soft`
- `pastel marker colors`
- `clear and legible`

Prompt 还必须写明：

- 如文件存在，使用 `assets/brand/reference.png` 作为品牌角色参考；否则明确说明无参考图
- 中心大标题的中文文案
- 每个分支的中文短标签
- 每个分支对应的图标或 doodle 元素
- IP 形象在画面中的位置与动作
- 避免真实照片感、3D、企业海报、复杂 UI 截图、密集小字、水印和 logo

## Imagegen 规则

实际生图统一走全局 `imagegen` skill。

本项目只维护：

- 插图位置分析
- prompt 生成
- 本地资产组织
- 微信正文图片上传
- 草稿箱正文更新

不得恢复或新建项目本地图片执行层。
不得恢复旧的多通道选择或 token 计费通道提示。
实际请求路径、模型和尺寸以当前全局 `imagegen` skill 为准。

## 微信草稿更新规则

- 先获取或使用已有待发布源稿 HTML 作为正文基底
- 将生成图片上传到微信正文图片接口，获得微信可访问 URL
- 将图片插入选定段落附近
- 更新现有 `draft_media_id` 的正文内容
- 保留原文章标题、封面、作者、摘要和评论设置，除非用户明确要求修改
- 更新成功后记录 draft update log

## 下游规则

- 小红书适配继续读待发布源稿 markdown
- 本地待发布源稿 markdown 保持纯文本，不加入正文图片

## 失败规则

- 插图方案生成失败：停止，不调用 imagegen
- 用户不确认：保留方案，不生成图片
- 单张图片生成失败：停止更新草稿箱，除非用户明确接受部分图片
- 微信图片上传失败：保留本地图片和日志，不更新草稿箱
- 草稿箱更新失败：报告失败状态，不声称已完成配图

## 不适用

- 公众号封面图生成：使用 `wechat-publish-prep`
- 小红书漫画分镜图生成：使用 `xiaohongshu-image-generation`
