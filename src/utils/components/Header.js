import { escapeXml } from "../renderer/renderUtils.js";
import { wrapText } from "../renderer/typography.js";

export function renderHero(roadmap, theme, width) {
  const title = escapeXml(roadmap.title || "Roadmap");
  const duration = escapeXml(roadmap.duration || "Roadmap");
  const summaryLines = wrapText(roadmap.summary || "", Math.floor(width / 20)).slice(0, 3);
  return `
    <g>
      <rect x="0" y="0" width="${width}" height="280" fill="url(#bgGlow)" opacity="0.88" />
      <circle cx="${width - 240}" cy="90" r="170" fill="url(#accentGlow)" opacity="0.8" />
      <circle cx="118" cy="108" r="120" fill="url(#softGlow)" opacity="0.9" />
      <text x="90" y="135" fill="${theme.text}" font-size="54" font-weight="800" text-anchor="start">${title}</text>
      <rect x="90" y="162" width="240" height="48" rx="24" fill="${theme.accentSoft}" stroke="${theme.cardStroke}" />
      <text x="118" y="193" fill="${theme.accentTwo}" font-size="22" font-weight="700" text-anchor="start">${duration}</text>
      ${summaryLines.map((line, index) => `<text x="90" y="${272 + index * 30}" fill="${theme.muted}" font-size="22" font-weight="400" text-anchor="start">${escapeXml(line)}</text>`).join("")}
    </g>
  `;
}
