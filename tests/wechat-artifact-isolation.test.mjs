import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repoRoot, "scripts", "wechat-publish-prep.mjs");

function runCli(draftPath, action, ...args) {
  return JSON.parse(execFileSync(process.execPath,
    [cliPath, "-Action", action, "-FinalDraftPath", draftPath, ...args],
    { cwd: repoRoot, encoding: "utf8", env: { ...process.env, WECHAT_MP_AUTHOR: "", USERENV_WECHAT_MP_AUTHOR: "" } }));
}

function syncFixtureHtml(draftPath, html) {
  const logs = path.join(path.dirname(draftPath), "wechat-publish-prep", "dry-run", "logs");
  fs.mkdirSync(logs, { recursive: true });
  fs.writeFileSync(path.join(logs, "wechat-draft-request.json"),
    JSON.stringify({ articles: [{ title: "测试标题", content: html }] }));
  const result = runCli(draftPath, "sync-reviewed-source", "-DraftMediaId", "fixture", "-DryRun");
  return fs.readFileSync(result.reviewed_source_markdown_path, "utf8");
}

function makeFixture() {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "wechat-cover-test-"));
  const draftPath = path.join(fixtureDir, "05_final.md");
  const coverPath = path.join(fixtureDir, "wrong-ratio.png");
  fs.writeFileSync(draftPath, "# 测试标题\n\n测试正文。\n", "utf8");
  fs.writeFileSync(
    coverPath,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  return { fixtureDir, draftPath, coverPath };
}

test("typesetting two articles with the same stage filename preserves both previews", () => {
  const first = makeFixture();
  const second = makeFixture();
  try {
    fs.writeFileSync(first.draftPath, "# 第一篇\n\n第一篇的独立内容。\n");
    fs.writeFileSync(second.draftPath, "# 第二篇\n\n第二篇的独立内容。\n");
    const a = runCli(first.draftPath, "typeset");
    const b = runCli(second.draftPath, "typeset");
    assert.notEqual(a.preview_html_path, b.preview_html_path);
    assert.match(fs.readFileSync(a.preview_html_path, "utf8"), /第一篇的独立内容/);
    assert.match(fs.readFileSync(b.preview_html_path, "utf8"), /第二篇的独立内容/);
  } finally {
    fs.rmSync(first.fixtureDir, { recursive: true, force: true });
    fs.rmSync(second.fixtureDir, { recursive: true, force: true });
  }
});

test("dry-run sync cannot overwrite the live reviewed source or workflow context", () => {
  const fixture = makeFixture();
  try {
    const root = path.join(fixture.fixtureDir, "wechat-publish-prep");
    const liveLogs = path.join(root, "logs");
    const liveSource = path.join(root, "reviewed-source", "reviewed-source.md");
    fs.mkdirSync(liveLogs, { recursive: true });
    fs.mkdirSync(path.dirname(liveSource), { recursive: true });
    fs.writeFileSync(liveSource, "人工审核过的正式内容");
    const context = JSON.stringify({ draft_media_id: "live-id", article_title: "正式标题" });
    fs.writeFileSync(path.join(liveLogs, "workflow-context.json"), context);
    const dryLogs = path.join(root, "dry-run", "logs");
    fs.mkdirSync(dryLogs, { recursive: true });
    const request = JSON.stringify({ articles: [{ title: "试运行标题", content: "<p>试运行内容</p>" }] });
    fs.writeFileSync(path.join(dryLogs, "wechat-draft-request.json"), request);
    // Existing versions read this live log even when DryRun is set.
    fs.writeFileSync(path.join(liveLogs, "wechat-draft-request.json"), request);
    const result = runCli(fixture.draftPath, "sync-reviewed-source", "-DraftMediaId", "dry-id", "-DryRun");
    assert.equal(fs.readFileSync(liveSource, "utf8"), "人工审核过的正式内容");
    assert.equal(fs.readFileSync(path.join(liveLogs, "workflow-context.json"), "utf8"), context);
    assert.equal(result.fetch_mode, "dry-run-local-request");
    assert.equal(result.style_feedback_source_path, null);
    assert.equal(result.style_feedback_baseline_path, null);
    assert.equal(result.purpose, "style-feedback-only");
    assert.equal("downstream_source_for_xiaohongshu" in result, false);
    assert.match(fs.readFileSync(result.reviewed_source_markdown_path, "utf8"), /试运行内容/);
  } finally {
    fs.rmSync(fixture.fixtureDir, { recursive: true, force: true });
  }
});

