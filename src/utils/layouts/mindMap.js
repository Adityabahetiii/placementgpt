import { calculatePhaseHeight, renderPhaseContent } from "../components/PhaseCard.js";
import { getPhaseNodeColor } from "../renderer/colors.js";

export default function layoutMindMap(phases, theme, width, startY) {
  const rootR = 80;
  const rootX = width / 2;
  let svg = "";
  
  let currentY = startY;
  const cardWidth = 500;
  const gap = 40;
  
  let rows = [];
  for (let i = 0; i < phases.length; i += 2) {
    const pLeft = phases[i];
    const pRight = phases[i + 1];
    
    const hLeft = calculatePhaseHeight(pLeft, cardWidth);
    const hRight = pRight ? calculatePhaseHeight(pRight, cardWidth) : 0;
    
    const rowHeight = Math.max(hLeft, hRight);
    rows.push({
      pLeft, pRight, rowHeight, indexLeft: i, indexRight: i + 1
    });
  }
  
  const totalContentHeight = rows.reduce((sum, row) => sum + row.rowHeight, 0) + (rows.length - 1) * gap;
  const rootY = startY + totalContentHeight / 2; 
  
  svg += `
    <circle cx="${rootX}" cy="${rootY}" r="${rootR}" fill="${theme.cardFill}" stroke="${theme.accent}" stroke-width="4" filter="url(#shadow)" />
    <text x="${rootX}" y="${rootY + 10}" fill="${theme.text}" font-size="28" font-weight="bold" text-anchor="middle">Start</text>
  `;
  
  for (const row of rows) {
    // Draw Left Card
    const cardXLeft = rootX - rootR - 100 - cardWidth;
    const nodeColorLeft = getPhaseNodeColor(theme, row.indexLeft);
    const endPtXLeft = cardXLeft + cardWidth;
    const endPtYLeft = currentY + row.rowHeight / 2;
    
    svg += `<path d="M ${rootX - rootR} ${rootY} C ${rootX - rootR - 100} ${rootY}, ${endPtXLeft + 100} ${endPtYLeft}, ${endPtXLeft} ${endPtYLeft}" fill="none" stroke="${nodeColorLeft}" stroke-width="4" opacity="0.6" />`;
    
    svg += `
      <rect x="${cardXLeft}" y="${currentY}" width="${cardWidth}" height="${row.rowHeight}" rx="24" fill="${theme.cardFill}" stroke="${nodeColorLeft}" stroke-width="2" />
    `;
    svg += renderPhaseContent(row.pLeft, cardXLeft, currentY, theme, cardWidth, row.rowHeight);
    
    // Draw Right Card (if exists)
    if (row.pRight) {
        const cardXRight = rootX + rootR + 100;
        const nodeColorRight = getPhaseNodeColor(theme, row.indexRight);
        const endPtXRight = cardXRight;
        const endPtYRight = currentY + row.rowHeight / 2;
        
        svg += `<path d="M ${rootX + rootR} ${rootY} C ${rootX + rootR + 100} ${rootY}, ${endPtXRight - 100} ${endPtYRight}, ${endPtXRight} ${endPtYRight}" fill="none" stroke="${nodeColorRight}" stroke-width="4" opacity="0.6" />`;
        
        svg += `
          <rect x="${cardXRight}" y="${currentY}" width="${cardWidth}" height="${row.rowHeight}" rx="24" fill="${theme.cardFill}" stroke="${nodeColorRight}" stroke-width="2" />
        `;
        svg += renderPhaseContent(row.pRight, cardXRight, currentY, theme, cardWidth, row.rowHeight);
    }
    
    currentY += row.rowHeight + gap;
  }
  
  return { svg, height: currentY - startY - gap + 40, width };
}
