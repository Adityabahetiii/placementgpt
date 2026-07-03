import { wrapText, renderWrappedTextLines } from "../renderer/typography.js";
import { escapeXml } from "../renderer/renderUtils.js";

export function calculatePhaseHeight(phase, cardWidth, theme = null) {
  const titleMaxChars = Math.floor((cardWidth - 60) / 13);
  const bodyMaxChars = Math.floor((cardWidth - 60) / 9.5);
  
  const titleLines = wrapText(phase.title || "Phase", titleMaxChars);
  const skillItems = Array.isArray(phase.skills) ? phase.skills.filter(Boolean) : [];
  let skillLineCount = 0;
  for (const skill of skillItems) {
    skillLineCount += wrapText(String(skill), bodyMaxChars).length;
  }
  const outcomeLines = wrapText(phase.outcome || "", bodyMaxChars);
  
  let height = 160; // Fixed Y offset for SKILLS header (126) + spacing (34). Accommodates up to 2 title lines.
  
  if (skillLineCount > 0) {
    height += skillLineCount * 24;
  } else {
    height += 24;
  }
  height += 20;
  height += 30;
  height += (outcomeLines.length > 0 ? outcomeLines.length : 1) * 24;
  height += 40; // bottom padding
  
  return height;
}

export function renderPhaseContent(phase, x, y, theme, cardWidth, cardHeight = null) {
  const titleMaxChars = Math.floor((cardWidth - 60) / 13);
  const bodyMaxChars = Math.floor((cardWidth - 60) / 9.5);
  
  const titleLines = wrapText(phase.title || "Phase", titleMaxChars);
  const skillItems = Array.isArray(phase.skills) ? phase.skills.filter(Boolean) : [];
  const skillLines = [];
  for (const skill of skillItems) {
    const lines = wrapText(String(skill), bodyMaxChars);
    skillLines.push("• " + lines[0]);
    for (let i = 1; i < lines.length; i++) {
      skillLines.push("  " + lines[i]);
    }
  }
  const outcomeLines = wrapText(phase.outcome || "", bodyMaxChars);
  
  let markup = ``;
  
  markup += `<text x="${x + 28}" y="${y + 56}" fill="${theme.text}" font-size="24" font-weight="700">${escapeXml(phase.emoji || "✨")} ${escapeXml(titleLines[0])}</text>`;
  if (titleLines[1]) { markup += `<text x="${x + 28}" y="${y + 86}" fill="${theme.text}" font-size="24" font-weight="700">${escapeXml(titleLines[1])}</text>`; }
  
  let currentY = y + 126;
  
  markup += `<text x="${x + 28}" y="${currentY}" fill="${theme.accent}" font-size="18" font-weight="700" letter-spacing="0.14em">SKILLS</text>`;
  currentY += 34;
  
  if (skillLines.length) {
    markup += renderWrappedTextLines(skillLines, x + 28, currentY, 24, theme.accentTwo, 18, 500);
    currentY += skillLines.length * 24;
  } else {
    markup += `<text x="${x + 28}" y="${currentY}" fill="${theme.muted}" font-size="18" font-weight="400">No skills listed.</text>`;
    currentY += 24;
  }
  
  if (cardHeight) {
    // Pin OUTCOME block to the bottom of the card for uniform alignment
    const outcomeLineCount = outcomeLines.length > 0 ? outcomeLines.length : 1;
    currentY = y + cardHeight - 40 - (outcomeLineCount * 24) - 30;
  } else {
    currentY += 20;
  }
  
  markup += `<text x="${x + 28}" y="${currentY}" fill="${theme.accent}" font-size="18" font-weight="700" letter-spacing="0.14em">OUTCOME</text>`;
  currentY += 30;
  
  markup += renderWrappedTextLines(outcomeLines.length ? outcomeLines : ["Build a strong foundation for the next phase."], x + 28, currentY, 24, theme.muted, 18, 400);
  
  return markup;
}