test("style readback preserves wording and breaks while ignoring HTML formatting", () => {
  const fixture = makeFixture();
  try {
    const plain = syncFixtureHtml(fixture.draftPath,
      '<h2>操作步骤</h2><p>先核验来源，别急。<br>然后呢？保存结果。</p><p>参考原文，保留边界。</p>');
    const styled = syncFixtureHtml(fixture.draftPath,
      '<section><p style="text-align:center"><b>操作步骤</b></p>' +
      '<p><strong>先核验来源</strong>，别急。<br><i>然后呢？</i>保存结果。</p>' +
      '<p>参考<a href="https://example.com/paper">原文</a>，<span style="color:red">保留边界</span>。</p>' +
      '<img src="ignored.png"><hr><script>ignore()</script></section>');
    assert.equal(styled, plain);
    assert.equal(plain, '测试标题\n\n操作步骤\n\n先核验来源，别急。\n然后呢？保存结果。\n\n参考原文，保留边界。\n');
    const edited = syncFixtureHtml(fixture.draftPath,
      '<p>先别急。先核验来源。</p><p>然后呢？<br>保存结果。</p>');
    assert.equal(edited, '测试标题\n\n先别急。先核验来源。\n\n然后呢？\n保存结果。\n');
  } finally {
    fs.rmSync(fixture.fixtureDir, { recursive: true, force: true });
  }
});

