import { calculatePhaseHeight, renderPhaseContent } from "../components/PhaseCard.js";
import { getPhaseNodeColor } from "../renderer/colors.js";

export default function layoutMinimal(phases, theme, width, startY) {
  let currentY = startY;
  const gap = 60;
  const cardWidth = 800;
  const cardX = (width - cardWidth) / 2;
  let svg = "";
  
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const cardHeight = calculatePhaseHeight(phase, cardWidth);
    const nodeColor = getPhaseNodeColor(theme, i);
    
    if (i > 0) {
      svg += `<line x1="${cardX + 40}" y1="${currentY - gap}" x2="${cardX + 40}" y2="${currentY}" stroke="${theme.line}" stroke-width="2" />`;
    }
    
    svg += `
      <rect x="${cardX}" y="${currentY}" width="${cardWidth}" height="${cardHeight}" rx="8" fill="${theme.cardFill}" stroke="${theme.cardStroke}" stroke-width="1" />
      <circle cx="${cardX + 40}" cy="${currentY + 40}" r="15" fill="none" stroke="${nodeColor}" stroke-width="4" />
      <circle cx="${cardX + 40}" cy="${currentY + 40}" r="6" fill="${nodeColor}" />
    `;
    svg += renderPhaseContent(phase, cardX + 30, currentY, theme, cardWidth - 30);
    currentY += cardHeight + gap;
  }
  
  return { svg, height: currentY - startY, width };
}
