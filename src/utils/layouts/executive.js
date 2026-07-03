import { wrapText, renderWrappedTextLines } from "../renderer/typography.js";
import { escapeXml } from "../renderer/renderUtils.js";
import { getPhaseNodeColor } from "../renderer/colors.js";

export default function layoutExecutive(phases, theme, width, startY) {
  let currentY = startY;
  const gap = 60;
  const cardWidth = 1040;
  const cardX = (width - cardWidth) / 2 + 40; 
  const lineX = cardX - 80;
  const leftWidth = 320;
  const rightWidth = cardWidth - leftWidth;
  let contentSvg = "";
  
  let lastCardCenterY = startY;
  
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const nodeColor = getPhaseNodeColor(theme, i);
    
    // Text Wrapping
    const titleMaxChars = Math.floor((leftWidth - 60) / 13);
    
    let titleStr = phase.title || "Phase";
    let titleLines = [];
    
    // Explicitly pull "Phase X:" onto its own line for a cleaner look
    const match = titleStr.match(/^(Phase\s*\d+:)\s*(.*)/i);
    if (match) {
        titleLines.push(match[1]);
        if (match[2]) {
            titleLines.push(...wrapText(match[2], titleMaxChars));
        }
    } else {
        titleLines = wrapText(titleStr, titleMaxChars);
    }
    
    const bodyMaxChars = Math.floor((rightWidth - 100) / 9.5);
    const skillItems = Array.isArray(phase.skills) ? phase.skills.filter(Boolean) : [];
    const skillLines = [];
    for (const skill of skillItems) {
        const lines = wrapText(String(skill), bodyMaxChars);
        skillLines.push("• " + lines[0]);
        for (let j = 1; j < lines.length; j++) {
            skillLines.push("  " + lines[j]);
        }
    }
    const outcomeLines = wrapText(phase.outcome || "", bodyMaxChars);
    
    // Dynamic Heights based tightly on content
    let rightHeight = 30; // Reduced top padding
    if (skillLines.length > 0) {
        rightHeight += 30; // header
        rightHeight += skillLines.length * 28;
        rightHeight += 24; // Reduced gap between skills and outcome
    }
    rightHeight += 30; // header
    rightHeight += (outcomeLines.length > 0 ? outcomeLines.length : 1) * 28;
    rightHeight += 30; // Reduced bottom padding
    
    const leftHeight = 40 + (titleLines.length * 40) + 40;
    const cardHeight = Math.max(rightHeight, leftHeight, 180); // Reduced minimum height
    const cardCenterY = currentY + cardHeight / 2;
    lastCardCenterY = cardCenterY;
    
    contentSvg += `
      <g filter="url(#shadow)">
        <!-- Main Card Body -->
        <rect x="${cardX}" y="${currentY}" width="${cardWidth}" height="${cardHeight}" rx="16" fill="${theme.cardFill}" stroke="${theme.cardStroke}" stroke-width="1.5" />
        
        <!-- Left Panel Background -->
        <path d="M ${cardX} ${currentY + 16} A 16 16 0 0 1 ${cardX + 16} ${currentY} L ${cardX + leftWidth} ${currentY} L ${cardX + leftWidth} ${currentY + cardHeight} L ${cardX + 16} ${currentY + cardHeight} A 16 16 0 0 1 ${cardX} ${currentY + cardHeight - 16} Z" fill="rgba(255,255,255,0.03)" />
        <path d="M ${cardX} ${currentY + 16} A 16 16 0 0 1 ${cardX + 16} ${currentY} L ${cardX + leftWidth} ${currentY} L ${cardX + leftWidth} ${currentY + cardHeight} L ${cardX + 16} ${currentY + cardHeight} A 16 16 0 0 1 ${cardX} ${currentY + cardHeight - 16} Z" fill="${nodeColor}" opacity="0.05" />
        
        <!-- Center Divider -->
        <line x1="${cardX + leftWidth}" y1="${currentY}" x2="${cardX + leftWidth}" y2="${currentY + cardHeight}" stroke="${theme.cardStroke}" stroke-width="1.5" />
      </g>
      
      <!-- Timeline Node & Connector -->
      <circle cx="${lineX}" cy="${cardCenterY}" r="14" fill="${theme.background[1]}" stroke="${nodeColor}" stroke-width="5" />
      <line x1="${lineX + 14}" y1="${cardCenterY}" x2="${cardX}" y2="${cardCenterY}" stroke="${theme.cardStroke}" stroke-width="2" stroke-dasharray="4 4" />
      
      <!-- Left Content (Giant Number, Emoji, Title) -->
      <text x="${cardX + leftWidth / 2}" y="${cardCenterY + 45}" fill="${nodeColor}" font-size="130" font-weight="900" opacity="0.08" text-anchor="middle" font-family="sans-serif">0${i+1}</text>
    `;
      
    const emojiGap = 32; // Increased to spread out content
    const titleLineHeight = 40; // Increased line height to fill space better
    const emojiHeight = phase.emoji ? 46 : 0;
    
    // Total height of the content block
    const totalContentHeight = emojiHeight + (phase.emoji ? emojiGap : 0) + (titleLines.length * titleLineHeight);
    
    // Start drawing from the top of this centered block
    let currentTextY = cardCenterY - totalContentHeight / 2;
    
    if (phase.emoji) {
        currentTextY += emojiHeight; // baseline of emoji
        contentSvg += `<text x="${cardX + leftWidth / 2}" y="${currentTextY}" fill="${theme.text}" font-size="46" text-anchor="middle">${escapeXml(phase.emoji)}</text>`;
        currentTextY += emojiGap;
    }
    
    currentTextY += 30; // baseline of first title line
    
    titleLines.forEach((line, idx) => {
        contentSvg += `<text x="${cardX + leftWidth / 2}" y="${currentTextY + (idx * titleLineHeight)}" fill="${theme.text}" font-size="28" font-weight="800" text-anchor="middle" letter-spacing="0.03em">${escapeXml(line)}</text>`;
    });
    
    // Right Content (Skills and Outcome)
    let textY = currentY + 30; // Reduced top padding
    
    if (skillLines.length > 0) {
        contentSvg += `<text x="${cardX + leftWidth + 50}" y="${textY}" fill="${theme.accent}" font-size="16" font-weight="800" letter-spacing="0.2em">KEY SKILLS</text>`;
        textY += 34;
        contentSvg += renderWrappedTextLines(skillLines, cardX + leftWidth + 50, textY, 28, theme.muted, 18, rightWidth - 100);
        textY += skillLines.length * 28 + 24; // Reduced gap
    } else {
        textY += 28 + 24;
    }
    
    contentSvg += `<text x="${cardX + leftWidth + 50}" y="${textY}" fill="${nodeColor}" font-size="16" font-weight="800" letter-spacing="0.2em">OUTCOME</text>`;
    textY += 34;
    contentSvg += renderWrappedTextLines(outcomeLines.length ? outcomeLines : [""], cardX + leftWidth + 50, textY, 28, theme.text, 18, rightWidth - 100);
    
    currentY += cardHeight + gap;
  }
  
  const bgLine = `<line x1="${lineX}" y1="${startY - 20}" x2="${lineX}" y2="${lastCardCenterY}" stroke="${theme.line}" stroke-width="4" />`;
  
  return { svg: bgLine + contentSvg, height: currentY - startY, width };
}
