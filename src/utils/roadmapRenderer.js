import { getRoadmapTemplate, getRandomRoadmapTemplate, ROADMAP_TEMPLATES } from "./renderer/themeRegistry.js";
import { downloadSvgFile, downloadPngFromSvg, downloadPdfFromSvg, slugifyRoadmapFileName } from "./renderer/svgUtils.js";
import { renderHero } from "./components/Header.js";
import { renderFooter, getFooterHeight } from "./components/Footer.js";
import { escapeXml } from "./renderer/renderUtils.js";

// Layout Imports
import layoutTimeline from "./layouts/timeline.js";
import layoutHorizontal from "./layouts/horizontal.js";
import layoutRoadmapSh from "./layouts/roadmapSh.js";
import layoutCyberNeon from "./layouts/cyberNeon.js";
import layoutMinimal from "./layouts/minimal.js";
import layoutExecutive from "./layouts/executive.js";
import layoutFlowchart from "./layouts/flowchart.js";
import layoutKanban from "./layouts/kanban.js";
import layoutInfographic from "./layouts/infographic.js";
import layoutMindMap from "./layouts/mindMap.js";

// Re-export public API
export {
  ROADMAP_TEMPLATES,
  getRoadmapTemplate,
  getRandomRoadmapTemplate,
  downloadSvgFile,
  downloadPngFromSvg,
  downloadPdfFromSvg,
  slugifyRoadmapFileName
};

// Main Render Dispatcher
function renderRoadmapLayout(roadmap, theme, baseWidth, startY) {
  const phases = Array.isArray(roadmap.phases) ? roadmap.phases : [];
  
  switch (theme.layoutType) {
    case 'timeline': return layoutTimeline(phases, theme, baseWidth, startY);
    case 'horizontal': return layoutHorizontal(phases, theme, startY);
    case 'roadmapSh': return layoutRoadmapSh(phases, theme, baseWidth, startY);
    case 'cyberNeon': return layoutCyberNeon(phases, theme, baseWidth, startY);
    case 'minimal': return layoutMinimal(phases, theme, baseWidth, startY);
    case 'executive': return layoutExecutive(phases, theme, baseWidth, startY);
    case 'flowchart': return layoutFlowchart(phases, theme, baseWidth, startY);
    case 'kanban': return layoutKanban(phases, theme, baseWidth, startY);
    case 'infographic': return layoutInfographic(phases, theme, baseWidth, startY);
    case 'mindMap': return layoutMindMap(phases, theme, baseWidth, startY);
    default: return layoutTimeline(phases, theme, baseWidth, startY);
  }
}

export function buildRoadmapSvg(roadmap, templateId) {
  const theme = getRoadmapTemplate(templateId);
  const baseWidth = 1600;
  
  const layoutResult = renderRoadmapLayout(roadmap || {}, theme, baseWidth, 390);
  const finalWidth = Math.max(baseWidth, layoutResult.width);
  const footerStart = 390 + layoutResult.height + 20; // Reduced padding
  const footerHeight = getFooterHeight(roadmap || {}, finalWidth, theme);
  const finalHeight = theme.layoutType === 'timeline' 
    ? footerStart + footerHeight + 100 
    : Math.max(1400, footerStart + footerHeight + 100);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${finalWidth}" height="${finalHeight}" viewBox="0 0 ${finalWidth} ${finalHeight}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="${escapeXml(roadmap?.title || "Roadmap infographic")}" style="width:100%;height:auto;display:block;" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${theme.background[0]}" />
          <stop offset="55%" stop-color="${theme.background[1]}" />
          <stop offset="100%" stop-color="${theme.background[2]}" />
        </linearGradient>
        <radialGradient id="bgGlow" cx="50%" cy="0%" r="110%">
          <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.3" />
          <stop offset="60%" stop-color="${theme.accent}" stop-opacity="0.06" />
          <stop offset="100%" stop-color="${theme.background[2]}" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="accentGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.44" />
          <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="softGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="${theme.accentTwo}" stop-opacity="0.24" />
          <stop offset="100%" stop-color="${theme.accentTwo}" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="accentLine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${theme.accent}" />
          <stop offset="100%" stop-color="${theme.accentTwo}" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="${theme.shadow}" />
        </filter>
        <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
          <path d="M 64 0 L 0 0 0 64" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1" />
        </pattern>
      </defs>
      <rect width="${finalWidth}" height="${finalHeight}" fill="url(#bg)" />
      <rect width="${finalWidth}" height="${finalHeight}" fill="url(#grid)" opacity="0.5" />
      ${renderHero(roadmap || {}, theme, finalWidth)}
      ${layoutResult.svg || `<text x="90" y="420" fill="${theme.text}" font-size="26" font-weight="700">No roadmap phases were generated.</text>`}
      ${renderFooter(roadmap || {}, theme, finalWidth, footerStart, footerHeight)}
    </svg>
  `;
}
