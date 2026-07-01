import jsPDF from "jspdf";

const TEMPLATE_MAP = {
  cyberNeon: {
    id: "cyberNeon",
    name: "Cyber Neon",
    description: "Electric gradients and bold contrast.",
    layout: "center",
    background: ["#020617", "#08111f", "#050816"],
    cardFill: "rgba(8, 16, 32, 0.9)",
    cardStroke: "rgba(56, 189, 248, 0.55)",
    accent: "#22d3ee",
    accentSoft: "rgba(34, 211, 238, 0.18)",
    accentTwo: "#60a5fa",
    text: "#f8fbff",
    muted: "#9fb5d1",
    line: "rgba(96, 165, 250, 0.8)",
    node: "#22d3ee",
    shadow: "rgba(34, 211, 238, 0.3)",
  },
  glassmorphism: {
    id: "glassmorphism",
    name: "Glassmorphism",
    description: "Soft glass panels with a premium sheen.",
    layout: "leftRail",
    background: ["#07111f", "#0e1a2e", "#0a1220"],
    cardFill: "rgba(255, 255, 255, 0.08)",
    cardStroke: "rgba(255, 255, 255, 0.22)",
    accent: "#7dd3fc",
    accentSoft: "rgba(125, 211, 252, 0.12)",
    accentTwo: "#a78bfa",
    text: "#f8fbff",
    muted: "#c8d4e5",
    line: "rgba(125, 211, 252, 0.65)",
    node: "#a5f3fc",
    shadow: "rgba(15, 23, 42, 0.45)",
  },
  verticalTimeline: {
    id: "verticalTimeline",
    name: "Vertical Timeline",
    description: "Classic rail layout with strong hierarchy.",
    layout: "leftRail",
    background: ["#0a1222", "#0f172a", "#111827"],
    cardFill: "rgba(15, 23, 42, 0.96)",
    cardStroke: "rgba(148, 163, 184, 0.28)",
    accent: "#38bdf8",
    accentSoft: "rgba(56, 189, 248, 0.12)",
    accentTwo: "#f8fafc",
    text: "#f8fafc",
    muted: "#cbd5e1",
    line: "rgba(148, 163, 184, 0.55)",
    node: "#38bdf8",
    shadow: "rgba(15, 23, 42, 0.55)",
  },
  roadmapShStyle: {
    id: "roadmapShStyle",
    name: "Roadmap.sh Style",
    description: "Clean, structured, and developer focused.",
    layout: "center",
    background: ["#071421", "#0b1220", "#050814"],
    cardFill: "rgba(255, 255, 255, 0.04)",
    cardStroke: "rgba(96, 165, 250, 0.32)",
    accent: "#8b5cf6",
    accentSoft: "rgba(139, 92, 246, 0.14)",
    accentTwo: "#38bdf8",
    text: "#f8fafc",
    muted: "#b5c0d0",
    line: "rgba(56, 189, 248, 0.55)",
    node: "#8b5cf6",
    shadow: "rgba(8, 15, 31, 0.56)",
  },
  minimalProfessional: {
    id: "minimalProfessional",
    name: "Minimal Professional",
    description: "Elegant balance with restrained accents.",
    layout: "stacked",
    background: ["#0b1220", "#101827", "#0f172a"],
    cardFill: "rgba(255, 255, 255, 0.03)",
    cardStroke: "rgba(148, 163, 184, 0.24)",
    accent: "#60a5fa",
    accentSoft: "rgba(96, 165, 250, 0.12)",
    accentTwo: "#dbeafe",
    text: "#f8fafc",
    muted: "#cbd5e1",
    line: "rgba(96, 165, 250, 0.28)",
    node: "#93c5fd",
    shadow: "rgba(15, 23, 42, 0.4)",
  },
};

export const ROADMAP_TEMPLATES = Object.values(TEMPLATE_MAP);

export function getRoadmapTemplate(templateId) {
  return TEMPLATE_MAP[templateId] || ROADMAP_TEMPLATES[0];
}

export function getRandomRoadmapTemplate() {
  return ROADMAP_TEMPLATES[
    Math.floor(Math.random() * ROADMAP_TEMPLATES.length)
  ];
}

