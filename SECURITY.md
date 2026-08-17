# 安全政策

## 报告安全问题

请优先使用本仓库的 GitHub **Private vulnerability reporting** 提交安全问题。不要在公开 Issue、Discussion 或 Pull Request 中粘贴：

- API key、AppID/AppSecret、access token 或 cookie
- 私人文章、未发布草稿、聊天记录或平台导出数据
- 能识别个人或账号的截图、路径和日志

非敏感的普通缺陷可以直接提交 Issue。

## 支持范围

我们优先处理当前默认分支中与凭证泄露、路径越界、未确认外部动作、远端内容误更新和敏感日志有关的问题。

## 使用者责任

Content OS 会尽量把外部动作放在明确确认点之后，但使用者仍应：

- 通过环境变量或 secret manager 提供凭证；
- 首次接入平台时先运行 dry run；
- 为平台账号配置最小权限与可用的 IP 白名单；
- 公开派生仓库前同时扫描当前文件和 Git 历史。
