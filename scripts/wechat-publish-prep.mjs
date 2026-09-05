import fs from "node:fs/promises";
import { extractWechatStyleText } from "./wechat-reviewed-source.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WECHAT_COVER_RATIO = 2.35;
function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("-")) {
      continue;
    }

    const key = token.replace(/^-+/, "");
    const next = argv[i + 1];
    if (next && !next.startsWith("-")) {
      parsed[key] = next;
      i += 1;
      continue;
    }

    parsed[key] = true;
  }
  return parsed;
}

function required(value, name) {
  if (!value) {
    throw new Error(`Missing required argument: ${name}`);
  }
  return value;
}

function boolFlag(value) {
  return value === true || value === "true" || value === "1";
}

function envOrUser(name) {
  return process.env[name] || process.env[`USERENV_${name}`] || "";
}

function normalizeWechatAuthor(author) {
  return String(author || "").trim();
}

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, "\n");
}

function stripFrontmatter(markdown) {
  return normalizeNewlines(markdown).replace(/^\uFEFF/, "")
    .replace(/^---\n([\s\S]*?)\n---(?:\n|$)/, (block, fields) =>
      /^(?:内容类型|目标受众|文章目标)\s*:/m.test(fields) ? "" : block);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function protectCodeSpaces(text) {
  return escapeHtml(text).replace(/ /g, "&nbsp;");
}

function mimeTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "image/png";
  }
}

function parseImageSize(value) {
  const match = String(value || "").trim().match(/^(\d+)x(\d+)$/i);
  if (!match) {
    throw new Error(`Invalid cover image size: ${value}. Expected WIDTHxHEIGHT.`);
  }
  return { width: Number(match[1]), height: Number(match[2]) };
}

function parseAspectRatio(value) {
  const match = String(value || "").trim().match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!match || Number(match[2]) === 0) {
    throw new Error(`Invalid cover aspect ratio: ${value}. Expected W:H.`);
  }
  return Number(match[1]) / Number(match[2]);
}

function assertCoverSpecification(width, height, expectedSize, expectedRatio) {
  if (expectedSize.width !== 3760 || expectedSize.height !== 1600) {
    throw new Error("WeChat cover output is fixed at 3760x1600; size overrides must match this specification.");
  }
  if (Math.abs(expectedRatio - WECHAT_COVER_RATIO) > 0.001) {
    throw new Error(`WeChat cover aspect ratio is fixed at 2.35:1; received ${expectedRatio.toFixed(4)}:1.`);
  }
  const ratio = width / height;
  if (Math.abs(ratio - WECHAT_COVER_RATIO) > 0.001) {
    throw new Error(
      `WeChat cover must use a 2.35:1 aspect ratio; received ${width}x${height} (${ratio.toFixed(4)}:1).`,
    );
  }
  if (width !== expectedSize.width || height !== expectedSize.height) {
    throw new Error(
      `WeChat cover must be ${expectedSize.width}x${expectedSize.height}; received ${width}x${height}.`,
    );
  }
}