export function slugifyRoadmapFileName(title = "roadmap") {
  return String(title)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "roadmap";
}

export function downloadSvgFile(svgContent, fileName) {
  const blob = new Blob([svgContent], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function svgToBlob(svgContent) {
  return new Blob([svgContent], {
    type: "image/svg+xml;charset=utf-8",
  });
}

export async function downloadPngFromSvg(svgContent, fileName) {
  const blob = svgToBlob(svgContent);
  const url = URL.createObjectURL(blob);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

    const svgDoc = new DOMParser().parseFromString(svgContent, "image/svg+xml");
    const svgElement = svgDoc.documentElement;
    const width = Number(svgElement.getAttribute("width")) || 1600;
    const height = Number(svgElement.getAttribute("height")) || 1200;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas context unavailable.");
    }

    context.drawImage(image, 0, 0, width, height);

    await new Promise((resolve) => {
      canvas.toBlob((canvasBlob) => {
        if (!canvasBlob) {
          resolve(null);
          return;
        }

        const downloadUrl = URL.createObjectURL(canvasBlob);
        const link = document.createElement("a");

        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);
        resolve(null);
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadPdfFromSvg(svgContent, fileName) {
  const blob = svgToBlob(svgContent);
  const url = URL.createObjectURL(blob);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

    const svgDoc = new DOMParser().parseFromString(svgContent, "image/svg+xml");
    const svgElement = svgDoc.documentElement;
    const width = Number(svgElement.getAttribute("width")) || 1600;
    const height = Number(svgElement.getAttribute("height")) || 1200;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas context unavailable.");
    }

    context.drawImage(image, 0, 0, width, height);

    const pngDataUrl = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: width > height ? "landscape" : "portrait",
      unit: "px",
      format: [width, height],
    });

    pdf.addImage(pngDataUrl, "PNG", 0, 0, width, height);
    pdf.save(fileName);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function escapeXml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text = "", maxChars = 42) {
  const words = String(text).split(/\s+/).filter(Boolean);

  if (words.length === 0) return [""];

  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
      continue;
    }

    if (next.length > maxChars) {
      const pieces = word.match(new RegExp(`.{1,${maxChars}}`, "g")) || [word];

      if (current) {
        lines.push(current);
        current = "";
      }

      lines.push(...pieces.slice(0, -1));
      current = pieces[pieces.length - 1] || "";
      continue;
    }

    current = next;
  }

  if (current) lines.push(current);

  return lines.length ? lines : [String(text)];
}

function countWrappedLines(items, maxChars) {
  return items.reduce((total, item) => total + wrapText(String(item), maxChars).length, 0);
}

function renderWrappedTextLines(lines, x, y, lineHeight, color, fontSize, fontWeight) {
  return lines
    .map((line, index) => `
      <text x="${x}" y="${y + index * lineHeight}" fill="${color}" font-size="${fontSize}" font-weight="${fontWeight}">
        ${escapeXml(line)}
      </text>
    `)
    .join("");
}

function renderSkillRows(skills, x, y, width, theme) {
  const items = skills.length ? skills : ["No skills listed."];
  let cursorY = y;

  return items
    .map((skill) => {
      const lines = wrapText(String(skill), width > 900 ? 54 : 42).slice(0, 2);
      const blockHeight = lines.length * 20 + 14;
      const itemY = cursorY;
      cursorY += blockHeight;

      return `
        <g>
          <circle cx="${x + 6}" cy="${itemY + 6}" r="3.5" fill="${theme.accentTwo}" />
          ${renderWrappedTextLines(
            lines,
            x + 18,
            itemY,
            20,
            theme.accentTwo,
            16,
            500
          )}
        </g>
      `;
    })
    .join("");
}

function getPhaseNodeColor(template, index) {
  return index % 2 === 0 ? template.accent : template.node;
}

