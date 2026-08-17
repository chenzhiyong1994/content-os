import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repoRoot, "scripts", "wechat-publish-prep.mjs");
const defaultEnv = {
  ...process.env,
  WECHAT_MP_AUTHOR: "",
  USERENV_WECHAT_MP_AUTHOR: "",
};
const configuredAuthorEnv = {
  ...defaultEnv,
  WECHAT_MP_AUTHOR: "示例作者",
};

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

function runCli(args, env = defaultEnv) {
  return execFileSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env,
  });
}

test("confirm-summary exposes the exact 2.35:1 cover size and no branded footer by default", () => {
  const { fixtureDir, draftPath } = makeFixture();
  try {
    const summary = JSON.parse(runCli([
      "-Action",
      "confirm-summary",
      "-FinalDraftPath",
      draftPath,
    ]));
    assert.equal(summary.image_size, "3760x1600");
    assert.equal(summary.cover_prepare_summary.aspect_ratio, "2.35:1");
    assert.equal(summary.wechat_author, "");
    assert.equal(summary.author_footer_enabled, false);
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});
test("upload-draft rejects a cover whose actual dimensions are not 2.35:1", () => {
  const { fixtureDir, draftPath, coverPath } = makeFixture();
  try {
    const result = spawnSync(
      process.execPath,
      [
        cliPath,
        "-Action",
        "upload-draft",
        "-FinalDraftPath",
        draftPath,
        "-CoverImagePath",
        coverPath,
        "-DryRun",
      ],
      { cwd: repoRoot, encoding: "utf8", env: defaultEnv },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /2\.35:1|3760x1600/);
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test("typeset does not inject a project-branded footer unless an author is configured", () => {
  const { fixtureDir, draftPath } = makeFixture();
  try {
    const result = JSON.parse(runCli([
      "-Action",
      "typeset",
      "-FinalDraftPath",
      draftPath,
    ]));
    const html = fs.readFileSync(result.preview_html_path, "utf8");

    assert.equal(result.author_footer_included, false);
    assert.doesNotMatch(html, /作者：|赞、在看、转发|设为星标/);
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test("typeset appends the configured author and engagement footer", () => {
  const { fixtureDir, draftPath } = makeFixture();
  try {
    const result = JSON.parse(runCli([
      "-Action",
      "typeset",
      "-FinalDraftPath",
      draftPath,
    ], configuredAuthorEnv));
    const html = fs.readFileSync(result.preview_html_path, "utf8");

    assert.equal(result.author_footer_included, true);
    assert.match(html, /作者：示例作者/);
    assert.match(html, /谢谢你读到最后🙇‍♂️/);
    assert.match(html, /赞、在看、转发/);
    assert.match(html, /设为.*星标.*⭐/s);
    assert.match(html, /评论区留言💬/);
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test("reviewed-source sync recognizes a configured author footer", () => {
  const { fixtureDir, draftPath } = makeFixture();
  try {
    const typesetResult = JSON.parse(runCli([
      "-Action",
      "typeset",
      "-FinalDraftPath",
      draftPath,
    ], configuredAuthorEnv));
    const html = fs.readFileSync(typesetResult.preview_html_path, "utf8");
    const logsDir = path.join(fixtureDir, "wechat-publish-prep", "logs");
    fs.mkdirSync(logsDir, { recursive: true });
    fs.writeFileSync(
      path.join(logsDir, "wechat-draft-request.json"),
      JSON.stringify({ articles: [{ title: "测试标题", author: "示例作者", content: html }] }),
      "utf8",
    );

    const syncResult = JSON.parse(runCli([
      "-Action",
      "sync-reviewed-source",
      "-FinalDraftPath",
      draftPath,
      "-DraftMediaId",
      "dry-run-footer",
      "-DryRun",
    ], configuredAuthorEnv));
    const reviewedMarkdown = fs.readFileSync(syncResult.reviewed_source_markdown_path, "utf8");

    assert.equal(syncResult.author_footer_detected, true);
    assert.match(reviewedMarkdown, /作者：示例作者/);
    assert.match(reviewedMarkdown, /赞、在看、转发/);
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});
