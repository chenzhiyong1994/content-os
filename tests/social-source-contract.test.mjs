import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const workflowRules = read("docs/operations/workflow-rules.md");
const webAccessSetup = read("docs/operations/web-access-setup.md");
const hotspotStandard = read("docs/references/hotspot-collection-standard.md");
const hotspotSkill = read("skills/social-hotspot-collector/SKILL.md");
const activeContract = [workflowRules, webAccessSetup, hotspotStandard, hotspotSkill].join("\n");

test("browser setup stays provider-neutral and does not assume a local profile", () => {
  assert.match(activeContract, /不绑定.*Chrome.*Edge|不绑定.*Edge.*Chrome/);
  assert.match(activeContract, /用户明确指定/);
  assert.match(activeContract, /浏览器表面/);
  assert.doesNotMatch(activeContract, /ensure-edge-dev|openTabs\(\)|Edge Dev|C:\\Program Files/);
});
test("browser access never copies credentials or a user profile", () => {
  for (const term of ["profile", "cookie", "token", "密码"]) {
    assert.match(activeContract, new RegExp(term), `missing credential boundary: ${term}`);
  }
  assert.match(activeContract, /不得读取|不要读取/);
  assert.match(activeContract, /只关闭或释放本次任务创建的标签页/);
});

test("social source health requires usable content rather than a successful page load", () => {
  for (const term of ["登录态", "内容列表", "发布时间", "互动指标", "可用", "受限", "不可用"]) {
    assert.match(activeContract, new RegExp(term), `missing health-check term: ${term}`);
  }
  assert.match(activeContract, /HTTP 200|页面壳|空壳/);
  assert.match(activeContract, /X \/ Zhihu \/ Xiaohongshu \/ Jike \/ Weibo/);
});

test("degraded source coverage must be disclosed before continuing", () => {
  assert.match(activeContract, /停止并告知用户/);
  assert.match(activeContract, /缩减来源|降级/);
  assert.match(activeContract, /不得.*静默|不要自动/);
});
