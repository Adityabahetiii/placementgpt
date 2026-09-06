import { calculatePhaseHeight, renderPhaseContent } from "../components/PhaseCard.js";
import { getPhaseNodeColor } from "../renderer/colors.js";

export default function layoutCyberNeon(phases, theme, width, startY) {
  let currentY = startY;
  const gap = 100;
  const cardWidth = 700;
  const lineX = width / 2;
  let svg = "";
  
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const cardHeight = calculatePhaseHeight(phase, cardWidth);
    const cardX = lineX - cardWidth / 2;
    const nodeColor = getPhaseNodeColor(theme, i);
    
    if (i > 0) {
      svg += `<path d="M ${lineX} ${currentY - gap} L ${lineX} ${currentY}" fill="none" stroke="${theme.line}" stroke-width="3" filter="url(#shadow)" />`;
      svg += `<path d="M ${lineX-20} ${currentY-50} L ${lineX} ${currentY-30} L ${lineX+20} ${currentY-50}" fill="none" stroke="${nodeColor}" stroke-width="3" />`;
    }
    
    svg += `
      <rect x="${cardX}" y="${currentY}" width="${cardWidth}" height="${cardHeight}" rx="16" fill="${theme.cardFill}" stroke="${theme.cardStroke}" stroke-width="2" filter="url(#shadow)" />
      <path d="M ${cardX} ${currentY+30} L ${cardX} ${currentY+16} Q ${cardX} ${currentY} ${cardX+16} ${currentY} L ${cardX+50} ${currentY} L ${cardX+60} ${currentY+10} L ${cardX+150} ${currentY+10} L ${cardX+160} ${currentY} L ${cardWidth+cardX-16} ${currentY} Q ${cardWidth+cardX} ${currentY} ${cardWidth+cardX} ${currentY+16} L ${cardWidth+cardX} ${currentY+30}" fill="none" stroke="${nodeColor}" stroke-width="3" filter="url(#shadow)" />
    `;
    svg += renderPhaseContent(phase, cardX, currentY, theme, cardWidth);
    currentY += cardHeight + gap;
  }
  
  return { svg, height: currentY - startY, width };
}