async function readPngDimensions(filePath) {
  const buffer = await fs.readFile(filePath);
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error(`WeChat cover must be a PNG so its dimensions can be validated: ${filePath}`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
  return dirPath;
}

async function saveUtf8(filePath, content) {
  await fs.writeFile(filePath, content, "utf8");
}

async function saveJson(filePath, data) {
  await saveUtf8(filePath, JSON.stringify(data, null, 2));
}

async function readJsonIfExists(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function getDraftboxTypesetArtifacts(markdown, articleTitleOverride, author = "") {
  const articleTitle = getArticleTitle(markdown, articleTitleOverride);
  const titledMarkdown = applyTitleOverride(markdown, articleTitleOverride);
  const footerInjectedMarkdown = appendAuthorFooter(titledMarkdown, author);
  const normalizedMarkdown = normalizeLegacyWechatMarkdown(footerInjectedMarkdown);
  const structuredMarkdown = normalizeArticleStructureForWechat(normalizedMarkdown, articleTitle);
  const autoSectionHeadings = []; // Public defaults do not invent section headings.
  const optimizedInternalMarkdown = optimizeMarkdownForWechat(structuredMarkdown);
  const optimizedMarkdown = denormalizeWechatMarkdown(optimizedInternalMarkdown);
  const html = convertMarkdownToWechatHtml(optimizedInternalMarkdown, articleTitle);
  return {
    articleTitle,
    optimizedInternalMarkdown,
    optimizedMarkdown,
    html,
    autoSectionHeadings,
  };
}

function normalizeLegacyWechatMarkdown(markdown) {
  return normalizeNewlines(markdown)
    .replace(/<quote-container>/gi, ":::quote")
    .replace(/<\/quote-container>/gi, ":::")
    .replace(/<text\s+color=["']red["']\s*>/gi, "@@RED_START@@")
    .replace(/<\/text>/gi, "@@RED_END@@");
}

function denormalizeWechatMarkdown(markdown) {
  return normalizeNewlines(markdown)
    .replace(/^:::quote\s*$/gm, "<quote-container>")
    .replace(/^:::\s*$/gm, "</quote-container>")
    .replace(/@@RED_START@@/g, '<text color="red">')
    .replace(/@@RED_END@@/g, "</text>");
}

function buildAuthorFooterMarkdown(author) {
  return [
    "<quote-container>",
    "",
    `>/ 作者：${normalizeWechatAuthor(author)}`,
    "",
    "谢谢你读到最后🙇‍♂️",
    "",
    "如果刚好让你有一点收获，不妨点个「赞、在看、转发」三连🙏",
    "",
    "想第一时间看到下一篇，可以顺手把我设为星标⭐",
    "",
    "有不同的想法，欢迎评论区留言💬",
    "</quote-container>",
  ].join("\n");
}

const WECHAT_ACCENT_RED = "#c63b32";
const WECHAT_ACCENT_BORDER = "#e7d3d0";
const WECHAT_QUOTE_BG = "#f7f3f1";

function hasAuthorFooter(markdown) {
  return /作者：[^\n<]+/.test(markdown)
    && /谢谢你读到最后/.test(markdown)
    && /赞、在看、转发/.test(markdown)
    && /设为星标/.test(markdown)
    && /评论区留言/.test(markdown);
}

function appendAuthorFooter(markdown, author) {
  const normalizedAuthor = normalizeWechatAuthor(author);
  if (!normalizedAuthor || hasAuthorFooter(markdown)) {
    return markdown;
  }
  return `${normalizeNewlines(markdown).trimEnd()}\n\n${buildAuthorFooterMarkdown(normalizedAuthor)}\n`;
}

function isAuthorFooterContent(text) {
  return hasAuthorFooter(text);
}

function getBlocks(markdown) {
  const blocks = [];
  const lines = normalizeNewlines(markdown).split("\n");
  let current = [];
  let inFence = false;
  let inQuoteContainer = false;

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      current.push(line);
      inFence = !inFence;
      continue;
    }

    if (!inFence && line.trim() === ":::quote") {
      if (current.length > 0) {
        blocks.push(current.join("\n").trimEnd());
        current = [];
      }
      current.push(line.trim());
      inQuoteContainer = true;
      continue;
    }

    if (!inFence && inQuoteContainer) {
      current.push(line);
      if (line.trim() === ":::") {
        blocks.push(current.join("\n").trimEnd());
        current = [];
        inQuoteContainer = false;
      }
      continue;
    }

    if (!inFence && line.trim() === "") {
      if (current.length > 0) {
        blocks.push(current.join("\n").trimEnd());
        current = [];
      }
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    blocks.push(current.join("\n").trimEnd());
  }

  return blocks;
}

function isPlainParagraphBlock(block) {
  if (/^\s*#/.test(block)) return false;
  if (/^\s*>/.test(block)) return false;
  if (/^\s*:::quote/.test(block)) return false;
  if (/^\s*(?:[-*+]|\d+\.)\s+/.test(block)) return false;
  if (block.trimStart().startsWith("```")) return false;
  if (/^\s*---+\s*$/.test(block)) return false;
  if (/^\s*!\[[^\]]*]\([^)]+\)\s*$/.test(block)) return false;
  return true;
}

function stripCustomMarkers(text) {
  return text
    .replace(/@@RED_START@@/g, "")
    .replace(/@@RED_END@@/g, "")
    .replace(/^:::quote\s*$/gm, "")
    .replace(/^:::\s*$/gm, "");
}

function hasExplicitRedMarker(text) {
  return /@@RED_START@@[\s\S]+?@@RED_END@@/.test(text);
}

function isExplicitRedBlock(block) {
  return /^@@RED_START@@[\s\S]+@@RED_END@@$/.test(block.trim());
}

function getExplicitRedContent(block) {
  const match = block.trim().match(/^@@RED_START@@([\s\S]+)@@RED_END@@$/);
  return match ? match[1].trim() : "";
}

function isQuoteContainerBlock(block) {
  return /^:::quote\b/.test(block.trim());
}

function getQuoteContainerContent(block) {
  return block
    .replace(/^:::quote\s*/i, "")
    .replace(/\n:::\s*$/i, "")
    .trim();
}

function shouldKeepSentenceSolo(sentence) {
  const normalized = stripCustomMarkers(sentence).replace(/\s+/g, " ").trim();
  if (!normalized) return false;

  const strongPattern = /(不是.+而是|更麻烦的是|更要命的是|真正|问题在于|也就是说|换句话说|所以|于是|以后|过去|现在|最难受的|最不舒服的|这也是为什么|这句话|意味着)/;
  if (strongPattern.test(normalized)) return true;
  if (normalized.length >= 28) return true;
  if (/：$/.test(normalized)) return true;
  return false;
}

function splitChineseSentences(text) {
  return text
    .match(/[^。！？!?]+[。！？!?]+[”’"」』]?|[^。！？!?]+$/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [];
}

function splitParagraphForWechat(block) {
  const text = block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("")
    .replace(/([。！？；：，、])\s+/g, "$1")
    .trim();

  if (!text) return [];
  if (text.length <= 58) return [text];

  const sentences = splitChineseSentences(text);
  if (sentences.length === 0) return [text];

  const paragraphs = [];
  let current = "";
  let sentenceCount = 0;

  for (const sentenceRaw of sentences) {
    const sentence = sentenceRaw.trim();
    if (!sentence) continue;

    if (!current) {
      current = sentence;
      sentenceCount = 1;
      continue;
    }

    const candidate = `${current}${sentence}`.trim();
    const keepSeparate = shouldKeepSentenceSolo(current) || shouldKeepSentenceSolo(sentence);
    if (!keepSeparate && candidate.length <= 52 && sentenceCount < 2) {
      current = candidate;
      sentenceCount += 1;
      continue;
    }

    paragraphs.push(current.trim());
    current = sentence;
    sentenceCount = 1;
  }

  if (current) {
    paragraphs.push(current.trim());
  }

  return paragraphs.length > 0 ? paragraphs : [text];
}

function optimizeMarkdownForWechat(markdown) {
  const optimized = [];
  for (const block of getBlocks(markdown)) {
    if (isQuoteContainerBlock(block) || isExplicitRedBlock(block)) {
      optimized.push(block.trim());
      continue;
    }
    if (isPlainParagraphBlock(block)) {
      optimized.push(...splitParagraphForWechat(block));
      continue;
    }
    optimized.push(block.trim());
  }
  return `${optimized.filter(Boolean).join("\n\n").trim()}\n`;
}

function getOrCreateFootnote(context, label, url) {
  if (!context) return null;
  if (!context.byUrl.has(url)) {
    const entry = {
      index: context.items.length + 1,
      label,
      url,
    };
    context.byUrl.set(url, entry);
    context.items.push(entry);
  }
  return context.byUrl.get(url);
}

function convertInlineMarkdown(text, context = null) {
  const codeTokens = [];
  const linkTokens = [];
  const redTokens = [];
  const breakToken = "@@BR@@";
  let working = text.replace(/<br\s*\/?>/gi, breakToken).replace(/`([^`]+)`/g, (_, code) => {
    const token = `@@CODE${codeTokens.length}@@`;
    codeTokens.push(
      `<code style="background:#f3f5f7;color:#1f2937;padding:2px 6px;border-radius:4px;font-size:0.9em;font-family:'Consolas','SFMono-Regular',monospace;">${protectCodeSpaces(code)}</code>`,
    );
    return token;
  });

  working = working.replace(/@@RED_START@@([\s\S]*?)@@RED_END@@/g, (_, inner) => {
    const token = `@@RED${redTokens.length}@@`;
    redTokens.push(inner);
    return token;
  });

  working = working.replace(/\[(.+?)]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => {
    const token = `@@LINK${linkTokens.length}@@`;
    if (context?.mode === "footnote") {
      const footnote = getOrCreateFootnote(context, label, url);
      linkTokens.push(
        `<span style="color:#1f2937;">${escapeHtml(label)}</span><sup style="margin-left:2px;color:${WECHAT_ACCENT_RED};font-size:0.75em;font-weight:700;">[${footnote.index}]</sup>`,
      );
      return token;
    }

    linkTokens.push(
      `<a href="${escapeHtml(url)}" style="color:${WECHAT_ACCENT_RED};text-decoration:none;border-bottom:1px solid ${WECHAT_ACCENT_BORDER};">${escapeHtml(label)}</a>`,
    );
    return token;
  });

  working = escapeHtml(working);
  working = working.replace(
    /\*\*\*(.+?)\*\*\*/g,
    '<strong style="color:#111827;font-weight:700;"><em style="font-style:italic;color:#374151;">$1</em></strong>',
  );
  working = working.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#111827;font-weight:700;">$1</strong>');
  working = working.replace(/__(.+?)__/g, '<strong style="color:#111827;font-weight:700;">$1</strong>');
  working = working.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em style="font-style:italic;color:#374151;">$1</em>');

  for (let i = 0; i < codeTokens.length; i += 1) {
    working = working.replace(`@@CODE${i}@@`, codeTokens[i]);
  }

  for (let i = 0; i < linkTokens.length; i += 1) {
    working = working.replace(`@@LINK${i}@@`, linkTokens[i]);
  }

  for (let i = 0; i < redTokens.length; i += 1) {
    working = working.replace(
      `@@RED${i}@@`,
      `<span style="color:${WECHAT_ACCENT_RED};font-weight:700;">${convertInlineMarkdown(redTokens[i], context)}</span>`,
    );
  }

  working = working.replaceAll(breakToken, "<br />");

  return working;
}

function getPlainTextFromBlock(block) {
  return stripCustomMarkers(block)
    .replace(/!\[[^\]]*]\(([^)]+)\)/g, "")
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/^\s*>\s*/gm, "")
    .replace(/^\s*(?:[-*+]|\d+\.)\s*/gm, "")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractWechatTemplateTitle(block) {
  const normalized = normalizeNewlines(block).trim();
  if (!/<section\b/i.test(normalized) || !/mpa-paragraph-type=["']title["']/i.test(normalized)) {
    return "";
  }

  const text = convertInlineHtmlToMarkdown(normalized)
    .replace(/\s+/g, " ")
    .trim();

  return text;
}
function countSentences(text) {
  return splitChineseSentences(text).length;
}

function buildDeck(markdown, articleTitle) {
  const candidates = getBlocks(markdown)
    .map((block) => block.trim())
    .filter((block) => {
      if (!block) return false;
      if (/^#/.test(block)) return false;
      if (/^##/.test(block)) return false;
      if (/^###/.test(block)) return false;
      if (/^\s*>/.test(block)) return false;
      if (/^\s*(?:[-*+]|\d+\.)\s+/.test(block)) return false;
      if (block.trimStart().startsWith("```")) return false;
      return true;
    });

  const firstPlain = candidates[0] ? getPlainTextFromBlock(candidates[0]) : "";
  const secondPlain = candidates[1] ? getPlainTextFromBlock(candidates[1]) : "";
  const merged = firstPlain || secondPlain || candidates
    .slice(0, 2)
    .map((block) => getPlainTextFromBlock(block))
    .filter(Boolean)
    .join(" ");
  const source = merged || getPlainTextFromMarkdown(markdown);
  const titleText = articleTitle ? articleTitle.trim() : "";
  const withoutTitle = source.startsWith(titleText) ? source.slice(titleText.length).trim() : source;
  if (withoutTitle.length <= 42) return withoutTitle;
  return `${withoutTitle.slice(0, 42).trim()}…`;
}

function shouldRenderAsHighlight(blockText, state) {
  if (state.firstParagraph) return false;
  if (state.highlightCount >= 8) return false;
  if (state.normalSinceHighlight < 1) return false;

  const normalized = stripCustomMarkers(blockText).trim();
  const length = normalized.length;
  const sentenceCount = countSentences(normalized);
  const keywordPattern = /(不是.+而是|说得更直白一点|真正的变化是|值得我们提前适应的|问题从来不是|第一位考官|第一关|没有被看见|更麻烦的是|更早发生的|这也是为什么|最难受的|最不舒服的|以后|以前|现在|意味着|工牌|议价权)/;
  const questionPattern = /[？?]$/;

  const isCandidateLength = length >= 12 && length <= 84;
  const hasStrongPattern = keywordPattern.test(normalized) || questionPattern.test(normalized);

  return isCandidateLength && sentenceCount <= 2 && hasStrongPattern;
}

function getAccentClause(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const patterns = [
    /^(这不是在教人变得模板化，而是在承认一个新的现实：?)/,
    /^(说得直白一点，[^\n。！？!?；;]{8,88})/,
    /^(这也是为什么[^\n。！？!?；;]{8,88})/,
    /^(所以这轮变化真正改写的[^\n。！？!?；;]{8,88})/,
    /^(真正让人心里发紧的[^\n。！？!?；;]{8,88})/,
    /^(但我越来越觉得[^\n。！？!?；;]{8,88})/,
    /^(它是在慢慢逼我们承认[^\n。！？!?；;]{8,88})/,
    /^(以后更常见的场景[^\n。！？!?；;]{8,88})/,
    /^(但[^。！？!?；;]{10,64})/,
    /^(所以[^。！？!?；;]{10,64})/,
    /^(真正[^。！？!?；;]{10,52})/,
    /^(难的是[^。！？!?；;]{4,48})/,
    /^(问题在于[^。！？!?；;]{4,48})/,
    /(不是[^。！？!?；;]{6,48}，而是[^。！？!?；;]{6,56})/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function renderInlineWithAccent(text, context = null) {
  const accent = getAccentClause(text);
  if (!accent || text.trim().length > 44 || accent.length > 24) {
    return convertInlineMarkdown(text, context);
  }

  const token = "@@ACCENT@@";
  const marked = text.replace(accent, token);
  return convertInlineMarkdown(marked, context).replace(
    token,
    `<span style="color:${WECHAT_ACCENT_RED};font-weight:700;">${convertInlineMarkdown(accent, context)}</span>`,
  );
}

function shouldRenderAsShortBreak(text, isFirstParagraph) {
  if (isFirstParagraph) return false;
  const normalized = stripCustomMarkers(text).trim();
  if (!normalized) return false;
  if (countSentences(normalized) !== 1) return false;
  const compact = normalized.replace(/[。！？!?]/g, "").trim();
  if (compact.length > 14) return false;
  if (/[，、：；,.]/.test(compact)) return false;
  return true;
}

function isStandaloneQuotedParagraph(text) {
  const normalized = stripCustomMarkers(text).trim();
  if (!normalized) return false;
  if (normalized.length > 72) return false;
  return /^(["“‘「『]).+(["”’」』])$/.test(normalized);
}

function applyTitleOverride(markdown, overrideTitle) {
  if (!overrideTitle) {
    return markdown;
  }

  const normalizedTitle = overrideTitle.trim();
  if (!normalizedTitle) {
    return markdown;
  }

  if (/^#\s+.+$/m.test(markdown)) {
    return markdown.replace(/^#\s+.+$/m, `# ${normalizedTitle}`);
  }

  return `# ${normalizedTitle}\n\n${markdown.trimStart()}`;
}

function isChineseNumberedHeading(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!/^[一二三四五六七八九十百千万零〇两]{1,4}[、.．]\s*\S+/.test(normalized)) {
    return false;
  }
  if (normalized.length > 32) {
    return false;
  }
  return !/[。！？!?；;：:]$/.test(normalized);
}

function normalizeArticleStructureForWechat(markdown, articleTitle = "") {
  const normalizedTitle = articleTitle.trim();
  let titleRemoved = false;
  let numberedHeadingCount = 0;
  const output = [];

  for (const block of getBlocks(markdown)) {
    const trimmed = block.trim();
    const plain = getPlainTextFromBlock(trimmed);

    if (!titleRemoved && normalizedTitle && plain === normalizedTitle && !/^#\s+/.test(trimmed)) {
      output.push(`# ${normalizedTitle}`);
      titleRemoved = true;
      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      titleRemoved = titleRemoved || /^#\s+/.test(trimmed);
      output.push(trimmed);
      continue;
    }

    const templateTitle = extractWechatTemplateTitle(trimmed);
    if (templateTitle) {
      if (!titleRemoved && normalizedTitle && templateTitle === normalizedTitle) {
        titleRemoved = true;
        continue;
      }
      output.push(`## ${templateTitle}`);
      continue;
    }

    if (isChineseNumberedHeading(plain)) {
      numberedHeadingCount += 1;
      if (numberedHeadingCount === 1) {
        continue;
      }
      output.push(`## ${plain}`);
      continue;
    }

    output.push(trimmed);
  }

  return `${output.filter(Boolean).join("\n\n").trim()}\n`;
}

function convertMarkdownToWechatHtml(markdown, articleTitle) {
  // Public default preset; projects can customize styles without changing content semantics.
  const bodyFontSize = 15;
  const bodyLineHeight = 28;
  const bodyParagraphMargin = 22;
  const sectionTitleFontSize = 18;
  const sectionTitleLineHeight = 28;
  const wrapperStyle = "padding:0 2px;color:#2b2b2b;";
  const baseTextStyle = `font-size:${bodyFontSize}px;line-height:${bodyLineHeight}px;color:#3d3d3d;letter-spacing:0.4px;`;
  const pStyle = `margin:0 8px ${bodyParagraphMargin}px 8px;${baseTextStyle}`;
  const leadStyle = pStyle;
  const bridgeStyle = `margin:0 8px ${bodyParagraphMargin}px 8px;color:${WECHAT_ACCENT_RED};font-size:${bodyFontSize}px;line-height:${bodyLineHeight}px;font-weight:700;letter-spacing:0.4px;`;
  const sectionDividerMargin = 24;
  const sectionDividerWrapStyle = `margin:${sectionDividerMargin}px 8px ${sectionDividerMargin}px 8px;text-align:center;color:${WECHAT_ACCENT_BORDER};font-size:14px;line-height:14px;letter-spacing:3px;`;
  const renderSectionDivider = () => `<p style="${sectionDividerWrapStyle}">— · —</p>`;
  const h2TextWrapStyle = "margin:0 8px 24px 8px;text-align:center;";
  const h2Style = `display:inline-block;padding:4px 16px;background:${WECHAT_QUOTE_BG};color:${WECHAT_ACCENT_RED};font-size:${sectionTitleFontSize}px;line-height:${sectionTitleLineHeight}px;font-weight:700;letter-spacing:0;border-radius:999px;`;
  const h3TextWrapStyle = "margin:0 8px 24px 8px;text-align:center;";
  const h3Style = `display:inline-block;padding:4px 16px;background:${WECHAT_QUOTE_BG};color:${WECHAT_ACCENT_RED};font-size:${sectionTitleFontSize}px;line-height:${sectionTitleLineHeight}px;font-weight:700;letter-spacing:0;border-radius:999px;`;
  const quoteStyle = `margin:0 8px ${bodyParagraphMargin}px 8px;padding:14px 16px;background:${WECHAT_QUOTE_BG};color:#5a403d;font-size:${bodyFontSize}px;line-height:${bodyLineHeight}px;border-left:4px solid ${WECHAT_ACCENT_RED};border-radius:6px;`;
  const quoteContainerStyle = `margin:28px 8px;padding:18px 18px;background:${WECHAT_QUOTE_BG};border-left:4px solid ${WECHAT_ACCENT_RED};border-radius:6px;`;
  const quoteParagraphStyle = `margin:0 0 ${bodyParagraphMargin}px 0;font-size:${bodyFontSize}px;line-height:${bodyLineHeight}px;color:#5a403d;`;
  const fixedAuthorParagraphStyle = `margin:0 8px ${bodyParagraphMargin}px 8px;font-size:${bodyFontSize}px;line-height:${bodyLineHeight}px;color:#3d3d3d;letter-spacing:0.4px;`;
  const fixedAuthorTextStyle = "font-size:14px;color:#b2b2b2;";
  const fixedFooterDividerStyle = "border-style:solid;border-width:1px 0 0;border-color:rgba(0,0,0,0.1);-webkit-transform-origin:0 0;-webkit-transform:scale(1,0.5);transform-origin:0 0;transform:scale(1,0.5);";
  const fixedCtaFirstParagraphStyle = "text-align:left;margin-top:16px;";
  const fixedCtaParagraphStyle = "text-align:left;";
  const fixedCtaTextStyle = "font-size:15px;color:#888888;line-height:1.6;letter-spacing:0.034em;font-style:normal;font-weight:normal;";
  const fixedCtaEmphasisStyle = "font-size:15px;color:#000000;font-weight:normal;";
  const pullQuoteStyle = `margin:0 8px ${bodyParagraphMargin}px 8px;padding:0;color:${WECHAT_ACCENT_RED};font-size:${bodyFontSize}px;line-height:${bodyLineHeight}px;font-weight:700;letter-spacing:0.4px;`;
  const listStyle = `margin:0 8px ${bodyParagraphMargin}px 8px;padding-left:24px;${baseTextStyle}`;
  const itemStyle = `margin:0 0 ${bodyParagraphMargin}px 0;padding-left:2px;${baseTextStyle}`;
  const preStyle = "margin:28px 8px;padding:16px 18px;background:#171717;color:#f6f3ef;border-radius:4px;overflow-x:auto;font-size:13px;line-height:1.8;font-family:'Consolas','SFMono-Regular',monospace;";
  const figureStyle = "margin:30px 8px 12px 8px;text-align:center;";
  const imgStyle = "max-width:100%;height:auto;border-radius:2px;display:block;margin:0 auto;";
  const captionStyle = "margin:10px 8px 0 8px;font-size:12px;line-height:1.75;color:#9aa4af;text-align:center;";
  const footnoteTitleStyle = `margin:30px 8px 12px 8px;font-size:${bodyFontSize}px;line-height:${bodyLineHeight}px;color:#8d4b43;font-weight:700;letter-spacing:0;`;
  const footnoteStyle = `margin:0 8px ${bodyParagraphMargin}px 8px;font-size:${bodyFontSize}px;line-height:${bodyLineHeight}px;color:#765651;`;
  const footnoteContext = {
    mode: "footnote",
    byUrl: new Map(),
    items: [],
  };

  const lines = [`<div style="${wrapperStyle}">`];

  let firstParagraph = true;
  let titleSkipped = false;
  const highlightState = {
    firstParagraph: true,
    highlightCount: 0,
    normalSinceHighlight: 5,
  };

  const blocks = getBlocks(markdown);
  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const block = blocks[blockIndex];
    const h1 = block.match(/^#\s+(.+)$/);
    if (h1 && !titleSkipped && h1[1].trim() === articleTitle) {
      titleSkipped = true;
      continue;
    }

    const h2 = block.match(/^##\s+(.+)$/);
    if (h2) {
      lines.push(renderSectionDivider());
      lines.push(`<p style="${h2TextWrapStyle}"><span style="${h2Style}">${convertInlineMarkdown(h2[1].trim(), footnoteContext)}</span></p>`);
      continue;
    }

    const h3 = block.match(/^###\s+(.+)$/);
    if (h3) {
      lines.push(renderSectionDivider());
      lines.push(`<p style="${h3TextWrapStyle}"><span style="${h3Style}">${convertInlineMarkdown(h3[1].trim(), footnoteContext)}</span></p>`);
      continue;
    }

    if (h1) {
      continue;
    }

    if (h2 || h3 || h1) {
      highlightState.normalSinceHighlight += 1;
    }

    if (/^\s*---+\s*$/.test(block)) {
      const previousBlock = blocks[blockIndex - 1] || "";
      const nextBlock = blocks[blockIndex + 1] || "";
      const adjacentToHeading = /^#{1,3}\s+/.test(previousBlock.trim()) || /^#{1,3}\s+/.test(nextBlock.trim());
      if (adjacentToHeading) {
        highlightState.normalSinceHighlight += 1;
        continue;
      }
      lines.push(renderSectionDivider());
      highlightState.normalSinceHighlight += 1;
      continue;
    }

    if (block.trimStart().startsWith("```")) {
      const codeLines = block.split(/\r?\n/);
      const codeContent = codeLines.length > 2 ? codeLines.slice(1, -1).join("\n") : "";
      lines.push(`<pre style="${preStyle}"><code>${escapeHtml(codeContent)}</code></pre>`);
      highlightState.normalSinceHighlight += 1;
      continue;
    }

    if (isQuoteContainerBlock(block)) {
      const quoteContent = getQuoteContainerContent(block);
      if (isAuthorFooterContent(quoteContent)) {
        const footerAuthor = quoteContent.match(/作者：([^\n<]+)/)?.[1]?.trim() || "";
        lines.push(`<p style="${fixedAuthorParagraphStyle}"><span style="${fixedAuthorTextStyle}">&gt;/ 作者：${escapeHtml(footerAuthor)}</span></p>`);
        lines.push(`<hr style="${fixedFooterDividerStyle}" />`);
        lines.push(`<p style="${fixedCtaFirstParagraphStyle}"><span style="${fixedCtaTextStyle}">谢谢你读到最后🙇‍♂️</span></p>`);
        lines.push(`<p style="${fixedCtaParagraphStyle}"><span style="${fixedCtaTextStyle}">如果刚好让你有一点收获，不妨点个「</span><span style="${fixedCtaEmphasisStyle}">赞、在看、转发</span><span style="${fixedCtaTextStyle}">」三连🙏</span></p>`);
        lines.push(`<p style="${fixedCtaParagraphStyle}"><span style="${fixedCtaTextStyle}">想第一时间看到下一篇，可以顺手把我设为</span><span style="${fixedCtaEmphasisStyle}">星标</span><span style="${fixedCtaTextStyle}">⭐</span></p>`);
        lines.push(`<p style="${fixedCtaParagraphStyle}"><span style="${fixedCtaTextStyle}">有不同的想法，欢迎评论区留言💬</span></p>`);
        highlightState.normalSinceHighlight = 0;
        highlightState.highlightCount += 1;
        continue;
      }
      const quoteBlocks = getBlocks(quoteContent);
      lines.push(`<blockquote style="${quoteContainerStyle}">`);
      for (const quoteBlock of quoteBlocks) {
        const text = quoteBlock.trim();
        if (!text) continue;
        lines.push(`<p style="${quoteParagraphStyle}">${convertInlineMarkdown(text, footnoteContext)}</p>`);
      }
      lines.push("</blockquote>");
      highlightState.normalSinceHighlight = 0;
      highlightState.highlightCount += 1;
      continue;
    }

    const imageOnly = block.match(/^\s*!\[(.*?)\]\((.*?)\)\s*$/);
    if (imageOnly) {
      const [, alt, src] = imageOnly;
      lines.push(`<p style="${figureStyle}"><img src="${escapeHtml(src.trim())}" alt="${escapeHtml(alt.trim())}" style="${imgStyle}" /></p>`);
      if (alt.trim()) {
        lines.push(`<p style="${captionStyle}">${escapeHtml(alt.trim())}</p>`);
      }
      highlightState.normalSinceHighlight += 1;
      continue;
    }

    if (/^\s*>/.test(block)) {
      const quoteText = block
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*>\s?/, "").trim())
        .filter(Boolean)
        .join("<br />");
      lines.push(`<p style="${quoteStyle}">${convertInlineMarkdown(quoteText, footnoteContext)}</p>`);
      highlightState.normalSinceHighlight = 0;
      highlightState.highlightCount += 1;
      continue;
    }

    if (/^\s*(?:[-*+]|\d+\.)\s+/.test(block)) {
      const listLines = block.split(/\r?\n/);
      const ordered = /^\s*\d+\.\s+/.test(listLines[0] || "");
      const tag = ordered ? "ol" : "ul";
      lines.push(`<${tag} style="${listStyle}">`);
      for (const line of listLines) {
        const match = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.*)$/);
        if (match) {
          lines.push(`<li style="${itemStyle}">${renderInlineWithAccent(match[1].trim(), footnoteContext)}</li>`);
        }
      }
      lines.push(`</${tag}>`);
      highlightState.normalSinceHighlight += 1;
      continue;
    }

    const paragraphStyle = firstParagraph ? leadStyle : pStyle;
    const paragraphText = getPlainTextFromBlock(block);
    const explicitRedText = isExplicitRedBlock(block) ? getExplicitRedContent(block) : "";
    const useQuoteCard = isStandaloneQuotedParagraph(paragraphText);
    const useHighlight = Boolean(explicitRedText) || shouldRenderAsHighlight(paragraphText, highlightState);
    const useShortBreak = shouldRenderAsShortBreak(paragraphText, firstParagraph);
    firstParagraph = false;
    highlightState.firstParagraph = false;

    if (useQuoteCard) {
      lines.push(`<p style="${quoteStyle}">${convertInlineMarkdown(block.trim(), footnoteContext)}</p>`);
      highlightState.normalSinceHighlight = 0;
      highlightState.highlightCount += 1;
      continue;
    }

    if (useHighlight) {
      lines.push(`<p style="${pullQuoteStyle}">${convertInlineMarkdown((explicitRedText || block).trim(), footnoteContext)}</p>`);
      highlightState.highlightCount += 1;
      highlightState.normalSinceHighlight = 0;
      continue;
    }

    lines.push(`<p style="${useShortBreak ? bridgeStyle : paragraphStyle}">${renderInlineWithAccent(block.trim(), footnoteContext)}</p>`);
    highlightState.normalSinceHighlight += 1;
  }

  if (footnoteContext.items.length > 0) {
    lines.push(renderSectionDivider());
    lines.push(`<p style="${footnoteTitleStyle}">参考链接</p>`);
    for (const item of footnoteContext.items) {
      lines.push(
        `<p style="${footnoteStyle}"><strong style="color:#6e2d2a;">[${item.index}]</strong> ${escapeHtml(item.label)}：<span style="color:${WECHAT_ACCENT_RED};word-break:break-all;">${escapeHtml(item.url)}</span></p>`,
      );
    }
  }

  lines.push("</div>");
  return lines.join("\n");
}

function getPlainTextFromMarkdown(markdown) {
  return stripCustomMarkers(markdown)
    .replace(/^```[\s\S]*?^```/gm, "")
    .replace(/!\[[^\]]*]\(([^)]+)\)/g, "")
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/^\s*>\s*/gm, "")
    .replace(/^\s*(?:[-*+]|\d+\.)\s*/gm, "")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getDigest(plainText) {
  if (!plainText) return "";
  const maxBytes = 120;
  if (Buffer.byteLength(plainText, "utf8") <= maxBytes) return plainText;

  let digest = "";
  for (const char of plainText) {
    const candidate = `${digest}${char}`;
    if (Buffer.byteLength(`${candidate}…`, "utf8") > maxBytes) {
      break;
    }
    digest = candidate;
  }

  return `${digest.trim()}…`;
}

