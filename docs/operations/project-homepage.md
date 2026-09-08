# 项目主页与 GitHub Pages

项目主页：<https://chenzhiyong1994.github.io/content-os/>

## 页面与预览

`site/` 保存独立的静态主页：HTML、CSS、少量用于流程切换与复制按钮的 JavaScript，以及 SVG 图标。无需构建或新增 npm 依赖；页面文案用于介绍，实际执行规则仍以 `docs/operations/workflow-rules.md` 为准。

可以直接打开 `site/index.html`。需要通过 HTTP 预览时，在仓库根目录运行：

```powershell
python -m http.server 4173 --bind 127.0.0.1 --directory site
```

打开 <http://127.0.0.1:4173/>。复制按钮使用 Clipboard API；浏览器拒绝访问时选中文本，提示手动复制。

## 发布

公开仓库为 `chenzhiyong1994/content-os`，Pages 使用 GitHub Actions 作为发布源。`.github/workflows/pages.yml` 在 `main` 的 `site/` 或该工作流改变时发布，也支持 `workflow_dispatch` 手动部署。

发布包严格限定为 `site/`。不要把上传路径改为仓库根目录或 `docs/`，也不要把真实文章、私密样文、品牌原图、凭证和本地输出复制到 `site/`。主页不读取项目的本地数据。

维护公开版时在对应的独立公开 checkout 修改或同步主页文件；不要从带有私人历史的仓库向公开 remote 推送。推送前执行适用回归测试、桌面与窄屏预览、流程切换和复制按钮检查，以及公开发布审计。正常写作流程不在本次主页发布范围内。

本轮发布成功后，GitHub Actions 的 `Deploy project homepage` 运行应为成功，Pages API 的站点地址应与上方一致，线上 HTML/CSS/JS 应返回成功状态且与发布提交一致。仓库 About 的 Website 字段也指向主页。

## Fork 使用

工作流仅自动部署上面的官方仓库。Fork 后如需发布自己的主页：修改工作流的 `if` 仓库名，设置 `Settings → Pages → Source → GitHub Actions`，再更新页面的 GitHub 链接、canonical URL、`og:url` 和项目介绍中的地址。相对资源路径兼容 GitHub Pages 的项目子路径。

GitHub 配置参考：[使用自定义工作流发布 GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
