import { calculatePhaseHeight, renderPhaseContent } from "../components/PhaseCard.js";
import { getPhaseNodeColor } from "../renderer/colors.js";

export default function layoutHorizontal(phases, theme, startY) {
  let svg = "";
  const cardWidth = 440;
  const gap = 50;
  const cardsPerRow = 3;
  const startX = 110;
  
  let currentY = startY;
  
  // Heights for all phases
  const phaseHeights = phases.map(p => calculatePhaseHeight(p, cardWidth, theme));
  const globalMaxHeight = Math.max(...phaseHeights, 0);
  
  for (let row = 0; row < phases.length; row += cardsPerRow) {
    const rowPhases = phases.slice(row, row + cardsPerRow);
    const rowHeights = phaseHeights.slice(row, row + cardsPerRow);
    const lineY = currentY + globalMaxHeight / 2;
    
    // Draw row connectors (horizontal lines between cards in the same row)
    for (let i = 0; i < rowPhases.length; i++) {
      const phaseIndex = row + i;
      const phase = rowPhases[i];
      const cardHeight = globalMaxHeight;
      const currentX = startX + i * (cardWidth + gap);
      const cardY = lineY - cardHeight / 2;
      const nodeColor = getPhaseNodeColor(theme, phaseIndex);
      
      if (i > 0) {
        svg += `<path d="M ${currentX - gap} ${lineY} L ${currentX} ${lineY}" fill="none" stroke="${theme.line}" stroke-width="5" />`;
        // Arrowhead
        svg += `<path d="M ${currentX - gap/2 - 10} ${lineY-12} L ${currentX - gap/2 + 10} ${lineY} L ${currentX - gap/2 - 10} ${lineY+12}" fill="none" stroke="${theme.line}" stroke-width="4" />`;
      }
      
      svg += `
        <rect x="${currentX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="20" fill="${theme.cardFill}" stroke="${theme.cardStroke}" stroke-width="2" />
        <circle cx="${currentX + 40}" cy="${cardY + 40}" r="25" fill="${nodeColor}" opacity="0.2" />
        <text x="${currentX + 40}" y="${cardY + 48}" fill="${nodeColor}" font-size="24" font-weight="bold" text-anchor="middle">${phaseIndex+1}</text>
      `;
      svg += renderPhaseContent(phase, currentX, cardY, theme, cardWidth, cardHeight);
    }
    
    // Draw inter-row connector if there is a next row
    if (row + cardsPerRow < phases.length) {
      const lastX = startX + (rowPhases.length - 1) * (cardWidth + gap) + cardWidth;
      const nextLineY = currentY + globalMaxHeight + 100 + globalMaxHeight / 2;
      
      const midY = (lineY + nextLineY) / 2;
      const r = 40;
      
      // Beautiful structured snake curve mapping back to the left side
      svg += `<path d="
        M ${lastX} ${lineY}
        Q ${lastX + r} ${lineY}, ${lastX + r} ${lineY + r}
        L ${lastX + r} ${midY - r}
        Q ${lastX + r} ${midY}, ${lastX} ${midY}
        L ${startX} ${midY}
        Q ${startX - r} ${midY}, ${startX - r} ${midY + r}
        L ${startX - r} ${nextLineY - r}
        Q ${startX - r} ${nextLineY}, ${startX} ${nextLineY}
      " fill="none" stroke="${theme.line}" stroke-width="4" stroke-dasharray="10 10" />`;
      
      // Arrowhead for the inter-row connector
      svg += `<path d="M ${startX - 22} ${nextLineY-12} L ${startX - 2} ${nextLineY} L ${startX - 22} ${nextLineY+12}" fill="none" stroke="${theme.line}" stroke-width="4" />`;
      
      currentY += globalMaxHeight + 100;
    } else {
      currentY += globalMaxHeight + 60;
    }
  }
  
  return { svg, height: currentY - startY, width: 1600 };
}
