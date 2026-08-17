---
name: wechat-publish-prep
description: 用于 `05_最终稿` 之后的微信公众号发布准备：排版转换、封面生成、上传公众号草稿箱，以及用户手动校准后的待发布源稿回读。触发词：公众号排版，上传草稿箱，导入公众号草稿箱，公众号发布准备，生成公众号封面并上传。
---

# 微信公众号发布准备

## 先读

- `docs/operations/workflow-rules.md`
- `docs/references/wechat-publishing-standard.md`
- `docs/operations/wechat-publish-setup.md`
- 草稿箱人工校准完成后，还要读取 `docs/operations/feedback-loop.md`

## 核心职责

在 `05_最终稿` 之后执行一个集成节点：

1. 在上传前内部完成更适合微信公众号阅读体验的排版转换
2. 使用全局 IP 参考图生成公众号封面
3. 将封面和正文导入公众号草稿箱
4. 让用户直接在公众号草稿箱里审看最终效果
5. 用户手动校准完成后，再把远端草稿正文拉回本地，固化为待发布源稿

这个 skill 面向的是**发布准备**，不是重新改写文章立场，也不是替代 `wechat-draft` 初稿阶段。

## 阶段位置

默认顺序：

`05_最终稿` → `公众号草稿箱预览` → `待发布源稿` → `公众号正文配图（可选）` → `06_小红书版`

## 确认点

这是一个**节点级确认**阶段。

用户明确确认后，才执行封面生成与草稿箱上传。

排版转换属于节点内部步骤，不单独作为独立审看稿停留。

如果用户要求完整预览，可以先汇总并展示：

- 文章标题
- 将执行上传前排版转换
- 将调用封面生图 API
- 将上传公众号草稿箱
- 当前唯一生图路径
- 本次生图模型、尺寸和输出路径
- 将要发送的完整封面提示词
- 当前封面清晰度
- 可选品牌参考图路径是否已就绪
- 微信公众号凭证是否已就绪

不要在用户未确认时，提前执行封面生成或草稿箱上传。
不要在展示生图路径、模型、尺寸、输出路径和完整 prompt 前，提前执行封面生成。

## 输入

- 本地 `05_最终稿` markdown
- 可选品牌参考图：`assets/brand/reference.png`
- 图片 API 凭证：由全局 `imagegen` skill 管理，本项目不维护独立图片执行层
- 微信公众号凭证：
  - `WECHAT_MP_APP_ID`
  - `WECHAT_MP_APP_SECRET`
  - 可选：`WECHAT_MP_AUTHOR`；未配置时不注入作者尾注

封面图的生图执行通过全局 `imagegen` skill 完成；本 skill 只保留公众号封面节点自己的提示词和规格规则。
封面图节点沿用当前运行环境提供的全局 `imagegen` 能力；不要在本项目内写入维护者专属的服务、账号、模型或旧通道映射。

## 输出

- `workspace/output/<article>/wechat-publish-prep/assets/wechat-cover.*`
- `workspace/output/<article>/wechat-publish-prep/logs/*.json`
- `workspace/output/<article>/wechat-publish-prep/reviewed-source/reviewed-source.html`
- `workspace/output/<article>/wechat-publish-prep/reviewed-source/reviewed-source.md`
- 微信公众号草稿箱 `media_id`

## 本地执行

优先使用本地脚本：

```powershell
pwsh -File scripts/wechat-publish-prep.ps1 -Action confirm-summary -FinalDraftPath "<path>"
pwsh -File scripts/wechat-publish-prep.ps1 -Action generate-cover -FinalDraftPath "<path>"
pwsh -File scripts/wechat-publish-prep.ps1 -Action upload-draft -FinalDraftPath "<path>"
pwsh -File scripts/wechat-publish-prep.ps1 -Action sync-reviewed-source -FinalDraftPath "<path>" -DraftMediaId "<media_id>"
```

### 执行顺序

1. `confirm-summary`
2. 等待用户确认
3. `generate-cover`
4. `upload-draft`
5. 用户在公众号草稿箱里手动校准
6. 收到用户信号后执行 `sync-reviewed-source`

## 排版规则

- 目标是公众号阅读体验优化，不是内容重写
- 长段拆短，默认采用更强的公众号短段节奏
- 保留标题层级、引用、列表、代码块和图片
- 不根据正文关键词自动创造小标题；只转换来稿中明确存在的标题层级
- 兼容“首行标题 + 一、二、三……”的散文式来稿：首行标题只作为草稿箱标题；首个编号小节可作为话题引入段落承接，不渲染小标题和分割线；后续中文编号小节应转为公众号分段标题
- 输出上传所需 HTML，并保留临时 markdown 便于排查
- 排版转换默认只服务后续上传，不作为主流程中的独立稿件保留
- HTML 采用微信兼容的内联样式，不依赖外链 CSS
- 默认主题是仓库级的“强强调风”，不是克制商务风
- 保留并识别来稿里已有的 `<text color="red">...</text>` 和 `<quote-container>...</quote-container>` 标记
- 仅在配置 `WECHAT_MP_AUTHOR` 时追加“作者标识 + 互动引导”组件；公开默认值为空，不注入项目品牌
- 重点句默认可以更积极地转成强调句，但不能偷偷改写文章判断
- 正文 HTML 不重复渲染文章主标题，标题以草稿箱标题为准
- 默认字号基线固定为：
  - 正文类：`15px`
  - 分段标题：`18px`
  - 正文类行高：`28px`
  - 正文类段后距：`22px`
