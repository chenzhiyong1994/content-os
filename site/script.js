const stages = [
  {
    category: "DISCOVERY / 选题",
    title: "从真实讨论里，找到值得写的问题。",
    description:
      "可先用 AI HOT 获取快速信号，再核验社交讨论与原始来源。根据文章类型、目标受众和写作目标确定方向。",
    artifact: "00_选题卡.md",
    detail: "进入完整写作流程时保存选题、内容类型、目标受众和文章目标。",
    check: "可选前置阶段；聚合摘要只作为线索。",
  },
  {
    category: "RESEARCH / 研究",
    title: "先研究清楚，再开始表达。",
    description:
      "围绕选题回到原始来源，整理关键事实、不同观点和证据边界，为后续写作准备可靠的材料。",
    artifact: "01_研究素材.md",
    detail: "核心发现、事实边界、来源列表，以及本篇文章的内容类型与目标受众。",
    check: "关键结论能回到原文核验。",
  },
  {
    category: "DRAFT / 起稿",
    title: "让材料，长成一篇文章。",
    description:
      "根据内容类型组织论证或操作路径。结合自己的代表作与风格画像，让第一版就有作者的判断和说话节奏。",
    artifact: "02_初稿.md",
    detail: "一篇完整初稿：标题、开头、正文与结尾，保留材料支持的事实和判断。",
    check: "深度文建立认知，实用文帮助读者行动。",
  },
  {
    category: "EDIT / 修改",
    title: "把逻辑理顺，把问题改实。",
    description:
      "检查事实、来源、结构和表达，补上论证缺口，减少重复与空泛表达，保护初稿中已经成立的声音。",
    artifact: "03_修改稿.md",
    detail: "编辑后的完整文章，以及有依据的问题处理和必要校验。",
    check: "事实、逻辑与已知表达问题在节点内检查。",
  },
  {
    category: "VOICE / 风格",
    title: "让文章，保有可辨认的作者。",
    description:
      "联合参考代表作，审视真实的风格缺口。比较候选与原稿，只采纳有净收益的改动；已经写好的部分可以保留。",
    artifact: "04_风格深化.md",
    detail: "保留或深化后的完整文章，延续原稿的事实精度、论证骨架与阅读节奏。",
    check: "每篇必做风格审视；改动幅度不是质量指标。",
  },
  {
    category: "FINAL / 终稿",
    title: "把反馈收好，把文章定下来。",
    description:
      "以风格深化稿为声音锚点，收束具体反馈与校验问题，完成最终稿，为后续按需发布准备提供稳定输入。",
    artifact: "05_最终稿.md",
    detail: "经过反馈收束与最终校验的文章，和前面每一版分别保存。",
    check: "保留已经成立的声音，核实最终事实与来源。",
  },
  {
    category: "PREPARE / 发布准备",
    title: "进入草稿箱，把最后判断交给你。",
    description:
      "按请求范围准备公众号排版、封面、预览和上传。外部动作需要明确授权；草稿箱中仍可人工审看和修改。",
    artifact: "wechat-publish-prep/",
    detail: "发布资产、预览和日志；执行上传时记录对应草稿与上传文本基线。",
    check: "发布准备面向公众号草稿箱。",
  },
  {
    category: "ILLUSTRATE / 配图",
    title: "需要的时候，让图片参与表达。",
    description:
      "读取当前草稿箱正文，围绕文章的解释需要规划插图。生成或更新前核对目标、数量、规格与已有授权。",
    artifact: "配图方案、图片和更新日志",
    detail: "按文章分别保存配图产物，草稿箱审看与可选配图完成后结束生产流程。",
    check: "可选阶段；独立的风格回读不作为配图输入。",
  },
];

const tabs = [...document.querySelectorAll("[data-stage]")];
const panel = document.getElementById("stage-panel");
const fields = {
  category: "stage-category",
  title: "stage-title",
  description: "stage-description",
  artifact: "stage-artifact",
  detail: "stage-detail",
  check: "stage-check",
};

function selectStage(index, moveFocus = false) {
  tabs.forEach((tab, position) => {
    tab.setAttribute("aria-selected", String(position === index));
    tab.tabIndex = position === index ? 0 : -1;
  });
  for (const [key, id] of Object.entries(fields))
    document.getElementById(id).textContent = stages[index][key];
  document.getElementById("stage-index").textContent = String(index).padStart(
    2,
    "0",
  );
  panel.setAttribute("aria-labelledby", tabs[index].id);
  if (moveFocus) tabs[index].focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectStage(index));
  tab.addEventListener("keydown", (event) => {
    const targets = {
      ArrowDown: (index + 1) % tabs.length,
      ArrowUp: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!(event.key in targets)) return;
    event.preventDefault();
    selectStage(targets[event.key], true);
  });
});

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.hidden = false;
  let resetTimer;
  const label = button.textContent;
  button.addEventListener("click", async () => {
    const source = document.getElementById(button.dataset.copy);
    const status = document.getElementById("copy-status");
    clearTimeout(resetTimer);
    try {
      await navigator.clipboard.writeText(source.textContent.trim());
      button.textContent = "已复制 ✓";
      status.textContent = "已复制，可以粘贴到你的终端或 Agent 对话中。";
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(source);
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = "请手动复制";
      status.textContent =
        "浏览器未允许自动复制。文本已选中，请按 Ctrl+C 或 ⌘C 复制。";
    }
    resetTimer = setTimeout(() => {
      button.textContent = label;
    }, 2400);
  });
});
