# 微信公众号发布配置

## 目的

为 `wechat-publish-prep` 节点提供最小可运行配置，同时保证凭证、私人素材和真实外部动作不进入仓库。

## 图片生成

封面与正文图片统一通过当前运行环境提供的全局 `imagegen` 能力生成。本项目不绑定图片供应商，也不保存图片 API key。

每次真实生图前必须展示：

- 当前运行时提供的模型或路径；
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

## 首次接入验证

先使用仓库已有的 dry-run 路径验证本地输出：

```powershell
./scripts/wechat-publish-prep.ps1 -Action confirm-summary -FinalDraftPath <path>
./scripts/wechat-publish-prep.ps1 -Action typeset -FinalDraftPath <path>
./scripts/wechat-publish-prep.ps1 -Action upload-draft -FinalDraftPath <path> -CoverImagePath <png> -DryRun
```

确认摘要、日志、HTML、封面尺寸和目标文章都正确后，再执行真实上传。
