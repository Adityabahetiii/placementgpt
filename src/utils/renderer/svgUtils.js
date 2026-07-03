import jsPDF from "jspdf";

export function slugifyRoadmapFileName(title = "roadmap") { 
  return String(title).toLowerCase().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "roadmap"; 
}

export function downloadSvgFile(svgContent, fileName) {
  const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = fileName; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

export function svgToBlob(svgContent) { 
  return new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" }); 
}

export async function downloadPngFromSvg(svgContent, fileName) {
  const blob = svgToBlob(svgContent); const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
    const svgDoc = new DOMParser().parseFromString(svgContent, "image/svg+xml");
    const svgElement = svgDoc.documentElement;
    const width = Number(svgElement.getAttribute("width")) || 1600; const height = Number(svgElement.getAttribute("height")) || 1200;
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d"); if (!context) throw new Error("Canvas context unavailable.");
    context.drawImage(image, 0, 0, width, height);
    await new Promise((resolve) => { canvas.toBlob((canvasBlob) => { if (!canvasBlob) { resolve(null); return; } const downloadUrl = URL.createObjectURL(canvasBlob); const link = document.createElement("a"); link.href = downloadUrl; link.download = fileName; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(downloadUrl); resolve(null); }, "image/png"); });
  } finally { URL.revokeObjectURL(url); }
}

export async function downloadPdfFromSvg(svgContent, fileName) {
  const blob = svgToBlob(svgContent); const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
    const svgDoc = new DOMParser().parseFromString(svgContent, "image/svg+xml");
    const svgElement = svgDoc.documentElement;
    const width = Number(svgElement.getAttribute("width")) || 1600; const height = Number(svgElement.getAttribute("height")) || 1200;
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d"); if (!context) throw new Error("Canvas context unavailable.");
    context.drawImage(image, 0, 0, width, height);
    const pngDataUrl = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: width > height ? "landscape" : "portrait", unit: "px", format: [width, height] });
    pdf.addImage(pngDataUrl, "PNG", 0, 0, width, height); pdf.save(fileName);
  } finally { URL.revokeObjectURL(url); }
}