function renderFooterList(items, x, y, width, title, theme) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  const maxWidth = Math.max(28, width - 48);
  const lines = list.length
    ? list.flatMap((item) => wrapText(String(item), Math.max(24, Math.floor(maxWidth / 10))))
    : ["Not specified"];

  return `
    <g transform="translate(${x}, ${y})">
      <rect x="0" y="0" width="${width}" height="220" rx="28" fill="${theme.cardFill}" stroke="${theme.cardStroke}" stroke-width="1.2" />
      <text x="28" y="44" fill="${theme.accent}" font-size="22" font-weight="700" letter-spacing="0.08em">${escapeXml(title.toUpperCase())}</text>
      ${lines
        .slice(0, 7)
        .map(
          (line, index) => `
            <text x="28" y="${86 + index * 24}" fill="${theme.text}" font-size="19" font-weight="500">${escapeXml(line)}</text>
          `
        )
        .join("")}
    </g>
  `;
}

function renderHero(roadmap, theme, width) {
  const title = escapeXml(roadmap.title || "Roadmap");
  const duration = escapeXml(roadmap.duration || "Roadmap");
  const summaryLines = wrapText(roadmap.summary || "", 78).slice(0, 3);

  return `
    <g>
      <rect x="0" y="0" width="${width}" height="280" fill="url(#bgGlow)" opacity="0.88" />
      <circle cx="1360" cy="90" r="170" fill="url(#accentGlow)" opacity="0.8" />
      <circle cx="118" cy="108" r="120" fill="url(#softGlow)" opacity="0.9" />
      <text x="90" y="102" fill="${theme.accent}" font-size="26" font-weight="700" letter-spacing="0.22em">PLACEMENTGPT ROADMAP</text>
      <text x="90" y="175" fill="${theme.text}" font-size="54" font-weight="800">${title}</text>
      <rect x="90" y="202" width="240" height="48" rx="24" fill="${theme.accentSoft}" stroke="${theme.cardStroke}" />
      <text x="118" y="233" fill="${theme.accentTwo}" font-size="22" font-weight="700">${duration}</text>
      ${summaryLines
        .map(
          (line, index) => `
            <text x="90" y="${312 + index * 30}" fill="${theme.muted}" font-size="22" font-weight="400">${escapeXml(line)}</text>
          `
        )
        .join("")}
    </g>
  `;
}

function renderPhaseCard(phase, index, theme, layout, width, topY) {
  const cardWidth = layout === "stacked" ? 1260 : 620;
  const titleLines = wrapText(phase.title || `Phase ${index + 1}`, 28).slice(0, 2);
  const skillItems = Array.isArray(phase.skills) ? phase.skills.filter(Boolean) : [];
  const skillLayout = skillItems.map((skill) => wrapText(String(skill), 52).slice(0, 2));
  const skillBlockHeight = skillLayout.reduce((total, lines) => total + lines.length * 20 + 14, 0);
  const outcomeLines = wrapText(phase.outcome || "", 58).slice(0, 3);
  const cardHeight = 180 + titleLines.length * 30 + skillBlockHeight + outcomeLines.length * 24;
  const isLeft = layout === "center" ? index % 2 === 0 : true;
  const cardX =
    layout === "stacked"
      ? 170
      : layout === "leftRail"
        ? 220
        : isLeft
          ? 90
          : width - 90 - cardWidth;
  const nodeX = layout === "stacked" ? 150 : layout === "leftRail" ? 150 : width / 2;
  const cardY = topY;
  const cardCenterY = cardY + cardHeight / 2;
  const nodeColor = getPhaseNodeColor(theme, index);
  const titleY = cardY + 56;
  const skillsTitleY = cardY + 118;
  const skillsStartY = cardY + 148;
  const outcomeTitleY = skillsStartY + skillBlockHeight + 20;
  const outcomeStartY = outcomeTitleY + 30;

  const connector = layout === "stacked"
    ? `
      <line x1="${nodeX}" y1="${cardY + 14}" x2="${nodeX}" y2="${cardY + cardHeight - 14}" stroke="${theme.line}" stroke-width="4" stroke-dasharray="8 10" />
    `
    : `
      <path d="M ${nodeX} ${cardCenterY} C ${nodeX + (isLeft ? -88 : 88)} ${cardCenterY - 24}, ${cardX + (isLeft ? cardWidth : 0)} ${cardCenterY - 24}, ${cardX + (isLeft ? cardWidth : 0)} ${cardCenterY}" fill="none" stroke="${theme.line}" stroke-width="4" />
    `;

  return `
    <g>
      ${connector}
      <circle cx="${nodeX}" cy="${cardCenterY}" r="18" fill="${nodeColor}" opacity="0.25" />
      <circle cx="${nodeX}" cy="${cardCenterY}" r="11" fill="${nodeColor}" />
      <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="30" fill="${theme.cardFill}" stroke="${theme.cardStroke}" stroke-width="1.2" />
      <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="8" rx="30" fill="url(#accentLine)" opacity="0.85" />
      <text x="${cardX + 28}" y="${titleY}" fill="${theme.text}" font-size="24" font-weight="700">${escapeXml(phase.emoji || "✨")} ${escapeXml(titleLines[0] || "Phase")}</text>
      ${titleLines[1] ? `<text x="${cardX + 28}" y="${titleY + 30}" fill="${theme.text}" font-size="24" font-weight="700">${escapeXml(titleLines[1])}</text>` : ""}

      <text x="${cardX + 28}" y="${skillsTitleY}" fill="${theme.accent}" font-size="18" font-weight="700" letter-spacing="0.14em">SKILLS</text>
      ${renderSkillRows(skillItems.slice(0, 6), cardX + 28, skillsStartY, cardWidth - 56, theme)}

      <text x="${cardX + 28}" y="${outcomeTitleY}" fill="${theme.accent}" font-size="18" font-weight="700" letter-spacing="0.14em">OUTCOME</text>
      ${renderWrappedTextLines(
        outcomeLines.length ? outcomeLines : ["Build a strong foundation for the next phase."],
        cardX + 28,
        outcomeStartY,
        24,
        theme.muted,
        18,
        400
      )}
    </g>
  `;
}