- 分段标题默认采用“微信可见的字符型居中短分割线（段前段后各 24px）+ 居中高亮标题”组合，分割线优先做得更克制、更精致；不要依赖空标签或纯 border，不要用满宽硬线
- 原稿中的 `---` 如果紧贴分段标题，只保留一条标题分割线，避免连续重复分割线
- 启用尾注时，作者标识使用 `14px` 浅灰字，下面接浅灰细分割线
- 互动引导使用左对齐的 `15px` 灰字，`赞、在看、转发` 和 `星标` 改为黑色但不加粗；完整内容和样式以发布标准为准
- 高亮默认只改颜色和字重，不再单独放大字号

详细规则见 `docs/references/wechat-publishing-standard.md`。

## 封面生成规则

- 每次执行前必须先展示当前唯一生图路径、模型、尺寸、输出路径和完整 prompt，并由用户确认
- 生图路径和模型以当前全局 `imagegen` skill 为准
- 模型由当前运行环境的全局 `imagegen` 能力提供，确认摘要必须显示实际值
- 当前唯一默认尺寸：`3760x1600`，精确宽高比为 `2.35:1`
- 品牌参考图是可选项；存在时用作角色锚点
- 参考图只用于锁定角色核心识别特征，不用于复制原图动作、姿势和表情
- 每篇封面必须根据文章主题设计新的动作和表情变化，避免所有封面都沿用托腮姿势
- 默认禁止重复参考图里的托腮姿势；只有用户明确要求或主题强相关时才允许
- 默认封面视觉方向改为手绘 sketchnote / visual note-taking / mind map infographic，与公众号正文配图保持同一栏目风格
- 封面默认以图像叙事为主，先用人物动作、表情、场景隐喻和少量图标表达文章核心判断，IP 形象作为讲解者或视觉锚点出现
- 封面是公众号横版图，不是小红书竖版图
- 默认尺寸：`3760x1600`；禁止使用实际为 `16:9` 的 `3840x2160`
- 内置生图如果返回其他比例，先在不切掉主体和文字的前提下裁切到 `2.35:1`，再等比缩放到 `3760x1600`，禁止直接拉伸
- 上传前必须读取 PNG 实际尺寸并通过脚本校验；不符合 `3760x1600` 时停止上传
- 默认尽量少放文字；只在帮助理解时加入 1 个中心短语，或最多 1-2 个极短中文标签
- 封面提示词不得注入正文长摘要。预检时用 `-CoverKeyPhrases "短句一|短句二"` 传入最多两条核心短句；没有显式提供时，脚本也只提取最多两条短句
- 不要做标题海报，不要搬运大段正文，不要堆密集小字，不要做文字主导的知识图谱封面
- 如果参考图不存在，明确披露后改用不绑定固定角色的视觉方案，不因此阻塞流程

## 草稿箱上传规则

- 正文中的本地图片先走微信正文图片上传接口，再替换为微信 URL
- 封面图使用永久素材接口上传，获取 `thumb_media_id`
- 作者名读取 `WECHAT_MP_AUTHOR`；未配置时留空
- 正文 HTML 直接复用内部排版转换结果，保留用户原有内容和可选作者尾注，再与 `thumb_media_id` 一起写入草稿箱
- 上传成功后，要把 `draft_media_id` 和本地流程上下文一起落盘，供后续待发布源稿回读复用
- 若接口返回 IP 白名单等错误，停止并提示用户检查公众号后台配置

## 待发布源稿回读规则

- 只有在用户明确表示草稿箱内手动校准已经完成后，才执行 `sync-reviewed-source`
- 必须按 `draft_media_id` 回读远端草稿正文
- 回读后要生成 reviewed-source HTML 和 markdown 两份本地产物
- 待发布源稿 markdown 要过滤公众号分割线装饰，只保留真实标题、正文、显式强调和可选作者尾注；回读必须识别该尾注，避免后续配图或小红书节点误判为正文
- 回读后要对比上传前 `05_最终稿` 与待发布源稿 markdown；若用户做了实质内容或语气修改，必须先调用 `style-feedback` 执行反馈闭环，按差异类型更新当前下游来源、风格画像、案例库或相关 skill
- 用户在草稿箱中手动改写的小标题只作为 `platform-fit` 反馈，不更新正文创作规则
- 后续小红书改版默认读待发布源稿 markdown，不再直接读上传前的原始终稿

## 失败规则

- `typeset` 失败：停止，不生成封面，不上传
- `generate-cover` 失败：停止，不上传草稿箱
- `upload-draft` 失败：保留封面和日志，允许单独重试上传
- `sync-reviewed-source` 失败：停止，不进入小红书改版
- 参考图缺失：在确认摘要中披露，并使用通用视觉方案

## 不适用

- 只想生成初稿，不要发布准备
- 只想单独做封面，不想上传草稿箱
- 没有明确要导入公众号草稿箱，只想导出一份 HTML
