import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

function publicFiles() {
  return execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: projectRoot },
  )
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter((relativePath) => fs.existsSync(path.join(projectRoot, relativePath)));
}

test("public defaults do not carry maintainer-specific service or identity values", () => {
  const exampleEnv = fs.readFileSync(path.join(projectRoot, ".env.example"), "utf8");
  for (const name of [
    "WECHAT_MP_APP_ID",
    "WECHAT_MP_APP_SECRET",
    "WECHAT_MP_AUTHOR",
    "CONTENT_OS_WRITER_COMMAND",
    "CONTENT_OS_WRITER_MODEL",
    "AIHOT_BASE_URL",
  ]) {
    assert.match(exampleEnv, new RegExp(`^${name}=\\s*$`, "m"));
  }
});

test("private working material is not part of the public file set", () => {
  const files = publicFiles().map((file) => file.replaceAll("\\", "/"));

  assert.ok(!files.some((file) => file.startsWith("workspace/")));
  assert.ok(!files.includes("docs/references/source-watchlist.md"));
  assert.deepEqual(
    files.filter((file) => file.startsWith("docs/references/style-examples/")),
    ["docs/references/style-examples/README.md"],
  );
  assert.ok(!files.some((file) => /^assets\/brand\/reference\./i.test(file)));
});

test("public text does not contain machine-home paths or credential-shaped tokens", () => {
  const textFiles = publicFiles().filter((relativePath) => {
    const normalized = relativePath.replaceAll("\\", "/");
    return !normalized.startsWith("assets/readme/") && !normalized.endsWith(".png");
  });

  for (const relativePath of textFiles) {
    const content = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
    assert.doesNotMatch(content, /[A-Za-z]:\\Users\\|\/Users\/[^/\s]+\/|\/home\/[^/\s]+\//);
    assert.doesNotMatch(content, /gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}/);
  }
});
