import { wrapText } from "../renderer/typography.js";
import { escapeXml } from "../renderer/renderUtils.js";
import { getPhaseNodeColor } from "../renderer/colors.js";

export default function layoutInfographic(phases, theme, width, startY) {
  let currentY = startY;
  const cardWidth = 1100;
  const cardX = (width - cardWidth) / 2;
  const gap = 80;
  const bannerWidth = 240;
  
  let svg = "";
  
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const nodeColor = getPhaseNodeColor(theme, i);
    const isLeft = i % 2 === 0;
    
    let textY = currentY + 40; // Top padding
    
    let titleStr = phase.title || "Phase";
    let phaseLabel = `0${i + 1}`.slice(-2);
    const match = titleStr.match(/^(Phase\s*\d+:)\s*(.*)/i);
    if (match) { titleStr = match[2] || titleStr; }
    
    const maxTextWidth = cardWidth - bannerWidth - 100; // 760px
    const contentX = isLeft ? cardX + bannerWidth + 50 : cardX + 50;
    
    const titleLines = wrapText(titleStr, Math.floor(maxTextWidth / 17.5)); // font 32
    const titleStartY = textY;
    textY += titleLines.length * 40;
    
    const skillItems = Array.isArray(phase.skills) ? phase.skills.filter(Boolean) : [];
    let skillsSvg = "";
    if (skillItems.length > 0) {
        textY += 32; // Larger gap before KEY SKILLS
        skillsSvg += `<text x="${contentX}" y="${textY}" fill="${nodeColor}" font-size="14" font-weight="900" letter-spacing="0.15em">KEY SKILLS</text>`;
        textY += 40; // Increased gap between heading and first point!
        
        for (const skill of skillItems) {
            const skillLines = wrapText(String(skill), Math.floor((maxTextWidth - 40) / 9.5)); // font 18
            const blockHeight = skillLines.length * 26;
            
            // Draw bullet icon exactly aligned with optical center of first text line (baseline is textY, so center is textY - 6)
            skillsSvg += `
                <circle cx="${contentX + 10}" cy="${textY - 6}" r="5" fill="${nodeColor}" />
                <circle cx="${contentX + 10}" cy="${textY - 6}" r="10" fill="${nodeColor}" opacity="0.25" />
            `;
            
            for (let j = 0; j < skillLines.length; j++) {
                skillsSvg += `<text x="${contentX + 36}" y="${textY + j * 26}" fill="${theme.muted}" font-size="18" font-family="sans-serif">${escapeXml(skillLines[j])}</text>`;
            }
            textY += blockHeight + 20; // Increased gap between individual skill points
        }
    }
    
    const outcomeLines = wrapText(phase.outcome || "", Math.floor((maxTextWidth - 50) / 9.5)); // font 18
    let outcomeSvg = "";
    if (outcomeLines.length > 0) {
        textY += 24;
        const outcomeHeight = 44 + outcomeLines.length * 26; // 44px for the OUTCOME label and padding
        outcomeSvg += `
            <rect x="${contentX}" y="${textY}" width="${maxTextWidth}" height="${outcomeHeight}" rx="12" fill="${theme.background[1]}" stroke="${theme.cardStroke}" stroke-width="1.5" />
            <line x1="${contentX + 4}" y1="${textY + 16}" x2="${contentX + 4}" y2="${textY + outcomeHeight - 16}" stroke="${nodeColor}" stroke-width="6" stroke-linecap="round" />
            <text x="${contentX + 30}" y="${textY + 28}" fill="${nodeColor}" font-size="12" font-weight="900" letter-spacing="0.15em">OUTCOME</text>
        `;
        for (let j = 0; j < outcomeLines.length; j++) {
            outcomeSvg += `<text x="${contentX + 30}" y="${textY + 54 + j * 26}" fill="${theme.text}" font-size="18" font-weight="600">${escapeXml(outcomeLines[j])}</text>`;
        }
        textY += outcomeHeight + 20;
    } else {
        textY += 20;
    }
    
    // Add bottom padding
    textY += 20;
    const cardHeight = Math.max(260, textY - currentY);
    
    const bannerX = isLeft ? cardX : cardX + cardWidth - bannerWidth;
    const bannerCenter = bannerX + bannerWidth / 2;
    
    // Draw connecting S-curve from previous card
    if (i > 0) {
        const prevIsLeft = (i - 1) % 2 === 0;
        const prevBannerX = prevIsLeft ? cardX : cardX + cardWidth - bannerWidth;
        const prevBannerCenter = prevBannerX + bannerWidth / 2;
        
        svg += `
            <path d="M ${prevBannerCenter} ${currentY - gap} C ${prevBannerCenter} ${currentY - gap/2}, ${bannerCenter} ${currentY - gap/2}, ${bannerCenter} ${currentY}" fill="none" stroke="${theme.cardStroke}" stroke-width="4" stroke-dasharray="10 10" />
            <circle cx="${bannerCenter}" cy="${currentY}" r="6" fill="${theme.cardStroke}" />
            <circle cx="${prevBannerCenter}" cy="${currentY - gap}" r="6" fill="${theme.cardStroke}" />
        `;
    }
    
    // Draw Card Base
    svg += `
      <g filter="url(#shadow)">
        <rect x="${cardX}" y="${currentY}" width="${cardWidth}" height="${cardHeight}" rx="24" fill="${theme.cardFill}" stroke="${theme.cardStroke}" stroke-width="1.5" />
      </g>
    `;
    
    // Draw Banner Background with Clip
    svg += `
        <clipPath id="banner-clip-${i}">
            <rect x="${cardX}" y="${currentY}" width="${cardWidth}" height="${cardHeight}" rx="24" />
        </clipPath>
        <rect x="${bannerX}" y="${currentY}" width="${bannerWidth}" height="${cardHeight}" fill="${nodeColor}" opacity="0.08" clip-path="url(#banner-clip-${i})" />
    `;
    
    // Draw Banner border line
    if (isLeft) {
        svg += `<rect x="${bannerX + bannerWidth - 1}" y="${currentY}" width="1" height="${cardHeight}" fill="${theme.cardStroke}" />`;
    } else {
        svg += `<rect x="${bannerX}" y="${currentY}" width="1" height="${cardHeight}" fill="${theme.cardStroke}" />`;
    }
    
    // Draw Number in Banner (Removed Emoji for cleaner look)
    const bannerMiddle = currentY + cardHeight / 2;
    svg += `
        <text x="${bannerCenter}" y="${bannerMiddle + 45}" fill="${nodeColor}" font-size="140" font-weight="900" opacity="0.15" text-anchor="middle" font-family="sans-serif">${phaseLabel}</text>
    `;
    
    // Draw Title
    for (let j = 0; j < titleLines.length; j++) {
        svg += `<text x="${contentX}" y="${titleStartY + 32 + j * 40}" fill="${theme.text}" font-size="32" font-weight="900">${escapeXml(titleLines[j])}</text>`;
    }
    
    svg += skillsSvg;
    svg += outcomeSvg;
    
    currentY += cardHeight + gap;
  }
  
  return { svg, height: currentY - startY - gap + 40, width };
}
