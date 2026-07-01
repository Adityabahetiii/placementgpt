import { buildRoadmapSvg } from "../utils/roadmapRenderer";

export default function RoadmapSVG({ roadmap, templateId, titleId }) {
  const svgMarkup = buildRoadmapSvg(roadmap, templateId);

  return (
    <div
      id={titleId}
      className="overflow-hidden rounded-[32px] border border-cyan-400/20 bg-slate-950/80 p-3 shadow-[0_30px_100px_rgba(2,6,23,0.65)]"
    >
      <div
        className="w-full overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    </div>
  );
}
