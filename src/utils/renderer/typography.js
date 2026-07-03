import { escapeXml } from "./renderUtils.js";

export function wrapText(text = "", maxChars = 42) {
  const words = String(text).split(/\s+/).filter(Boolean); if (words.length === 0) return [""];
  const lines = []; let current = "";
  for (const word of words) {
    const next = current ? current + " " + word : word;
    if (next.length > maxChars && current) { lines.push(current); current = word; continue; }
    if (next.length > maxChars) {
      const pieces = word.match(new RegExp(".{1," + maxChars + "}", "g")) || [word];
      if (current) { lines.push(current); current = ""; }
      lines.push(...pieces.slice(0, -1)); current = pieces[pieces.length - 1] || ""; continue;
    }
    current = next;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [String(text)];
}

export function renderWrappedTextLines(lines, x, y, lineHeight, color, fontSize, fontWeight) {
  return lines.map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" fill="${color}" font-size="${fontSize}" font-weight="${fontWeight}">${escapeXml(line)}</text>`).join("");
}
