import { calculatePhaseHeight, renderPhaseContent } from "../components/PhaseCard.js";
import { getPhaseNodeColor } from "../renderer/colors.js";

export default function layoutFlowchart(phases, theme, width, startY) {
  let currentY = startY;
  const gap = 100;
  const cardWidth = 600;
  const lineX = width / 2;
  let svg = "";
  
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const cardHeight = calculatePhaseHeight(phase, cardWidth);
    const cardX = lineX - cardWidth / 2;
    const nodeColor = getPhaseNodeColor(theme, i);
    
    if (i > 0) {
      svg += `<path d="M ${lineX} ${currentY - gap} L ${lineX} ${currentY - 15}" fill="none" stroke="${theme.line}" stroke-width="4" />`;
      svg += `<polygon points="${lineX-10},${currentY-15} ${lineX+10},${currentY-15} ${lineX},${currentY}" fill="${theme.line}" />`;
    }
    
    const shapeType = i % 3; 
    
    if (shapeType === 1) {
      // Hexagon (Pointed left/right)
      svg += `<polygon points="${cardX},${currentY} ${cardX+cardWidth},${currentY} ${cardX+cardWidth+40},${currentY+cardHeight/2} ${cardX+cardWidth},${currentY+cardHeight} ${cardX},${currentY+cardHeight} ${cardX-40},${currentY+cardHeight/2}" fill="${theme.cardFill}" stroke="${nodeColor}" stroke-width="3" />`;
    } else if (shapeType === 2) {
      // Octagon (Chamfered corners, replaces the diamond that had terrible space efficiency)
      const c = 30;
      svg += `<polygon points="${cardX+c},${currentY} ${cardX+cardWidth-c},${currentY} ${cardX+cardWidth},${currentY+c} ${cardX+cardWidth},${currentY+cardHeight-c} ${cardX+cardWidth-c},${currentY+cardHeight} ${cardX+c},${currentY+cardHeight} ${cardX},${currentY+cardHeight-c} ${cardX},${currentY+c}" fill="${theme.cardFill}" stroke="${nodeColor}" stroke-width="3" />`;
    } else {
      // Rounded Rectangle
      svg += `<rect x="${cardX}" y="${currentY}" width="${cardWidth}" height="${cardHeight}" rx="16" fill="${theme.cardFill}" stroke="${nodeColor}" stroke-width="3" />`;
    }
    
    svg += renderPhaseContent(phase, cardX, currentY, theme, cardWidth);
    currentY += cardHeight + gap;
  }
  
  return { svg, height: currentY - startY, width };
}