async function saveWorkflowContext(logsDir, patch) {
  const contextPath = path.join(logsDir, "workflow-context.json");
  const current = (await readJsonIfExists(contextPath)) || {};
  const merged = { ...current, ...patch };
  await saveJson(contextPath, merged);
  return {
    contextPath,
    context: merged,
  };
}

function getArticleTitle(markdown, overrideTitle) {
  markdown = stripFrontmatter(markdown);
  if (overrideTitle) return getPlainTextFromMarkdown(String(overrideTitle));
  const heading = markdown.match(/^#\s+(.+?)\s*$/m);
  if (heading) return getPlainTextFromMarkdown(heading[1]);
  const firstLine = normalizeNewlines(markdown)
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  return firstLine ? getPlainTextFromMarkdown(firstLine) : "未命名文章";
}

function getPublishMarkdown(markdown, articleTitle) {
  const normalized = stripFrontmatter(markdown);
  const bodyMatch = normalized.match(/^##\s+正文\s*\n([\s\S]*)$/m);
  if (!bodyMatch) {
    return normalized;
  }
  return `# ${articleTitle}\n\n${bodyMatch[1].trim()}\n`;
}

function truncateCoverKeyPhrase(value, maxLength = 36) {
  const characters = Array.from(String(value || "").replace(/\s+/g, " ").trim());
  return characters.length <= maxLength
    ? characters.join("")
    : `${characters.slice(0, maxLength).join("")}…`;
}

function getCoverKeyPhrases(plainText, articleTitle, explicitValue) {
  const explicitPhrases = String(explicitValue || "")
    .split(/\r?\n|\|/)
    .map((item) => truncateCoverKeyPhrase(item))
    .filter(Boolean)
    .slice(0, 2);
  if (explicitPhrases.length) {
    return explicitPhrases;
  }

  const normalizedTitle = String(articleTitle || "").trim();
  const bodyText = String(plainText || "").startsWith(normalizedTitle)
    ? String(plainText || "").slice(normalizedTitle.length).trim()
    : String(plainText || "").trim();
  return bodyText
    .split(/(?<=[。！？!?])/u)
    .map((item) => truncateCoverKeyPhrase(item))
    .filter(Boolean)
    .slice(0, 2);
}

function getCoverPrompt(articleTitle, coverKeyPhrases) {
  const phraseLines = coverKeyPhrases.map((phrase) => `- ${phrase}`);
  return [
    "请为微信公众号文章生成一张横版封面图，风格为手绘 sketchnote 知识导图。",
    `文章标题：《${articleTitle}》`,
    "可选核心短句，仅在画面确实需要文字时择一使用，最多使用两条，不得扩写或添加其他正文文字：",
    ...phraseLines,
    "",
    "如果随附了品牌角色参考图，只保留其核心识别特征，并根据文章主题重新设计动作和表情；不要复制原图姿势。",
    "如果没有参考图，不要虚构固定品牌角色，改用与主题相关的通用人物、物件或场景隐喻。",
    "构图要求：严格按2.35:1超宽横版设计，最终文件必须为3760x1600；所有主体和文字放在超宽安全区内；clean white paper background；以人物动作、表情、场景隐喻和少量图标承担主要表达；可以有中心概念短语，但不要把画面做成文字导图。",
    "视觉要求：hand-drawn sketchnote style, visual note-taking, mind map infographic, doodles, marker pen texture, high quality sketch, colorful but soft, pastel marker colors, clear and legible。",
    "文字要求：默认尽量少放文字；只在帮助理解时加入 1 个中心短语，或最多 1-2 个极短中文标签；不搬运大段正文，不做标题海报，不堆密集小字。",
    "禁止项：不要水印、不要 logo、不要真实照片感、不要 3D render、不要企业海报、不要 UI 截图、不要元素堆满画面、不要托腮姿势、不要复刻参考图的静态摆拍。",
  ].join("\n");
}

async function getWechatAccessToken(appId, appSecret) {
  if (!appId || !appSecret) {
    throw new Error("Missing WeChat app credentials. Set WECHAT_MP_APP_ID and WECHAT_MP_APP_SECRET.");
  }

  const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
  url.searchParams.set("grant_type", "client_credential");
  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", appSecret);

  const response = await fetch(url);
  const json = await response.json();
  if (json.errcode && json.errcode !== 0) {
    throw new Error(`Failed to get WeChat access token: ${json.errcode} ${json.errmsg}`);
  }
  if (!json.access_token) {
    throw new Error("WeChat token response did not include access_token.");
  }
  return json.access_token;
}

async function getWechatDraft(accessToken, mediaId) {
  const url = new URL("https://api.weixin.qq.com/cgi-bin/draft/get");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ media_id: mediaId }),
  });
  return response.json();
}

