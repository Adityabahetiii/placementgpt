import { wrapText, renderWrappedTextLines } from "../renderer/typography.js";
import { escapeXml } from "../renderer/renderUtils.js";
import { getPhaseNodeColor } from "../renderer/colors.js";

function calculateTimelinePhaseHeight(phase, cardWidth) {
  // Adjusted for actual average character widths (title font-size: 24, body: 18)
  const titleMaxChars = Math.floor((cardWidth - 60) / 13);
  const bodyMaxChars = Math.floor((cardWidth - 60) / 9.5);
  
  const titleLines = wrapText(phase.title || "Phase", titleMaxChars);
  const skillItems = Array.isArray(phase.skills) ? phase.skills.filter(Boolean) : [];
  let skillLineCount = 0;
  for (const skill of skillItems) {
    // each skill item gets bulleted, but `wrapText` length is the number of lines it takes
    skillLineCount += wrapText(String(skill), bodyMaxChars).length;
  }
  const outcomeLines = wrapText(phase.outcome || "", bodyMaxChars);
  
  let currentY = 74; // top padding
  if (titleLines.length > 1) { currentY += 34; }
  
  currentY += 54; // Spacing between Phase title and Skills
  currentY += 42; // SKILLS header
  
  if (skillLineCount > 0) {
    currentY += skillLineCount * 28;
  } else {
    currentY += 28;
  }
  
  currentY += 40; // Spacing between skills and outcome
  currentY += 42; // OUTCOME header
  
  const actualOutcomeLinesCount = outcomeLines.length > 0 ? outcomeLines.length : 1;
  
  // The rendering draws outcome text starting at currentY, meaning the LAST line baseline 
  // is at currentY + (actualOutcomeLinesCount - 1) * 28.
  // We want 46px of bottom padding below that baseline.
  currentY += (actualOutcomeLinesCount - 1) * 28 + 46;
  
  return currentY;
}

function renderTimelinePhaseContent(phase, x, y, theme, cardWidth) {
  // Adjusted for actual average character widths (title font-size: 24, body: 18)
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
  // Increased top padding
  let currentY = y + 74; 
  
  markup += `<text x="${x + 30}" y="${currentY}" fill="${theme.text}" font-size="24" font-weight="700">${escapeXml(phase.emoji || "✨")} ${escapeXml(titleLines[0])}</text>`;
  if (titleLines[1]) { currentY += 34; markup += `<text x="${x + 30}" y="${currentY}" fill="${theme.text}" font-size="24" font-weight="700">${escapeXml(titleLines[1])}</text>`; }
  
  currentY += 54; // Spacing between Phase title and Skills
  markup += `<text x="${x + 30}" y="${currentY}" fill="${theme.accent}" font-size="18" font-weight="700" letter-spacing="0.14em">SKILLS</text>`;
  currentY += 42;
  
  if (skillLines.length) {
    markup += renderWrappedTextLines(skillLines, x + 30, currentY, 28, theme.accentTwo, 18, 500);
    currentY += skillLines.length * 28;
  } else {
    markup += `<text x="${x + 30}" y="${currentY}" fill="${theme.muted}" font-size="18" font-weight="400">No skills listed.</text>`;
    currentY += 28;
  }
  
  currentY += 40; // Increased spacing between skills and outcome
  markup += `<text x="${x + 30}" y="${currentY}" fill="${theme.accent}" font-size="18" font-weight="700" letter-spacing="0.14em">OUTCOME</text>`;
  currentY += 42; // Outcome heading and Outcome text
  
  markup += renderWrappedTextLines(outcomeLines.length ? outcomeLines : ["Build a strong foundation for the next phase."], x + 30, currentY, 28, theme.muted, 18, 400);
  
  return markup;
}

export default function layoutTimeline(phases, theme, width, startY) {
  const cardWidth = 680; 
  const lineX = width / 2;
  let svg = "";
  
  let currentLeftY = startY;
  let currentRightY = startY + 60; // Slight initial stagger for aesthetics if first card is short
  let lastCenterY = startY;
  
  // To track the absolute bottom of the timeline for the final bounding box
  let maxBottomY = startY;
  
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const cardHeight = calculateTimelinePhaseHeight(phase, cardWidth);
    const isLeft = i % 2 === 0;
    
    // Minimum Y coordinate to not overlap with the card above it on the same side
    const minOwnSideY = isLeft ? currentLeftY : currentRightY;
    
    // Minimum center Y to ensure nodes on the spine always go strictly downwards (chronological)
    const minChronologicalCenterY = i === 0 ? startY : lastCenterY + 120;
    
    // Determine final card Y position
    const cardY = Math.max(minOwnSideY, minChronologicalCenterY - cardHeight / 2);
    const cardCenterY = cardY + cardHeight / 2;
    lastCenterY = cardCenterY;
    
    // Update trackers for the next cards
    if (isLeft) {
      currentLeftY = cardY + cardHeight + 40; // 40px gap between cards on same side
    } else {
      currentRightY = cardY + cardHeight + 40;
    }
    
    if (cardY + cardHeight > maxBottomY) {
      maxBottomY = cardY + cardHeight;
    }
    
    const cardX = isLeft ? lineX - 60 - cardWidth : lineX + 60;
    const nodeColor = getPhaseNodeColor(theme, i);
    
    svg += `
      <path d="M ${lineX} ${cardCenterY} L ${isLeft ? cardX + cardWidth : cardX} ${cardCenterY}" fill="none" stroke="${theme.line}" stroke-width="4" stroke-dasharray="6 6" />
      <circle cx="${lineX}" cy="${cardCenterY}" r="22" fill="${theme.cardFill}" stroke="${nodeColor}" stroke-width="4" />
      <circle cx="${lineX}" cy="${cardCenterY}" r="10" fill="${nodeColor}" />
      <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="30" fill="${theme.cardFill}" stroke="${theme.cardStroke}" stroke-width="1.2" />
      <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="8" rx="30" fill="url(#accentLine)" opacity="0.85" />
    `;
    svg += renderTimelinePhaseContent(phase, cardX, cardY, theme, cardWidth);
  }
  
  const lastCardBottom = maxBottomY;
  
  // Extend the central timeline exactly to the bottom of the last card plus a tiny tail
  const totalHeight = Math.max(0, lastCardBottom - startY + 40);
  const bgLine = `<line x1="${lineX}" y1="${startY - 20}" x2="${lineX}" y2="${lastCardBottom + 12}" stroke="${theme.line}" stroke-width="5" />`;
  
  return { svg: bgLine + svg, height: totalHeight, width };
}
