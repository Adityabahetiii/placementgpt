import { escapeXml } from "../renderer/renderUtils.js";
import { wrapText } from "../renderer/typography.js";

export function renderFooterList(items, x, y, width, title, theme, height) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  const maxWidth = Math.max(28, width - 48);
  const lines = list.length ? list.flatMap((item) => wrapText(String(item), Math.max(24, Math.floor(maxWidth / 10)))) : ["Not specified"];
  let boxHeight = height;
  let finalLines = lines.map(line => ({ text: line, indent: 0 }));
  
  const isSpacedLayout = theme.layoutType === 'timeline' || theme.layoutType === 'horizontal' || theme.layoutType === 'roadmapSh' || theme.layoutType === 'cyberNeon' || theme.layoutType === 'minimal' || theme.layoutType === 'executive' || theme.layoutType === 'flowchart' || theme.layoutType === 'kanban' || theme.layoutType === 'infographic' || theme.layoutType === 'mindMap';
  
  if (isSpacedLayout) {
    boxHeight = height; // Keep both the same height
    finalLines = [];
    for (const item of list) {
      const wrapped = wrapText(String(item), Math.max(24, Math.floor(maxWidth / 10)));
      if (wrapped.length > 0) {
        finalLines.push({ text: "• " + wrapped[0], indent: 0 });
        for (let i = 1; i < wrapped.length; i++) {
          finalLines.push({ text: wrapped[i], indent: 15 }); // 15px indent aligns perfectly with the bullet width
        }
      }
    }
  }

  return `
    <g transform="translate(${x}, ${y})">
      <rect x="0" y="0" width="${width}" height="${boxHeight}" rx="28" fill="${theme.cardFill}" stroke="${theme.cardStroke}" stroke-width="1.2" />
      <text x="32" y="48" fill="${theme.accent}" font-size="22" font-weight="700" letter-spacing="0.08em">${escapeXml(title.toUpperCase())}</text>
      ${finalLines.map((lineObj, index) => {
        const lineSpacing = isSpacedLayout ? 32 : 24;
        const startY = isSpacedLayout ? 96 : 86;
        const finalX = (isSpacedLayout ? 32 : 28) + lineObj.indent;
        return `<text x="${finalX}" y="${startY + index * lineSpacing}" fill="${theme.text}" font-size="19" font-weight="500">${escapeXml(lineObj.text)}</text>`;
      }).join("")}
    </g>
  `;
}

export function getFooterHeight(roadmap, width, theme = {}) {
  const highlights = Array.isArray(roadmap.highlights) ? roadmap.highlights : [];
  const nextSteps = Array.isArray(roadmap.nextSteps) ? roadmap.nextSteps : [];
  const leftWidth = Math.max(400, (width - 250) / 2);
  const rightWidth = leftWidth;
  const maxLines = Math.max(
    highlights.flatMap(i => wrapText(String(i), Math.max(24, Math.floor(leftWidth / 10)))).length,
    nextSteps.flatMap(i => wrapText(String(i), Math.max(24, Math.floor(rightWidth / 10)))).length,
    1
  );
  
  let finalMaxLines = maxLines;
  
  const isSpacedLayout = theme.layoutType === 'timeline' || theme.layoutType === 'horizontal' || theme.layoutType === 'roadmapSh' || theme.layoutType === 'cyberNeon' || theme.layoutType === 'minimal' || theme.layoutType === 'executive' || theme.layoutType === 'flowchart' || theme.layoutType === 'kanban' || theme.layoutType === 'infographic' || theme.layoutType === 'mindMap';
  
  if (isSpacedLayout) {
    // For timeline, horizontal, and roadmapSh, we need to account for bullets which might wrap differently, 
    // but the `maxLines` calculation already wraps them. 
    // We just need to ensure the height is correct based on the bulleted wrapping.
    const getBulletedLineCount = (arr, maxW) => {
      let count = 0;
      for (const item of arr) {
        count += wrapText(String(item), maxW).length;
      }
      return count;
    };
    finalMaxLines = Math.max(
      getBulletedLineCount(highlights, Math.max(24, Math.floor(leftWidth / 10))),
      getBulletedLineCount(nextSteps, Math.max(24, Math.floor(rightWidth / 10))),
      1
    );
    return 120 + finalMaxLines * 32;
  }
  return Math.max(220, 100 + maxLines * 24);
}

export function renderFooter(roadmap, theme, width, startY, height) {
  const highlights = Array.isArray(roadmap.highlights) ? roadmap.highlights : [];
  const nextSteps = Array.isArray(roadmap.nextSteps) ? roadmap.nextSteps : [];
  const leftWidth = Math.max(400, (width - 250) / 2);
  const rightWidth = leftWidth;
  return `
    <g>
      ${renderFooterList(highlights, 90, startY, leftWidth, "Highlights", theme, height)}
      ${renderFooterList(nextSteps, width - 90 - rightWidth, startY, rightWidth, "Next Steps", theme, height)}
    </g>
  `;
}
