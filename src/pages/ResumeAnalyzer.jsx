import { useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function ResumeAnalyzer() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [showExtractedText, setShowExtractedText] = useState(false);
  const fileInputRef = useRef(null);

  const readFileAsArrayBuffer = (selectedFile) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Unable to read the PDF file."));
      reader.readAsArrayBuffer(selectedFile);
    });

  const extractResumeText = async (selectedFile) => {
    const buffer = await readFileAsArrayBuffer(selectedFile);
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

    let text = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      text += `${pageText}\n`;
    }

    return text.trim();
  };

  const analyzeResume = async () => {
    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const text = await extractResumeText(file);

      const response = await fetch("http://localhost:5000/analyze-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText: text,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const message =
          typeof payload === "string"
            ? payload
            : payload?.error || "Failed to analyze resume.";
        throw new Error(message);
      }

      setAnalysis(payload);
      setShowExtractedText(false);
    } catch (analysisError) {
      console.error(analysisError);
      setError(
        analysisError instanceof Error ? analysisError.message : "Failed to analyze resume.",
      );
    } finally {
      setLoading(false);
    }
  };

  const extractedText =
    typeof analysis?.extractedText === "string" ? analysis.extractedText : "";

  const summaryCards = useMemo(
    () => [
      {
        label: "ATS Score",
        value: analysis?.atsScore,
      },
      {
        label: "Resume Verdict",
        value: analysis?.verdict || "No verdict returned yet.",
      },
    ],
    [analysis?.atsScore, analysis?.verdict],
  );

  const sections = [
    {
      title: "Strengths",
      icon: "✨",
      items: analysis?.strengths,
    },
    {
      title: "Areas to Improve",
      icon: "🛠️",
      items: analysis?.weaknesses || analysis?.areasToImprove,
    },
    {
      title: "Missing Keywords",
      icon: "🔍",
      items: analysis?.missingKeywords,
    },
    {
      title: "Recommended Changes",
      icon: "🧭",
      items: analysis?.suggestions || analysis?.recommendedChanges,
    },
  ];

  const renderList = (items) => {
    if (!items || items.length === 0) {
      return <p className="text-sm text-slate-500">No data returned.</p>;
    }

    return (
      <ul className="space-y-2 text-sm text-slate-200">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2 leading-6">
            <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  };

  const scoreValue = Number.isFinite(Number(analysis?.atsScore))
    ? Number(analysis?.atsScore)
    : null;
  const scoreDisplay = scoreValue === null ? "--" : String(scoreValue);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (selectedFile) => {
    setFile(selectedFile);
    setAnalysis(null);
    setError("");
    setShowExtractedText(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.15),transparent_32%),linear-gradient(to_bottom,#020617,#0f172a_45%,#020617)] px-4 py-7 text-white sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 lg:gap-7">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Resume Analyzer
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Upload your resume to get an ATS score and improvement suggestions.
          </p>
        </header>

        <section className="rounded-[2rem] bg-slate-950/70 px-5 py-5 shadow-[0_20px_80px_rgba(2,6,23,0.5)] ring-1 ring-white/5 backdrop-blur sm:px-8 sm:py-6">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="rounded-[1.75rem] bg-slate-900/70 p-5 shadow-inner shadow-slate-950/30 ring-1 ring-white/5 sm:p-6">
              <label className="mb-3 block text-sm font-medium text-slate-300">
                Upload PDF Resume
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0] || null;
                  handleFileChange(selectedFile);
                }}
                className="sr-only"
              />

              {!file ? (
                <div className="flex min-h-[108px] items-center gap-4 rounded-[1.35rem] bg-slate-950/60 px-4 py-4 ring-1 ring-white/5 sm:px-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-xl text-cyan-300 ring-1 ring-cyan-300/15">
                    📄
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white sm:text-base">
                      Upload your PDF resume
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Get an ATS score, keyword feedback, and clear improvement suggestions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className="shrink-0 rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Choose Resume PDF
                  </button>
                </div>
              ) : (
                <div className="flex min-h-[98px] flex-col gap-3 rounded-[1.35rem] bg-slate-950/60 px-4 py-4 ring-1 ring-white/5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-lg text-cyan-300 ring-1 ring-cyan-300/15">
                      📄
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-100 sm:text-base">
                        Selected resume
                      </p>
                      <p
                        className="min-w-0 truncate whitespace-nowrap text-sm text-cyan-200"
                        title={file.name}
                      >
                        {file.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="rounded-full border border-cyan-400/25 bg-slate-900/80 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/40 hover:bg-slate-800"
                    >
                      Change File
                    </button>

                    <button
                      type="button"
                      onClick={analyzeResume}
                      disabled={loading || !file}
                      className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? "Analyzing..." : "Analyze Resume"}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </p>
              )}
            </div>

            {analysis && (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.5rem] bg-slate-900/70 p-5 ring-1 ring-white/5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                      ATS Score
                    </p>

                    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-end gap-2">
                        <div className="text-5xl font-semibold leading-none text-white sm:text-6xl">
                          {scoreDisplay}
                        </div>
                        <div className="pb-1 text-lg font-medium text-slate-400 sm:text-xl">
                          /100
                        </div>
                      </div>

                      <div className="max-w-sm space-y-2">
                        <p className="text-sm font-medium text-cyan-100 sm:text-base">
                          {scoreValue === null
                            ? "Waiting for a score"
                            : scoreValue >= 80
                              ? "Strong match"
                              : scoreValue >= 60
                                ? "Good foundation"
                                : "Needs refinement"}
                        </p>
                        <p className="text-sm leading-6 text-slate-400">
                          A quick ATS-style signal for how closely your resume aligns with the
                          target role.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] bg-slate-900/70 p-5 ring-1 ring-white/5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                      Resume Verdict
                    </p>
                    <div className="mt-4 rounded-[1.25rem] bg-slate-950/60 p-4">
                      <p className="text-sm leading-6 text-slate-200">
                        {analysis?.verdict || "No verdict returned yet."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {sections.map((section) => (
                    <div
                      key={section.title}
                      className="rounded-[1.5rem] bg-slate-900/65 p-5 ring-1 ring-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{section.icon}</span>
                        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">
                          {section.title}
                        </h2>
                      </div>
                      <div className="mt-4">{renderList(section.items)}</div>
                    </div>
                  ))}
                </div>

                {extractedText && (
                  <div className="rounded-[1.5rem] bg-slate-900/65 p-5 ring-1 ring-white/5">
                    <button
                      type="button"
                      onClick={() => setShowExtractedText((current) => !current)}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
                    >
                      {showExtractedText ? "Hide extracted text" : "View extracted text"}
                    </button>

                    {showExtractedText && (
                      <div className="mt-4 rounded-[1.25rem] bg-slate-950/75 p-4 ring-1 ring-white/5">
                        <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                          {extractedText}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}