import { parseFragment } from "parse5";

const children = (node) => node.childNodes || [];
const blockTags = new Set([
  "p", "div", "section", "article", "header", "footer", "figure", "figcaption",
  "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "ul", "ol", "li", "tr",
]);
const compact = (text) => text.replace(/\s+/g, " ").trim();

// 仅提取风格样本：文字、标点、换行与分段，不重建发布格式。
export function extractWechatStyleText(html, articleTitle, { autoHeadings = [], fixedFooterText = "" } = {}) {
  const ignoredHeadings = new Set(autoHeadings.map(compact));

  function render(node, preformatted = false) {
    if (node.nodeName === "#text") {
      return preformatted ? node.value : node.value.replace(/\s+/g, " ");
    }
    const tag = node.tagName;
    if (["script", "style", "template", "noscript", "img", "hr"].includes(tag)) return "";
    if (tag === "br") return "\n";
    const content = children(node).map((child) => render(child, preformatted || tag === "pre")).join("");
    if ((tag === "p" || /^h[1-6]$/.test(tag || "")) && ignoredHeadings.has(compact(content))) return "";
    if (tag === "p" && /^[—–\-·•\s]+$/.test(content)) return "";
    if (tag === "td" || tag === "th") return `${content.trim()}\t`;
    return blockTags.has(tag) ? `\n\n${content.trim()}\n\n` : content;
  }

  let body = render(parseFragment(html)).replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n").replace(/\n(?:[ \t]*\n){2,}/g, "\n\n").trim();
  // 只去掉与上传模板一致的尾注，避免误删正文中相似的作者表述。
  const footerStart = fixedFooterText.trim().split("\n")[0];
  const footerIndex = footerStart ? body.lastIndexOf(footerStart) : -1;
  if (footerIndex >= 0 && compact(body.slice(footerIndex)) === compact(fixedFooterText)) {
    body = body.slice(0, footerIndex).trimEnd();
  }
  if (!body) throw new Error("WeChat style sample has no readable body text; inspect the remote HTML before learning.");
  return `${articleTitle}\n\n${body}\n`;
}
