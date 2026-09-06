import { calculatePhaseHeight, renderPhaseContent } from "../components/PhaseCard.js";
import { getPhaseNodeColor } from "../renderer/colors.js";

export default function layoutRoadmapSh(phases, theme, width, startY) {
  let currentY = startY;
  const gap = 80;
  const cardWidth = 600;
  const lineX = width / 2;
  let svg = "";
  
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const cardHeight = calculatePhaseHeight(phase, cardWidth, theme);
    const isLeft = i % 2 === 0;
    const cardX = isLeft ? lineX - cardWidth : lineX;
    
    const nodeColor = getPhaseNodeColor(theme, i);
    
    if (i > 0) {
      const prevIsLeft = (i-1) % 2 === 0;
      const prevX = prevIsLeft ? lineX - cardWidth/2 : lineX + cardWidth/2;
      const currX = isLeft ? lineX - cardWidth/2 : lineX + cardWidth/2;
      svg += `<path d="M ${prevX} ${currentY - gap} L ${prevX} ${currentY - gap/2} L ${currX} ${currentY - gap/2} L ${currX} ${currentY}" fill="none" stroke="${theme.line}" stroke-width="6" stroke-linecap="square" />`;
    }
    
    svg += `
      <rect x="${cardX}" y="${currentY}" width="${cardWidth}" height="${cardHeight}" rx="4" fill="${theme.cardFill}" stroke="${nodeColor}" stroke-width="4" />
      <rect x="${cardX}" y="${currentY}" width="${cardWidth}" height="10" fill="${nodeColor}" />
    `;
    svg += renderPhaseContent(phase, cardX, currentY, theme, cardWidth, cardHeight);
    currentY += cardHeight + gap;
  }
  
  return { svg, height: currentY - startY, width };
}