function renderRoadmapGrid(roadmap, theme, width, startY) {
  const phases = Array.isArray(roadmap.phases) ? roadmap.phases : [];
  const layout = theme.layout;
  const phaseSpacing = layout === "stacked" ? 320 : 310;
  const topY = startY;
  const totalHeight = topY + phases.length * phaseSpacing + 330;
  const lineX = layout === "center" ? width / 2 : 150;
  const lineTop = topY - 22;
  const lineBottom = totalHeight - 300;

  return `
    <g>
      <line x1="${lineX}" y1="${lineTop}" x2="${lineX}" y2="${lineBottom}" stroke="${theme.line}" stroke-width="5" stroke-linecap="round" stroke-dasharray="10 12" opacity="0.9" />
      ${phases
        .map((phase, index) =>
          renderPhaseCard(
            phase,
            index,
            theme,
            layout,
            width,
            topY + index * phaseSpacing
          )
        )
        .join("")}
    </g>
  `;
}

function renderFooter(roadmap, theme, width, startY) {
  const highlights = Array.isArray(roadmap.highlights) ? roadmap.highlights : [];
  const nextSteps = Array.isArray(roadmap.nextSteps) ? roadmap.nextSteps : [];
  const leftWidth = 680;
  const rightWidth = 680;
  const footerY = startY;

  return `
    <g>
      ${renderFooterList(highlights, 90, footerY, leftWidth, "Highlights", theme)}
      ${renderFooterList(nextSteps, width - 90 - rightWidth, footerY, rightWidth, "Next Steps", theme)}
    </g>
  `;
}

export function buildRoadmapSvg(roadmap, templateId) {
  const theme = getRoadmapTemplate(templateId);
  const width = 1600;
  const phases = Array.isArray(roadmap?.phases) ? roadmap.phases : [];
  const layout = theme.layout;
  const phaseSpacing = layout === "stacked" ? 320 : 310;
  const footerStart = 340 + phases.length * phaseSpacing;
  const height = Math.max(1400, footerStart + 390);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="${escapeXml(roadmap?.title || "Roadmap infographic")}" style="width:100%;height:auto;display:block;">
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
      <rect width="${width}" height="${height}" fill="url(#bg)" />
      <rect width="${width}" height="${height}" fill="url(#grid)" opacity="0.5" />
      ${renderHero(roadmap || {}, theme, width)}
      ${phases.length ? renderRoadmapGrid(roadmap || {}, theme, width, 390) : `
        <text x="90" y="420" fill="${theme.text}" font-size="26" font-weight="700">No roadmap phases were generated.</text>
      `}
      ${renderFooter(roadmap || {}, theme, width, footerStart)}
    </svg>
  `;
}
