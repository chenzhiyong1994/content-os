# 微信公众号发布配置

## 运行环境

需要 Node.js 22.18+ 和 PowerShell 7。首次使用执行 `npm ci` 安装锁定依赖，再运行 `npm test`；回读使用 parse5 提取文字与断句。

## 目的

为 `wechat-publish-prep` 节点提供最小可运行配置，同时保证凭证、私人素材和真实外部动作不进入仓库。

## 图片生成

封面与正文图片统一通过当前运行环境提供的全局 `imagegen` 能力生成。本项目不绑定图片供应商，也不保存图片 API key。

每次真实生图前必须展示：

- 当前工具路径、可见的模型或接口归属；未公开字段如实注明由工具管理；
- 图片尺寸和宽高比；
- 本地输出路径；
- 完整 prompt；
- 是否附带品牌参考图。

等待用户明确确认后才能调用。公众号封面默认规格：

- image size: `3760x1600`
- aspect ratio: `2.35:1`

`3840x2160` 是 `16:9`，不得冒充公众号默认封面比例。

## 微信公众号环境变量

- `WECHAT_MP_APP_ID`
- `WECHAT_MP_APP_SECRET`
- 可选：`WECHAT_MP_AUTHOR`；未配置时不注入作者尾注

同一套公众号凭证用于上传封面和正文、创建草稿，以及根据 `draft_media_id` 回读用户手动校准后的远端草稿。

项目只从当前进程环境或用户级环境变量读取这些值，不把凭证写进配置文件和日志。`.env.example` 仅用于列出变量名，脚本不会自动加载 `.env`。

PowerShell 当前会话示例：

```powershell
$env:WECHAT_MP_APP_ID = "your-app-id"
$env:WECHAT_MP_APP_SECRET = "your-app-secret"
$env:WECHAT_MP_AUTHOR = "your-public-author-name" # optional
```

## 品牌参考图（可选）

如需固定角色或品牌视觉，把有权使用的参考图放在：

```text
assets/brand/reference.png
```

该文件默认被 Git 忽略。没有参考图时，封面 prompt 会要求使用通用人物、物件或场景隐喻，不会自动编造固定品牌角色。

## 微信后台准备

1. 在公众号后台开发设置中获取 `AppID` 和 `AppSecret`。
2. 配置接口调用 IP 白名单。
3. 确认账号具备素材和草稿接口权限。
4. 使用最小权限凭证，并在疑似泄露时立即轮换。

如果 IP 白名单未配置正确，获取 `access_token` 或草稿上传会失败。

## 本地预检与正式上传

以下命令从仓库根目录运行，`<path>` 指向文章 `05_最终稿.md`：

```powershell
pwsh -File scripts/wechat-publish-prep.ps1 -Action confirm-summary -FinalDraftPath "<path>"
pwsh -File scripts/wechat-publish-prep.ps1 -Action typeset -FinalDraftPath "<path>"
# 封面通过全局 imagegen 生成并检查后，先做本地试运行
pwsh -File scripts/wechat-publish-prep.ps1 -Action upload-draft -FinalDraftPath "<path>" -CoverImagePath "<verified-cover.png>" -DryRun
# 具体上传动作已获用户授权后执行
pwsh -File scripts/wechat-publish-prep.ps1 -Action upload-draft -FinalDraftPath "<path>" -CoverImagePath "<verified-cover.png>"
# 用户表示草稿箱手动编辑完成后，回读文字用于风格画像
pwsh -File scripts/wechat-publish-prep.ps1 -Action sync-reviewed-source -FinalDraftPath "<path>" -DraftMediaId "<media_id>"
```

`confirm-summary` 只准备生图交接信息；项目的 `generate-cover` 动作已停用，不能用它生成封面。`upload-draft` 默认从终稿生成 HTML；如需上传已审看的排版文件，传 `-HtmlPath "<preview.html>"`。脚本生成的预览按排版元数据记录的原稿目录解析本地图片；外部 HTML 则相对于 HTML 所在目录解析。

## 产物隔离与回读契约

同一文章的产物放在终稿同级 `wechat-publish-prep/`：

- `preview/`：本篇临时排版 `.md` 和 `.html`，不同文章互不覆盖。
- `assets/wechat-cover.png`：通过尺寸与视觉校验的封面。
- `logs/`：正式上传请求、响应、排版元数据和 `workflow-context.json`。
- `reviewed-source/`：`reviewed-source.md` 为修改后的纯文本风格样本（沿用文件名，不保留 Markdown 排版）；`uploaded-style-baseline.md` 为同一草稿上传时的文本基线；`reviewed-source.html` 仅保留原始请求正文用于溯源。三者均不是发布或配图输入源。
- `dry-run/`：所有带 `-DryRun` 的日志、预览和回读模拟结果。试运行可读取正式封面，但不能覆盖正式日志或源稿；模拟结果的 `style_feedback_source_path` 和 `style_feedback_baseline_path` 均为 `null`。

本地模拟回读读取 `dry-run/logs/wechat-draft-request.json`，需先成功执行试上传，再用 `sync-reviewed-source -DraftMediaId "dry-run" -DryRun` 检查转换。它不证明远端同步成功。

回读仅保留真实标题、文字、标点、换行和分段，忽略颜色、加粗、字号、链接地址、列表/表格样式、引用框、图片和分割线；与模板一致的固定尾注不进入样本。自动小标题仅在上传记录属于同一草稿且文字未改动时过滤；其他标题保留文字，但不据此推断结构偏好。

正式结果 `purpose=style-feedback-only`。`baseline_status=available` 才能将 `style_feedback_baseline_path` 与 `style_feedback_source_path` 用于人工差异分析；`missing` 表示没有完整上传记录，`draft-mismatch` 表示上传记录不属于当前草稿。两者都返回空基线路径，不从旧文件或排版前终稿拼造基线。试运行状态为 `simulation`，只用于检查抽取行为。

风格回读的执行与画像更新只按 `docs/operations/feedback-loop.md`。正文配图直接获取当前草稿箱 HTML，见对应配图 skill，不依赖本目录的学习样本。

上传超时或响应不确定时，先核对草稿箱和日志是否已经创建草稿，再决定重试，避免重复新增。回读失败不得用本地终稿或模拟结果冒充远端修改样本；仅暂停风格学习。