function extractWechatDraftArticle(draftResponse) {
  const article =
    draftResponse?.news_item?.[0] ||
    draftResponse?.item?.[0] ||
    draftResponse?.articles?.[0] ||
    draftResponse?.article_info?.news_item?.[0] ||
    null;

  if (!article) {
    throw new Error("WeChat draft response did not include a readable article payload.");
  }

  if (!article.content || !String(article.content).trim()) {
    throw new Error("WeChat draft response did not include article content.");
  }

  return {
    title: article.title || "未命名文章",
    author: article.author || "",
    digest: article.digest || "",
    content: String(article.content),
    contentSourceUrl: article.content_source_url || "",
  };
}

async function uploadWechatFile(url, filePath) {
  const form = new FormData();
  const buffer = await fs.readFile(filePath);
  form.append("media", new Blob([buffer], { type: mimeTypeFor(filePath) }), path.basename(filePath));
  const response = await fetch(url, {
    method: "POST",
    body: form,
  });
  return response.json();
}

function resolveLocalImagePath(source, baseDir) {
  return path.isAbsolute(source) ? source : path.resolve(baseDir, source);
}

async function replaceLocalImagesWithWechatUrls({ html, baseDir, accessToken, inlineLogPath, dryRun }) {
  const imagePattern = /<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g;
  const replacements = new Map();
  const logs = [];

  for (const match of html.matchAll(imagePattern)) {
    const src = match[1];
    if (replacements.has(src)) continue;
    if (/^https?:\/\//.test(src) || /^data:image\//.test(src)) continue;

    const localPath = resolveLocalImagePath(src, baseDir);
    await fs.access(localPath);

    if (dryRun) {
      const remoteUrl = `https://example.invalid/wechat-inline/${path.basename(localPath)}`;
      replacements.set(src, remoteUrl);
      logs.push({ local_path: localPath, remote_url: remoteUrl, dry_run: true });
      continue;
    }

    const url = new URL("https://api.weixin.qq.com/cgi-bin/media/uploadimg");
    url.searchParams.set("access_token", accessToken);
    const uploadResponse = await uploadWechatFile(url, localPath);
    if (uploadResponse.errcode && uploadResponse.errcode !== 0) {
      throw new Error(`WeChat inline image upload failed: ${uploadResponse.errcode} ${uploadResponse.errmsg}`);
    }

    replacements.set(src, uploadResponse.url);
    logs.push({
      local_path: localPath,
      remote_url: uploadResponse.url,
      media_response: uploadResponse,
    });
  }

  let replacedHtml = html;
  for (const [src, remote] of replacements.entries()) {
    replacedHtml = replacedHtml.split(src).join(remote);
  }

  await saveJson(inlineLogPath, logs);
  return {
    html: replacedHtml,
    image_count: logs.length,
    log_path: inlineLogPath,
  };
}

async function main() {
  const rawArgs = parseArgs(process.argv.slice(2));
  const action = required(rawArgs.Action || rawArgs.action, "Action");
  const finalDraftArg = required(rawArgs.FinalDraftPath || rawArgs.finalDraftPath, "FinalDraftPath");
  const finalDraftPath = path.resolve(finalDraftArg);
  const dryRun = boolFlag(rawArgs.DryRun || rawArgs.dryRun);

  const articleTitleOverride = rawArgs.ArticleTitle || rawArgs.articleTitle;
  const draftMediaIdArg = rawArgs.DraftMediaId || rawArgs.draftMediaId || "";
  const referenceImageArg = rawArgs.ReferenceImagePath || rawArgs.referenceImagePath;
  const coverAspectRatio = rawArgs.CoverAspectRatio || "2.35:1";
  const coverImageSize = rawArgs.CoverImageSize || "3760x1600";
  const coverKeyPhrasesArg = rawArgs.CoverKeyPhrases || rawArgs.coverKeyPhrases || "";
  const wechatAppId = rawArgs.WeChatAppId || envOrUser("WECHAT_MP_APP_ID") || "";
  const wechatAppSecret = rawArgs.WeChatAppSecret || envOrUser("WECHAT_MP_APP_SECRET") || "";
  const author = normalizeWechatAuthor(rawArgs.Author || envOrUser("WECHAT_MP_AUTHOR"));
  const sourceUrl = rawArgs.SourceUrl || "";
  const htmlPathArg = rawArgs.HtmlPath || rawArgs.htmlPath;
  const coverImagePathArg = rawArgs.CoverImagePath || rawArgs.coverImagePath;

  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const expectedCoverSize = parseImageSize(coverImageSize);
  const expectedCoverRatio = parseAspectRatio(coverAspectRatio);
  assertCoverSpecification(
    expectedCoverSize.width,
    expectedCoverSize.height,
    expectedCoverSize,
    expectedCoverRatio,
  );
  const defaultReferenceImagePath = path.join(repoRoot, "assets", "brand", "reference.png");
  const referenceImagePath = referenceImageArg
    ? path.resolve(referenceImageArg)
    : defaultReferenceImagePath;

  const rawMarkdown = await fs.readFile(finalDraftPath, "utf8");
  const articleTitle = getArticleTitle(rawMarkdown, articleTitleOverride);
  const markdown = getPublishMarkdown(rawMarkdown, articleTitle);
  const plainText = getPlainTextFromMarkdown(markdown);
  const coverKeyPhrases = getCoverKeyPhrases(plainText, articleTitle, coverKeyPhrasesArg);
  const coverPrompt = getCoverPrompt(articleTitle, coverKeyPhrases);
  const digest = getDigest(plainText);
  const articleOutputRoot = path.join(path.dirname(finalDraftPath), "wechat-publish-prep");
  const outputRoot = await ensureDir(dryRun ? path.join(articleOutputRoot, "dry-run") : articleOutputRoot);
  const tempRoot = await ensureDir(path.join(outputRoot, "preview"));
  const assetsDir = await ensureDir(path.join(outputRoot, "assets"));
  const logsDir = await ensureDir(path.join(outputRoot, "logs"));
  const reviewedSourceDir = await ensureDir(path.join(outputRoot, "reviewed-source"));
  const reviewedSourceHtmlPath = path.join(reviewedSourceDir, "reviewed-source.html");
  const reviewedSourceMarkdownPath = path.join(reviewedSourceDir, "reviewed-source.md");
  const previewBaseName = `${path.parse(finalDraftPath).name}-wechat-preview`;
  const optimizedMarkdownPath = path.join(tempRoot, `${previewBaseName}.md`);
  const htmlOutputPath = path.join(tempRoot, `${previewBaseName}.html`);
  const referenceReady = await fs.access(referenceImagePath).then(() => true).catch(() => false);
  const workflowContextPath = path.join(logsDir, "workflow-context.json");
  const workflowContext = (await readJsonIfExists(workflowContextPath)) || {};
  const imagegenInstructions = {
    skill: "imagegen",
    imagegen_path: "runtime-configured-imagegen",
    endpoint: null,
    model: null,
    provider: "active global imagegen runtime",
    reference_image_path: referenceReady ? referenceImagePath : null,
    target_output_path: path.join(assetsDir, "wechat-cover.png"),
    prompt: coverPrompt,
    cover_key_phrases: coverKeyPhrases,
    aspect_ratio: coverAspectRatio,
    image_size: coverImageSize,
    note: "Use the active global imagegen skill. Report model and endpoint only when exposed by the runtime. Save and verify a 3760x1600 PNG, then run upload-draft with -CoverImagePath <verified file>.",
  };

  if (action === "confirm-summary") {
    console.log(JSON.stringify({
      article_title: articleTitle,
      final_draft_path: finalDraftPath,
      output_root: outputRoot,
      stage: "wechat-publish-prep",
      will_typeset_for_draftbox: true,
      will_generate_cover: true,
      will_upload_draft: true,
      will_require_reviewed_source_sync_after_manual_edit: true,
      author_footer_enabled: Boolean(author),
      imagegen_path: imagegenInstructions.imagegen_path,
      imagegen_endpoint: imagegenInstructions.endpoint,
      selected_image_model: imagegenInstructions.model,
      available_image_path: "global imagegen skill provided by the active runtime",
      image_size: coverImageSize,
      image_api_url: null,
      reference_image_path: referenceReady ? referenceImagePath : null,
      reference_image_ready: referenceReady,
      image_api_key_ready: null,
      cover_prompt_full: coverPrompt,
      cover_key_phrases: coverKeyPhrases,
      cover_prepare_summary: imagegenInstructions,
      wechat_author: author,
      wechat_credentials_ready: Boolean(wechatAppId && wechatAppSecret),
      image_generation_confirmation_required: true,
      requires_confirmation: true,
      style_feedback_action_after_manual_review: "sync-reviewed-source",
    }, null, 2));
    return;
  }

  if (action === "typeset") {
    const artifacts = getDraftboxTypesetArtifacts(markdown, articleTitleOverride, author);
    await saveUtf8(optimizedMarkdownPath, artifacts.optimizedMarkdown);
    await saveUtf8(htmlOutputPath, artifacts.html);
    await saveJson(path.join(logsDir, "typeset-metadata.json"), {
      article_title: articleTitle,
      digest,
      preview_markdown_path: optimizedMarkdownPath,
      preview_html_path: htmlOutputPath,
      auto_section_headings: artifacts.autoSectionHeadings,
      source_image_base_dir: path.dirname(finalDraftPath),
      author_footer_included: hasAuthorFooter(artifacts.optimizedMarkdown),
      preview_only: true,
    });
    await saveWorkflowContext(logsDir, {
      article_title: articleTitle,
      final_draft_path: finalDraftPath,
      output_root: outputRoot,
    });
    console.log(JSON.stringify({
      article_title: articleTitle,
      temp_root: tempRoot,
      preview_markdown_path: optimizedMarkdownPath,
      preview_html_path: htmlOutputPath,
      digest,
      author_footer_included: hasAuthorFooter(artifacts.optimizedMarkdown),
      preview_only: true,
    }, null, 2));
    return;
  }

  if (action === "generate-cover") {
    throw new Error("Project-local cover generation has been removed. Use the global imagegen skill to create the cover, then run upload-draft with -CoverImagePath <generated file>.");
  }

  if (action === "upload-draft") {
    const htmlPath = htmlPathArg ? path.resolve(htmlPathArg) : null;
    let coverImagePath = coverImagePathArg ? path.resolve(coverImagePathArg) : null;

    if (!coverImagePath) {
      const coverAssetsDir = path.join(articleOutputRoot, "assets");
      const assetEntries = await fs.readdir(coverAssetsDir).catch((error) => {
        if (error.code === "ENOENT") return [];
        throw error;
      });
      const found = assetEntries.find((entry) => /^wechat-cover\./.test(entry));
      if (found) {
        coverImagePath = path.join(coverAssetsDir, found);
      }
    }

    if (!coverImagePath) {
      throw new Error("Cover image file not found. Generate a cover with the global imagegen skill first or pass -CoverImagePath.");
    }

    const coverDimensions = await readPngDimensions(coverImagePath);
    assertCoverSpecification(
      coverDimensions.width,
      coverDimensions.height,
      expectedCoverSize,
      expectedCoverRatio,
    );

    const generatedArtifacts = htmlPath ? null : getDraftboxTypesetArtifacts(markdown, articleTitleOverride, author);
    const html = htmlPath ? await fs.readFile(htmlPath, "utf8") : generatedArtifacts.html;
    const localTypesetMetadata = await readJsonIfExists(path.join(logsDir, "typeset-metadata.json"));
    const liveTypesetMetadata = dryRun
      ? await readJsonIfExists(path.join(articleOutputRoot, "logs", "typeset-metadata.json")) : null;
    const typesetMetadata = [localTypesetMetadata, liveTypesetMetadata]
      .find((metadata) => metadata?.preview_html_path === htmlPath);
    const autoSectionHeadings = generatedArtifacts?.autoSectionHeadings
      || (typesetMetadata?.preview_html_path === htmlPath ? typesetMetadata.auto_section_headings : []) || [];

    const draftRequestPath = path.join(logsDir, "wechat-draft-request.json");
    const draftResponsePath = path.join(logsDir, "wechat-draft-response.json");
    const thumbLogPath = path.join(logsDir, "wechat-thumb-upload.json");
    const inlineLogPath = path.join(logsDir, "wechat-inline-images.json");

    const accessToken = dryRun ? "dry-run-token" : await getWechatAccessToken(wechatAppId, wechatAppSecret);
    const inlineResult = await replaceLocalImagesWithWechatUrls({
      html,
      baseDir: htmlPath ? (typesetMetadata?.source_image_base_dir || path.dirname(htmlPath)) : path.dirname(finalDraftPath),
      accessToken,
      inlineLogPath,
      dryRun,
    });

    const draftBody = {
      articles: [
        {
          title: articleTitle,
          author,
          digest,
          content: inlineResult.html,
          content_source_url: sourceUrl,
          thumb_media_id: dryRun ? "dry-run-thumb-media-id" : undefined,
          show_cover_pic: 1,
          need_open_comment: 0,
          only_fans_can_comment: 0,
        },
      ],
    };

    if (dryRun) {
      await saveJson(draftRequestPath, draftBody);
      const savedContext = await saveWorkflowContext(logsDir, {
        auto_section_headings: autoSectionHeadings,
        article_title: articleTitle,
        final_draft_path: finalDraftPath,
        output_root: outputRoot,
      });
      console.log(JSON.stringify({
        dry_run: true,
        article_title: articleTitle,
        html_path: htmlPath,
        generated_html_in_memory: !htmlPath,
        cover_image_path: coverImagePath,
        draft_request_path: draftRequestPath,
        inline_image_log_path: inlineLogPath,
        thumb_log_path: thumbLogPath,
        workflow_context_path: savedContext.contextPath,
        digest,
      }, null, 2));
      return;
    }

    const thumbUrl = new URL("https://api.weixin.qq.com/cgi-bin/material/add_material");
    thumbUrl.searchParams.set("access_token", accessToken);
    thumbUrl.searchParams.set("type", "image");
    const thumbResponse = await uploadWechatFile(thumbUrl, coverImagePath);
    if (thumbResponse.errcode && thumbResponse.errcode !== 0) {
      throw new Error(`WeChat thumb upload failed: ${thumbResponse.errcode} ${thumbResponse.errmsg}`);
    }
    await saveJson(thumbLogPath, thumbResponse);

    draftBody.articles[0].thumb_media_id = thumbResponse.media_id;
    await saveJson(draftRequestPath, draftBody);

    const draftUrl = new URL("https://api.weixin.qq.com/cgi-bin/draft/add");
    draftUrl.searchParams.set("access_token", accessToken);
    const draftResponse = await fetch(draftUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draftBody),
    }).then((response) => response.json());
    await saveJson(draftResponsePath, draftResponse);

    if (draftResponse.errcode && draftResponse.errcode !== 0) {
      throw new Error(`WeChat draft add failed: ${draftResponse.errcode} ${draftResponse.errmsg}`);
    }

    const savedContext = await saveWorkflowContext(logsDir, {
      article_title: articleTitle,
      final_draft_path: finalDraftPath,
      output_root: outputRoot,
      draft_media_id: draftResponse.media_id,
      auto_section_headings: autoSectionHeadings,
      draft_request_path: draftRequestPath,
      draft_response_path: draftResponsePath,
    });

    console.log(JSON.stringify({
      dry_run: false,
      article_title: articleTitle,
      html_path: htmlPath,
      generated_html_in_memory: !htmlPath,
      cover_image_path: coverImagePath,
      thumb_media_id: thumbResponse.media_id,
      draft_media_id: draftResponse.media_id,
      inline_image_count: inlineResult.image_count,
      draft_request_path: draftRequestPath,
      draft_response_path: draftResponsePath,
      inline_image_log_path: inlineLogPath,
      thumb_log_path: thumbLogPath,
      workflow_context_path: savedContext.contextPath,
    }, null, 2));
    return;
  }

  if (action === "sync-reviewed-source") {
    const draftRequestPath = path.join(logsDir, "wechat-draft-request.json");
    const draftResponsePath = path.join(logsDir, "wechat-draft-response.json");
    const draftGetPath = path.join(logsDir, "wechat-draft-get.json");
    const syncLogPath = path.join(logsDir, "reviewed-source-sync.json");
    const draftResponseLog = (await readJsonIfExists(draftResponsePath)) || {};
    const draftRequestLog = (await readJsonIfExists(draftRequestPath)) || {};
    const draftMediaId = draftMediaIdArg || workflowContext.draft_media_id || draftResponseLog.media_id || "";

    if (!draftMediaId) {
      throw new Error("Missing DraftMediaId. Upload the draft first or pass -DraftMediaId explicitly.");
    }

    let articlePayload;
    let fetchMode = "remote";

    if (dryRun) {
      const dryRunArticle = draftRequestLog?.articles?.[0];
      if (!dryRunArticle?.content) {
        throw new Error("Dry-run sync could not find local draft request content.");
      }
      articlePayload = {
        title: dryRunArticle.title || articleTitle,
        author: dryRunArticle.author || author,
        digest: dryRunArticle.digest || digest,
        content: dryRunArticle.content,
        contentSourceUrl: dryRunArticle.content_source_url || "",
      };
      await saveJson(draftGetPath, {
        dry_run: true,
        media_id: draftMediaId,
        article_title: articlePayload.title,
        source: "wechat-draft-request.json",
      });
      fetchMode = "dry-run-local-request";
    } else {
      const accessToken = await getWechatAccessToken(wechatAppId, wechatAppSecret);
      const draftGetResponse = await getWechatDraft(accessToken, draftMediaId);
      await saveJson(draftGetPath, draftGetResponse);
      if (draftGetResponse.errcode && draftGetResponse.errcode !== 0) {
        throw new Error(`WeChat draft get failed: ${draftGetResponse.errcode} ${draftGetResponse.errmsg}`);
      }
      articlePayload = extractWechatDraftArticle(draftGetResponse);
    }

    const reviewedTitle = articlePayload.title || articleTitle;
    const reviewedHtml = articlePayload.content;
    const uploadedArticle = draftRequestLog?.articles?.[0];
    const uploadMatchesDraft = draftResponseLog.media_id === draftMediaId;
    const baselineStatus = dryRun ? "simulation"
      : !uploadedArticle?.content || !draftResponseLog.media_id ? "missing"
      : uploadMatchesDraft ? "available" : "draft-mismatch";
    const styleOptions = {
      autoHeadings: dryRun || uploadMatchesDraft ? workflowContext.auto_section_headings || [] : [],
      fixedFooterText: buildAuthorFooterMarkdown(uploadedArticle?.author || articlePayload.author || author).replace(/<\/?quote-container>/g, "").trim(),
    };
    const reviewedMarkdown = extractWechatStyleText(reviewedHtml, reviewedTitle, styleOptions);
    let uploadedStyleBaselinePath = null;
    if (baselineStatus === "available" || baselineStatus === "simulation") {
      uploadedStyleBaselinePath = path.join(reviewedSourceDir, "uploaded-style-baseline.md");
      await saveUtf8(uploadedStyleBaselinePath,
        extractWechatStyleText(uploadedArticle.content, uploadedArticle.title || articleTitle, styleOptions));
    }

    await saveUtf8(reviewedSourceHtmlPath, reviewedHtml);
    await saveUtf8(reviewedSourceMarkdownPath, reviewedMarkdown);

    const savedContext = await saveWorkflowContext(logsDir, {
      article_title: reviewedTitle,
      final_draft_path: finalDraftPath,
      output_root: outputRoot,
      draft_media_id: draftMediaId,
      reviewed_source_html_path: reviewedSourceHtmlPath,
      reviewed_source_markdown_path: reviewedSourceMarkdownPath,
      reviewed_source_sync_log_path: syncLogPath,
      uploaded_style_baseline_path: uploadedStyleBaselinePath,
      style_feedback_baseline_status: baselineStatus,
    });

    const syncResult = {
      article_title: reviewedTitle,
      fetch_mode: fetchMode,
      draft_media_id: draftMediaId,
      reviewed_source_html_path: reviewedSourceHtmlPath,
      reviewed_source_markdown_path: reviewedSourceMarkdownPath,
      purpose: "style-feedback-only",
      baseline_status: baselineStatus,
      uploaded_style_baseline_path: uploadedStyleBaselinePath,
      style_feedback_source_path: dryRun ? null : reviewedSourceMarkdownPath,
      style_feedback_baseline_path: baselineStatus === "available" ? uploadedStyleBaselinePath : null,
      workflow_context_path: savedContext.contextPath,
    };
    await saveJson(syncLogPath, syncResult);

    console.log(JSON.stringify(syncResult, null, 2));
    return;
  }

  throw new Error(`Unsupported action: ${action}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
