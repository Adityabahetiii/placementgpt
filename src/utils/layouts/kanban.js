import { wrapText } from "../renderer/typography.js";
import { escapeXml } from "../renderer/renderUtils.js";
import { getPhaseNodeColor } from "../renderer/colors.js";

export default function layoutKanban(phases, theme, width, startY) {
  const cols = ["Foundation", "Core", "Advanced", "Mastery"];
  const colWidth = 440; // Increased column width for readability
  const colGap = 40;
  const totalWidth = cols.length * colWidth + (cols.length - 1) * colGap;
  const actualWidth = Math.max(width, totalWidth + 160);
  const startX = (actualWidth - totalWidth) / 2;

  let colHeights = [0, 0, 0, 0];
  let svg = "";

  // Draw Column Backgrounds
  for (let c = 0; c < cols.length; c++) {
    const cx = startX + c * (colWidth + colGap);
    svg += `
      <rect x="${cx}" y="${startY}" width="${colWidth}" height="10000" rx="20" fill="${theme.cardFill}" opacity="0.5" stroke="${theme.cardStroke}" stroke-width="1.5" class="kanban-col-${c}" />
      <text x="${cx + 24}" y="${startY + 50}" fill="${theme.text}" font-size="28" font-weight="800" letter-spacing="0.05em">${cols[c]}</text>
      <circle cx="${cx + colWidth - 40}" cy="${startY + 40}" r="18" fill="${theme.background[1]}" stroke="${theme.cardStroke}" />
      <text x="${cx + colWidth - 40}" y="${startY + 46}" fill="${theme.muted}" font-size="16" font-weight="bold" text-anchor="middle">0</text>
    `;
    colHeights[c] = 90;
  }

  const cardWidth = colWidth - 40; // 20px padding on sides of column
  
  // Phase 1: Pre-calculate wrapped text and max height for UNIFORM card sizes
  let layoutData = [];
  let maxCardHeight = 0;
  let maxTitleLines = 0;
  
  for (let i = 0; i < phases.length; i++) {
      let titleStr = phases[i].title || "Phase";
      const match = titleStr.match(/^(Phase\s*\d+:)\s*(.*)/i);
      if (match) { titleStr = match[2] || titleStr; }
      const titleLines = wrapText(titleStr, Math.floor((cardWidth - 48) / 13));
      if (titleLines.length > maxTitleLines) maxTitleLines = titleLines.length;
  }
  
  for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      let currentY = 0;
      currentY += 24; // Top padding
      currentY += 32; // Tag height
      
      let titleStr = phase.title || "Phase";
      let phaseLabel = `PHASE ${i + 1}`;
      const match = titleStr.match(/^(Phase\s*\d+:)\s*(.*)/i);
      if (match) {
          titleStr = match[2] || titleStr;
      }
      const titleLines = wrapText(titleStr, Math.floor((cardWidth - 48) / 13)); // Increased text capacity for font 24
      currentY += 20; // Gap before title
      currentY += maxTitleLines * 34; // Uniform Title block height!
      
      const skillItems = Array.isArray(phase.skills) ? phase.skills.filter(Boolean) : [];
      let skillsWrapped = [];
      if (skillItems.length > 0) {
          currentY += 24; // Gap before REQUIREMENTS
          currentY += 16; // REQUIREMENTS text
          currentY += 16; // Gap before pills
          
          for (const skill of skillItems) {
              const skillLines = wrapText(String(skill), Math.floor((cardWidth - 72) / 8.5)); // Font 16
              const pillHeight = 24 + skillLines.length * 24;
              skillsWrapped.push({ lines: skillLines, height: pillHeight });
              currentY += pillHeight + 12;
          }
      }
      
      const outcomeLines = wrapText(phase.outcome || "", Math.floor((cardWidth - 84) / 8.5)); // Font 16
      let outcomeBlockHeight = 0;
      if (outcomeLines.length > 0) {
          outcomeBlockHeight = 32 + outcomeLines.length * 26; // padding + text height
          currentY += 24 + outcomeBlockHeight; // Gap before outcome + outcome block
      } else {
          currentY += 24; // Bottom padding
      }
      
      layoutData.push({
          titleLines,
          phaseLabel,
          skillItems,
          skillsWrapped,
          outcomeLines,
          outcomeBlockHeight,
          calculatedHeight: currentY
      });
      
      if (currentY > maxCardHeight) {
          maxCardHeight = currentY;
      }
  }

  // Phase 2: Draw all cards using the uniform maxCardHeight
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const data = layoutData[i];
    const c = Math.min(Math.floor((i / phases.length) * cols.length), cols.length - 1);
    const cx = startX + c * (colWidth + colGap) + 20;
    const cardY = startY + colHeights[c];
    const nodeColor = getPhaseNodeColor(theme, i);
    
    // 1. Draw Card Background (UNIFORM HEIGHT)
    svg += `
      <g filter="url(#shadow)">
        <rect x="${cx}" y="${cardY}" width="${cardWidth}" height="${maxCardHeight}" rx="16" fill="${theme.cardFill}" stroke="${theme.cardStroke}" stroke-width="1.5" />
      </g>
    `;
    
    // 2. Phase Tag (Small colored pill)
    svg += `
        <rect x="${cx + 24}" y="${cardY + 24}" width="100" height="32" rx="16" fill="${nodeColor}" opacity="0.15" />
        <text x="${cx + 74}" y="${cardY + 45}" fill="${nodeColor}" font-size="14" font-weight="900" text-anchor="middle" letter-spacing="0.05em">${data.phaseLabel}</text>
    `;
    
    // 3. Emoji Avatar
    if (phase.emoji) {
        svg += `
            <circle cx="${cx + cardWidth - 40}" cy="${cardY + 40}" r="20" fill="${theme.background[1]}" stroke="${theme.cardStroke}" stroke-width="1" />
            <text x="${cx + cardWidth - 40}" y="${cardY + 47}" font-size="20" text-anchor="middle">${escapeXml(phase.emoji)}</text>
        `;
    }
    
    // 4. Title (Ticket Title)
    let currentTextY = cardY + 56 + 20; // bottom of tag + gap
    for (let j = 0; j < data.titleLines.length; j++) {
        svg += `<text x="${cx + 24}" y="${currentTextY + 24 + j * 34}" fill="${theme.text}" font-size="24" font-weight="900">${escapeXml(data.titleLines[j])}</text>`;
    }
    currentTextY += maxTitleLines * 34; // Advance by maxTitleLines to ensure Requirements align!
    
    // 5. Skills
    if (data.skillItems.length > 0) {
        currentTextY += 24;
        svg += `<text x="${cx + 24}" y="${currentTextY + 12}" fill="${theme.muted}" font-size="15" font-weight="800" letter-spacing="0.1em">REQUIREMENTS</text>`;
        currentTextY += 16 + 16;
        
        for (let j = 0; j < data.skillsWrapped.length; j++) {
            const skillData = data.skillsWrapped[j];
            svg += `<rect x="${cx + 24}" y="${currentTextY}" width="${cardWidth - 48}" height="${skillData.height}" rx="8" fill="${theme.background[1]}" stroke="${theme.cardStroke}" stroke-width="1" />`;
            
            for (let k = 0; k < skillData.lines.length; k++) {
                svg += `<text x="${cx + 40}" y="${currentTextY + 26 + k * 24}" fill="${theme.muted}" font-size="16" font-family="sans-serif">${escapeXml(skillData.lines[k])}</text>`;
            }
            currentTextY += skillData.height + 12;
        }
    }
    
    // 6. Outcome (Anchored precisely to the bottom of the fixed-height card)
    if (data.outcomeLines.length > 0) {
        const outcomeStartY = cardY + maxCardHeight - data.outcomeBlockHeight - 24; // 24px bottom padding
        svg += `
            <rect x="${cx + 24}" y="${outcomeStartY}" width="${cardWidth - 48}" height="${data.outcomeBlockHeight}" rx="12" fill="${nodeColor}" opacity="0.08" />
            <rect x="${cx + 24}" y="${outcomeStartY}" width="6" height="${data.outcomeBlockHeight}" rx="3" fill="${nodeColor}" />
        `;
        for (let j = 0; j < data.outcomeLines.length; j++) {
            svg += `<text x="${cx + 44}" y="${outcomeStartY + 30 + j * 26}" fill="${theme.text}" font-size="16" font-weight="600">${escapeXml(data.outcomeLines[j])}</text>`;
        }
    }
    
    colHeights[c] += maxCardHeight + 24; // 24px vertical gap between cards
  }

  const maxColHeight = Math.max(...colHeights);
  
  // Cut off the infinite columns to match the longest one precisely
  svg = svg.replace(/height="10000"/g, `height="${maxColHeight + 20}"`);
  
  // Update column counters
  for (let c = 0; c < cols.length; c++) {
      const count = phases.filter((_, i) => Math.min(Math.floor((i / phases.length) * cols.length), cols.length - 1) === c).length;
      const rx = new RegExp(`class="kanban-col-${c}"[\\s\\S]*?<text x=".*?" y=".*?" fill=".*?" font-size="16" font-weight="bold" text-anchor="middle">0</text>`);
      
      const cx = startX + c * (colWidth + colGap);
      svg = svg.replace(rx, `class="kanban-col-${c}" />
      <text x="${cx + 24}" y="${startY + 50}" fill="${theme.text}" font-size="28" font-weight="800" letter-spacing="0.05em">${cols[c]}</text>
      <circle cx="${cx + colWidth - 40}" cy="${startY + 40}" r="18" fill="${theme.background[1]}" stroke="${theme.cardStroke}" />
      <text x="${cx + colWidth - 40}" y="${startY + 46}" fill="${theme.muted}" font-size="16" font-weight="bold" text-anchor="middle">${count}</text>`);
  }

  return { svg, height: maxColHeight + 80, width: actualWidth };
}