test("style readback keeps visible list, table and code text without markup", () => {
  const fixture = makeFixture();
  try {
    const text = syncFixtureHtml(fixture.draftPath,
      '<ol start="3"><li>先核验来源<ul><li>检查日期</li></ul></li><li>保存结果</li></ol>' +
      '<pre><code>if (a &lt; b) {\n  save(a);\n}</code></pre>' +
      '<blockquote><p>准确引语</p></blockquote>' +
      '<table><tr><th>条件</th><th>结果</th></tr><tr><td>来源不足</td><td>停止</td></tr></table>');
    for (const value of ['先核验来源', '检查日期', '保存结果', 'if (a < b)', 'save(a);', '准确引语', '条件', '结果', '来源不足', '停止']) {
      assert.ok(text.includes(value), value);
    }
    assert.doesNotMatch(text, /```|<quote-container>|\| ---|3\. 先核验来源/);
  } finally {
    fs.rmSync(fixture.fixtureDir, { recursive: true, force: true });
  }
});

test("reviewed-source removes only recorded automatic headings and preserves user headings", () => {
  const fixture = makeFixture();
  try {
    const logs = path.join(fixture.fixtureDir, "wechat-publish-prep", "dry-run", "logs");
    fs.mkdirSync(logs, { recursive: true });
    fs.writeFileSync(path.join(logs, "workflow-context.json"), JSON.stringify({
      auto_section_headings: ["以前不是这样"],
    }));
    const markdown = syncFixtureHtml(fixture.draftPath,
      '<h2>以前不是这样</h2><p>过去的事实。</p><h2>但现在不一样了</h2><p style="text-align:center">用户居中强调的正文</p>');
    assert.doesNotMatch(markdown, /以前不是这样/);
    assert.match(markdown, /\n\n但现在不一样了\n\n/);
    assert.match(markdown, /\n\n用户居中强调的正文/);
    assert.doesNotMatch(markdown, /## 用户居中/);
  } finally {
    fs.rmSync(fixture.fixtureDir, { recursive: true, force: true });
  }
});

for (const baselineStatus of ["available", "missing", "draft-mismatch"]) {
  test(`mocked remote style readback handles ${baselineStatus} upload baseline`, () => {
    const fixture = makeFixture();
    try {
      const root = path.join(fixture.fixtureDir, "wechat-publish-prep");
      const logs = path.join(root, "logs");
      fs.mkdirSync(logs, { recursive: true });
      const requestPath = path.join(logs, "wechat-draft-request.json");
      const uploaded = JSON.stringify({ articles: [{ title: "原来的标题", content: '<p>先开始，再核验。</p>' }] });
      fs.writeFileSync(requestPath, uploaded);
      if (baselineStatus !== "missing") {
        fs.writeFileSync(path.join(logs, "wechat-draft-response.json"),
          JSON.stringify({ media_id: baselineStatus === "available" ? "current-id" : "another-draft" }));
      }
      // A saved readback context alone cannot prove that the upload belongs to this draft.
      fs.writeFileSync(path.join(logs, "workflow-context.json"), JSON.stringify({ draft_media_id: "current-id" }));
      const preload = path.join(fixture.fixtureDir, "mock-wechat.mjs");
      const article = { title: "改后的标题", content: '<p><strong>先核验。</strong><br>再开始。</p>' };
      fs.writeFileSync(preload, `
        globalThis.fetch = async (url, options = {}) => {
          const pathname = new URL(url).pathname;
          if (pathname === "/cgi-bin/token") return Response.json({ access_token: "mock-token" });
          if (pathname === "/cgi-bin/draft/get" && JSON.parse(options.body).media_id === "current-id") {
            return Response.json({ news_item: [${JSON.stringify(article)}] });
          }
          throw new Error("Unexpected request in isolated mock: " + pathname);
        };
      `);
      const result = JSON.parse(execFileSync(process.execPath,
        ["--import", pathToFileURL(preload).href, cliPath, "-Action", "sync-reviewed-source",
          "-FinalDraftPath", fixture.draftPath, "-DraftMediaId", "current-id"],
        { cwd: repoRoot, encoding: "utf8", env: { ...process.env, WECHAT_MP_APP_ID: "mock-app", WECHAT_MP_APP_SECRET: "mock-secret" } }));
      assert.equal(result.fetch_mode, "remote");
      assert.equal(result.baseline_status, baselineStatus);
      assert.equal(fs.readFileSync(result.style_feedback_source_path, "utf8"), '改后的标题\n\n先核验。\n再开始。\n');
      assert.equal(fs.readFileSync(requestPath, "utf8"), uploaded);
      if (baselineStatus === "available") {
        assert.equal(fs.readFileSync(result.style_feedback_baseline_path, "utf8"), '原来的标题\n\n先开始，再核验。\n');
      } else {
        assert.equal(result.style_feedback_baseline_path, null);
        assert.equal(result.uploaded_style_baseline_path, null);
      }
    } finally {
      fs.rmSync(fixture.fixtureDir, { recursive: true, force: true });
    }
  });
}

test("typeset keeps route metadata out of the published body", () => {
  const fixture = makeFixture();
  try {
    fs.writeFileSync(fixture.draftPath, '---\n内容类型: 实用文\n目标受众: 上班族\n文章目标: 立即上手\n---\n\n# 正式标题\n\n可发布正文。\n');
    const result = runCli(fixture.draftPath, "typeset");
    const html = fs.readFileSync(result.preview_html_path, "utf8");
    assert.equal(result.article_title, "正式标题");
    assert.match(html, /可发布正文/);
    assert.doesNotMatch(html, /内容类型|目标受众|文章目标|立即上手/);
  } finally {
    fs.rmSync(fixture.fixtureDir, { recursive: true, force: true });
  }
});

test("uploading an article preview resolves its images against the source article", () => {
  const fixture = makeFixture();
  try {
    fs.writeFileSync(fixture.draftPath, "# 测试标题\n\n过去的事实。\n\n![原始配图](wrong-ratio.png)\n");
    const preview = runCli(fixture.draftPath, "typeset");
    const upload = runCli(fixture.draftPath, "upload-draft", "-DryRun",
      "-HtmlPath", preview.preview_html_path,
      "-CoverImagePath", path.join(repoRoot, "tests/fixtures/cover-3760x1600.png"));
    const request = JSON.parse(fs.readFileSync(upload.draft_request_path, "utf8"));
    assert.match(request.articles[0].content, /https:\/\/example.invalid\/wechat-inline\/wrong-ratio.png/);
    const source = runCli(fixture.draftPath, "sync-reviewed-source", "-DraftMediaId", "dry", "-DryRun");
    const markdown = fs.readFileSync(source.reviewed_source_markdown_path, "utf8");
    assert.match(markdown, /过去的事实/);
    assert.doesNotMatch(markdown, /以前不是这样/);
  } finally {
    fs.rmSync(fixture.fixtureDir, { recursive: true, force: true });
  }
});

test("an opening between horizontal rules is not mistaken for route metadata", () => {
  const fixture = makeFixture();
  try {
    fs.writeFileSync(fixture.draftPath, '---\n应保留的引入。\n---\n\n# 测试标题\n\n正文。\n');
    const result = runCli(fixture.draftPath, "typeset");
    assert.match(fs.readFileSync(result.preview_html_path, "utf8"), /应保留的引入/);
  } finally {
    fs.rmSync(fixture.fixtureDir, { recursive: true, force: true });
  }
});
