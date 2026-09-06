export const TEMPLATE_MAP = {
  verticalTimeline: {
    id: "verticalTimeline", name: "Modern Timeline", description: "Elegant vertical timeline.", layoutType: "timeline",
    background: ["#0a1222", "#0f172a", "#111827"], cardFill: "rgba(15, 23, 42, 0.96)", cardStroke: "rgba(148, 163, 184, 0.28)",
    accent: "#38bdf8", accentSoft: "rgba(56, 189, 248, 0.12)", accentTwo: "#f8fafc", text: "#f8fafc", muted: "#cbd5e1",
    line: "rgba(148, 163, 184, 0.55)", node: "#38bdf8", shadow: "rgba(15, 23, 42, 0.55)"
  },
  horizontalRoadmap: {
    id: "horizontalRoadmap", name: "Horizontal Roadmap", description: "Left-to-right flow.", layoutType: "horizontal",
    background: ["#0f172a", "#1e293b", "#0f172a"], cardFill: "rgba(30, 41, 59, 0.9)", cardStroke: "rgba(148, 163, 184, 0.2)",
    accent: "#10b981", accentSoft: "rgba(16, 185, 129, 0.15)", accentTwo: "#34d399", text: "#f8fafc", muted: "#94a3b8",
    line: "rgba(16, 185, 129, 0.5)", node: "#10b981", shadow: "rgba(15, 23, 42, 0.4)"
  },
  roadmapShStyle: {
    id: "roadmapShStyle", name: "Roadmap.sh Style", description: "Clean, structured, and developer focused.", layoutType: "roadmapSh",
    background: ["#071421", "#0b1220", "#050814"], cardFill: "rgba(255, 255, 255, 0.04)", cardStroke: "rgba(96, 165, 250, 0.32)",
    accent: "#8b5cf6", accentSoft: "rgba(139, 92, 246, 0.14)", accentTwo: "#38bdf8", text: "#f8fafc", muted: "#b5c0d0",
    line: "rgba(56, 189, 248, 0.55)", node: "#8b5cf6", shadow: "rgba(8, 15, 31, 0.56)"
  },
  cyberNeon: {
    id: "cyberNeon", name: "Cyber Neon", description: "Futuristic glowing traces.", layoutType: "cyberNeon",
    background: ["#020617", "#08111f", "#050816"], cardFill: "rgba(8, 16, 32, 0.9)", cardStroke: "rgba(56, 189, 248, 0.55)",
    accent: "#22d3ee", accentSoft: "rgba(34, 211, 238, 0.18)", accentTwo: "#60a5fa", text: "#f8fbff", muted: "#9fb5d1",
    line: "rgba(96, 165, 250, 0.8)", node: "#22d3ee", shadow: "rgba(34, 211, 238, 0.3)"
  },
  minimalProfessional: {
    id: "minimalProfessional", name: "Minimal Professional", description: "Elegant balance with restrained accents.", layoutType: "minimal",
    background: ["#0b1220", "#101827", "#0f172a"], cardFill: "rgba(255, 255, 255, 0.03)", cardStroke: "rgba(148, 163, 184, 0.24)",
    accent: "#60a5fa", accentSoft: "rgba(96, 165, 250, 0.12)", accentTwo: "#dbeafe", text: "#f8fafc", muted: "#cbd5e1",
    line: "rgba(96, 165, 250, 0.28)", node: "#93c5fd", shadow: "rgba(15, 23, 42, 0.4)"
  },
  executive: {
    id: "executive", name: "Executive", description: "Business presentation style.", layoutType: "executive",
    background: ["#1e1b4b", "#312e81", "#1e1b4b"], cardFill: "rgba(255, 255, 255, 0.05)", cardStroke: "rgba(165, 180, 252, 0.4)",
    accent: "#818cf8", accentSoft: "rgba(129, 140, 248, 0.2)", accentTwo: "#c7d2fe", text: "#ffffff", muted: "#a5b4fc",
    line: "rgba(129, 140, 248, 0.6)", node: "#818cf8", shadow: "rgba(30, 27, 75, 0.6)"
  },
  flowchart: {
    id: "flowchart", name: "Flowchart", description: "Process diagram appearance.", layoutType: "flowchart",
    background: ["#171717", "#262626", "#171717"], cardFill: "rgba(64, 64, 64, 0.4)", cardStroke: "rgba(163, 163, 163, 0.5)",
    accent: "#f59e0b", accentSoft: "rgba(245, 158, 11, 0.15)", accentTwo: "#fbbf24", text: "#f5f5f5", muted: "#a3a3a3",
    line: "rgba(245, 158, 11, 0.6)", node: "#f59e0b", shadow: "rgba(23, 23, 23, 0.5)"
  },
  kanban: {
    id: "kanban", name: "Kanban", description: "Columns and buckets.", layoutType: "kanban",
    background: ["#0f172a", "#1e293b", "#0f172a"], cardFill: "rgba(30, 41, 59, 0.7)", cardStroke: "rgba(148, 163, 184, 0.3)",
    accent: "#f43f5e", accentSoft: "rgba(244, 63, 94, 0.15)", accentTwo: "#fb7185", text: "#f8fafc", muted: "#94a3b8",
    line: "rgba(244, 63, 94, 0.4)", node: "#f43f5e", shadow: "rgba(15, 23, 42, 0.5)"
  },
  infographic: {
    id: "infographic", name: "Infographic", description: "Rich visual stats.", layoutType: "infographic",
    background: ["#1e293b", "#334155", "#1e293b"], cardFill: "rgba(51, 65, 85, 0.8)", cardStroke: "rgba(253, 186, 116, 0.4)",
    accent: "#f97316", accentSoft: "rgba(249, 115, 22, 0.15)", accentTwo: "#fdba74", text: "#ffffff", muted: "#cbd5e1",
    line: "rgba(249, 115, 22, 0.5)", node: "#f97316", shadow: "rgba(30, 41, 59, 0.6)"
  },
  mindMap: {
    id: "mindMap", name: "Mind Map", description: "Radial layout from center.", layoutType: "mindMap",
    background: ["#082f49", "#0c4a6e", "#082f49"], cardFill: "rgba(12, 74, 110, 0.8)", cardStroke: "rgba(56, 189, 248, 0.4)",
    accent: "#0ea5e9", accentSoft: "rgba(14, 165, 233, 0.15)", accentTwo: "#7dd3fc", text: "#f0f9ff", muted: "#bae6fd",
    line: "rgba(14, 165, 233, 0.6)", node: "#0ea5e9", shadow: "rgba(8, 47, 73, 0.7)"
  },
};

export const ROADMAP_TEMPLATES = Object.values(TEMPLATE_MAP);

export function getRoadmapTemplate(templateId) { 
  return TEMPLATE_MAP[templateId] || ROADMAP_TEMPLATES[0]; 
}

export function getRandomRoadmapTemplate() { 
  return ROADMAP_TEMPLATES[Math.floor(Math.random() * ROADMAP_TEMPLATES.length)]; 
}
