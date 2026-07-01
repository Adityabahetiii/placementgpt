import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import RoadmapSVG from "../components/RoadmapSVG";
import {
  ROADMAP_TEMPLATES,
  buildRoadmapSvg,
  downloadSvgFile,
  getRandomRoadmapTemplate,
  slugifyRoadmapFileName,
} from "../utils/roadmapRenderer";

const API_URL = import.meta.env.VITE_API_URL;

function RoadmapArtifact({ item }) {
  const cardRef = useRef(null);
  const [templateId, setTemplateId] = useState(item.templateId);
  const template = ROADMAP_TEMPLATES.find((entry) => entry.id === templateId) ||
    ROADMAP_TEMPLATES[0];
  const fileBaseName = slugifyRoadmapFileName(item.roadmap?.title || item.goal || "roadmap");

  useEffect(() => {
    setTemplateId(item.templateId);
  }, [item.templateId]);

  const exportSvg = () => {
    const svg = buildRoadmapSvg(item.roadmap, templateId);
    downloadSvgFile(svg, `${fileBaseName}.svg`);
  };

  const exportPng = async () => {
    if (!cardRef.current) return;

    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
    });

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${fileBaseName}.png`;
    link.click();
  };

  const exportPdf = async () => {
    if (!cardRef.current) return;

    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
    });

    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? "landscape" : "portrait",
      unit: "px",
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      canvas.width,
      canvas.height
    );
    pdf.save(`${fileBaseName}.pdf`);
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/90 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.55)]">
      {item.text && <p className="mb-4 text-slate-300">{item.text}</p>}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-cyan-300">
            {item.roadmap.title}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {item.roadmap.duration} roadmap poster · {template.name}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {ROADMAP_TEMPLATES.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setTemplateId(entry.id)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                templateId === entry.id
                  ? "border-cyan-400 bg-cyan-400/15 text-cyan-200"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500 hover:text-cyan-200"
              }`}
            >
              {entry.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5" ref={cardRef}>
        <RoadmapSVG roadmap={item.roadmap} templateId={templateId} />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={exportSvg}
          className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
        >
          Download SVG
        </button>
        <button
          type="button"
          onClick={exportPng}
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-500 hover:text-cyan-200"
        >
          Download PNG
        </button>
        <button
          type="button"
          onClick={exportPdf}
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-500 hover:text-cyan-200"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}

export default function Roadmap() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const startFreshChat = () => {
      setMessages([]);
      setMessage("");
      setLoading(false);
    };

    window.addEventListener("placementgpt_new_chat", startFreshChat);

    return () => {
      window.removeEventListener("placementgpt_new_chat", startFreshChat);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const addBotMessage = (text) => {
    setMessages((previous) => [
      ...previous,
      {
        id: Date.now() + Math.random(),
        sender: "bot",
        type: "text",
        text,
      },
    ]);
  };

  const generateRoadmap = async (goal, duration, level, reply) => {
    try {
      const response = await fetch(`${API_URL}/generate-roadmap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          goal,
          duration,
          level,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate roadmap.");
      }

      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + Math.random(),
          sender: "bot",
          type: "roadmap",
          text: reply || "",
          roadmap: data,
          templateId: getRandomRoadmapTemplate().id,
          goal,
          duration,
          level,
        },
      ]);
    } catch (error) {
      console.error("Roadmap generation error:", error);

      addBotMessage(
        `❌ ${error.message || "Could not generate the roadmap. Please try again."}`
      );
    }
  };

  const sendMessage = async (text = message) => {
    const trimmedText = text.trim();

    if (!trimmedText || loading) return;

    const userMessage = {
      id: Date.now() + Math.random(),
      sender: "user",
      type: "text",
      text: trimmedText,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setMessage("");
    setLoading(true);

    try {
      const apiMessages = updatedMessages
        .filter((item) => item.type === "text")
        .map((item) => ({
          role: item.sender === "user" ? "user" : "assistant",
          content: item.text,
        }));

      const response = await fetch(`${API_URL}/roadmap-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not continue the roadmap conversation."
        );
      }

      if (data.type === "question") {
        addBotMessage(
          data.reply || "Could you share one more detail about your goal?"
        );
        return;
      }

      if (!data.goal || !data.duration || !data.level) {
        addBotMessage(
          "I need one more detail before creating your roadmap. What is your current level and how much time do you have?"
        );
        return;
      }

      if (data.type === "roadmap") {
        await generateRoadmap(data.goal, data.duration, data.level, data.reply);
        return;
      }

      addBotMessage(
        data.reply ||
          "Could you tell me a little more about the roadmap you need?"
      );
    } catch (error) {
      console.error("Roadmap chat error:", error);

      addBotMessage(
        `❌ ${error.message || "Something went wrong. Please try again."}`
      );
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Give me a 6 month roadmap for Prompt Engineer as a beginner",
    "I want a 3 month roadmap for Data Analyst",
    "Generate a roadmap for Cybersecurity for 6 months as a beginner",
    "Create a 2 month roadmap to learn Blender as a beginner",
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950 text-white">
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        {messages.length === 0 && (
          <div className="mx-auto mt-10 max-w-4xl text-center">
            <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200">
              Premium SVG Roadmaps
            </div>

            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
              Build your roadmap as a poster, not an AI image.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-400">
              Create detailed learning roadmaps for any career, skill, certification, programming language, exam, or technology. The roadmap is generated as structured JSON and rendered into a premium infographic.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-left backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400 hover:bg-slate-800 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]"
                >
                  <p className="text-lg font-semibold leading-8 text-cyan-300 group-hover:text-cyan-200">
                    {suggestion}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-5xl space-y-6">
          {messages.map((item) => (
            <div key={item.id}>
              {item.sender === "user" && (
                <div className="ml-auto max-w-2xl rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-white shadow-lg shadow-blue-950/30">
                  {item.text}
                </div>
              )}

              {item.sender === "bot" && item.type === "text" && (
                <div className="max-w-3xl rounded-2xl rounded-tl-sm border border-slate-800 bg-slate-900/90 p-4 shadow-lg shadow-slate-950/30">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{item.text}</ReactMarkdown>
                  </div>
                </div>
              )}

              {item.sender === "bot" && item.type === "roadmap" && (
                <RoadmapArtifact item={item} />
              )}
            </div>
          ))}

          {loading && (
            <div className="max-w-fit rounded-2xl border border-slate-800 bg-slate-900 p-4 animate-pulse">
              🤖 PlacementGPT is thinking...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-slate-800 bg-slate-950 p-4">
        <div className="mx-auto flex max-w-5xl gap-3">
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                sendMessage();
              }
            }}
            placeholder="Example: Give me a 6 month roadmap for Prompt Engineer as a beginner"
            className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
          />

          <button
            onClick={() => sendMessage()}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
