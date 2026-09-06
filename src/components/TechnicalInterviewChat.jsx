import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Code2,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowRight,
  MessageSquareText,
  RotateCcw,
} from "lucide-react";
import dsaQuestions from "../data/dsaQuestions";

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_SCRIPT_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`;

let pyodideLoadPromise = null;

// Loads the Pyodide runtime once and caches the promise, so remounting this
// component (or navigating away and back) doesn't reload the ~10MB runtime.
function loadPyodideRuntime(onProgress) {
  if (pyodideLoadPromise) return pyodideLoadPromise;

  pyodideLoadPromise = new Promise((resolve, reject) => {
    if (window.loadPyodide) {
      onProgress?.("Starting Python runtime...");
      window
        .loadPyodide({ indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/` })
        .then(resolve, reject);
      return;
    }

    const existing = document.querySelector(`script[src="${PYODIDE_SCRIPT_URL}"]`);
    const script = existing || document.createElement("script");
    if (!existing) {
      script.src = PYODIDE_SCRIPT_URL;
      script.async = true;
      document.body.appendChild(script);
    }

    script.addEventListener("load", () => {
      onProgress?.("Starting Python runtime...");
      window
        .loadPyodide({ indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/` })
        .then(resolve, reject);
    });
    script.addEventListener("error", () =>
      reject(new Error("Failed to load the Python runtime from the CDN."))
    );
  });

  return pyodideLoadPromise;
}

function buildHarness(functionName, testCases) {
  const json = JSON.stringify(testCases);
  // Base64-encode so the payload can never collide with Python string
  // delimiters, regardless of what characters appear in the test data.
  const base64Payload = btoa(unescape(encodeURIComponent(json)));

  return `
import json, base64

_test_cases = json.loads(base64.b64decode("${base64Payload}").decode("utf-8"))
_results = []

for _tc in _test_cases:
    try:
        _actual = ${functionName}(*_tc["args"])
        _passed = _actual == _tc["expected"]
        _results.append({"passed": _passed, "actual": _actual, "expected": _tc["expected"]})
    except Exception as _e:
        _results.append({
            "passed": False,
            "actual": None,
            "expected": _tc["expected"],
            "error": f"{type(_e).__name__}: {_e}",
        })

json.dumps(_results)
`;
}

function difficultyClasses(difficulty) {
  if (difficulty === "Easy") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (difficulty === "Medium") return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  return "border-red-400/30 bg-red-400/10 text-red-300";
}

export default function TechnicalInterviewChat() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const question = dsaQuestions[questionIndex];

  const [code, setCode] = useState(question.signature + "\n    pass\n");
  const [runtimeStatus, setRuntimeStatus] = useState("loading"); // idle | loading | ready | error
  const [runtimeMessage, setRuntimeMessage] = useState("Loading Python runtime (first time only, ~10MB)...");
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [showHints, setShowHints] = useState(false);

  const [feedbackMessages, setFeedbackMessages] = useState([]);
  const [isRequestingFeedback, setIsRequestingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  const pyodideRef = useRef(null);
  const feedbackEndRef = useRef(null);

  // Load the Python runtime once, in the background, as soon as this page opens.
  useEffect(() => {
    let cancelled = false;

    loadPyodideRuntime(setRuntimeMessage)
      .then((pyodide) => {
        if (cancelled) return;
        pyodideRef.current = pyodide;
        setRuntimeStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Pyodide load error:", err);
        setRuntimeStatus("error");
        setRuntimeMessage(
          "Couldn't load the Python runtime. Check your internet connection and reload the page."
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    feedbackEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [feedbackMessages, isRequestingFeedback]);

  const resetForQuestion = useCallback((index) => {
    setQuestionIndex(index);
    setCode(dsaQuestions[index].signature + "\n    pass\n");
    setTestResults(null);
    setShowHints(false);
    setFeedbackMessages([]);
    setFeedbackError("");
  }, []);

  const runTests = async () => {
    if (runtimeStatus !== "ready" || !pyodideRef.current) return;
    setIsRunning(true);
    setTestResults(null);

    try {
      const pyodide = pyodideRef.current;
      await pyodide.runPythonAsync(code);
      const harness = buildHarness(question.functionName, question.testCases);
      const resultJson = await pyodide.runPythonAsync(harness);
      const parsed = JSON.parse(resultJson);
      setTestResults(parsed);
    } catch (err) {
      console.error("Python execution error:", err);
      setTestResults([
        {
          passed: false,
          actual: null,
          expected: null,
          error: String(err).split("\n").pop() || "Execution failed.",
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const requestFeedback = async () => {
    if (!testResults) {
      await runTests();
    }
    setIsRequestingFeedback(true);
    setFeedbackError("");

    try {
      const apiMessages = feedbackMessages.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const response = await fetch(`${import.meta.env.VITE_API_URL}/technical-interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          code,
          testResults: testResults || [],
          messages: apiMessages,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to get feedback.");

      setFeedbackMessages((prev) => [
        ...prev,
        { sender: "user", text: "Please review my solution." },
        { sender: "bot", text: data.reply },
      ]);
    } catch (err) {
      console.error(err);
      setFeedbackError("Couldn't reach the interviewer for feedback. Please try again.");
    } finally {
      setIsRequestingFeedback(false);
    }
  };

  const allPassed = testResults && testResults.length > 0 && testResults.every((t) => t.passed);

  return (
    <main className="flex h-screen min-h-0 flex-1 flex-col overflow-hidden bg-[#060b1d] text-white">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-[#080f25] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/20">
            <Code2 size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Technical Interview</h1>
            <p className="text-xs text-slate-500">Python DSA practice, graded in your browser</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dsaQuestions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => resetForQuestion(i)}
              title={q.title}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition ${
                i === questionIndex
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
                  : "border border-slate-700 bg-slate-900 text-slate-400 hover:border-cyan-400/40"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </header>

      {runtimeStatus !== "ready" && (
        <div
          className={`flex shrink-0 items-center gap-2 border-b px-6 py-2 text-sm ${
            runtimeStatus === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-cyan-400/20 bg-cyan-400/5 text-cyan-200"
          }`}
        >
          {runtimeStatus === "loading" && <Loader2 size={14} className="animate-spin" />}
          {runtimeMessage}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Question panel */}
        <section className="min-h-0 overflow-y-auto border-b border-slate-800 bg-[#080f25] p-6 lg:w-[380px] lg:border-b-0 lg:border-r">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${difficultyClasses(question.difficulty)}`}
            >
              {question.difficulty}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-xs text-slate-400">
              {question.topic}
            </span>
          </div>

          <h2 className="text-xl font-bold">{question.title}</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
            {question.description}
          </p>

          {question.examples.map((ex, i) => (
            <div key={i} className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs">
              <p className="font-mono text-slate-300">
                <span className="text-slate-500">Input: </span>
                {ex.input}
              </p>
              <p className="mt-1 font-mono text-slate-300">
                <span className="text-slate-500">Output: </span>
                {ex.output}
              </p>
              {ex.explanation && <p className="mt-1 text-slate-500">{ex.explanation}</p>}
            </div>
          ))}

          <div className="mt-6 space-y-4">
            <div>
              <button
                onClick={() => setShowHints((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 transition hover:text-amber-200"
              >
                <Lightbulb size={14} />
                {showHints ? "Hide hints" : "Show hints"}
              </button>

              {showHints && (
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-slate-400">
                  {question.hints.map((hint, i) => (
                    <li key={i}>{hint}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <button
                onClick={() => resetForQuestion((questionIndex + 1) % dsaQuestions.length)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-400/40 hover:bg-slate-800 hover:text-cyan-300"
              >
                Next question
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

        </section>

        {/* Editor + results + feedback */}
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
            {/* Code editor */}
            <div className="flex min-h-[240px] flex-1 flex-col border-b border-slate-800 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between border-b border-slate-800 bg-[#080f25] px-4 py-2">
                <span className="font-mono text-xs text-slate-500">solution.py</span>
                <button
                  onClick={() => setCode(question.signature + "\n    pass\n")}
                  title="Reset to starter code"
                  className="inline-flex items-center gap-1 text-xs text-slate-500 transition hover:text-red-300"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="min-h-0 flex-1 resize-none bg-[#050912] p-4 font-mono text-sm leading-6 text-slate-100 outline-none"
              />
              <div className="flex items-center gap-3 border-t border-slate-800 bg-[#080f25] px-4 py-3">
                <button
                  onClick={runTests}
                  disabled={runtimeStatus !== "ready" || isRunning}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  Run Tests
                </button>
                <button
                  onClick={requestFeedback}
                  disabled={runtimeStatus !== "ready" || isRunning || isRequestingFeedback}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRequestingFeedback ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <MessageSquareText size={16} />
                  )}
                  Ask Interviewer for Feedback
                </button>
              </div>
            </div>

            {/* Test results + feedback */}
            <div className="flex min-h-[240px] flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {testResults && (
                  <div className="mb-4 space-y-2">
                    <p
                      className={`text-sm font-semibold ${allPassed ? "text-emerald-300" : "text-red-300"}`}
                    >
                      {allPassed
                        ? `All ${testResults.length} tests passed`
                        : `${testResults.filter((t) => t.passed).length}/${testResults.length} tests passed`}
                    </p>
                    {testResults.map((t, i) => (
                      <div
                        key={i}
                        className={`rounded-lg border px-3 py-2 text-xs ${
                          t.passed
                            ? "border-emerald-400/20 bg-emerald-400/5"
                            : "border-red-400/20 bg-red-400/5"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-medium">
                          {t.passed ? (
                            <CheckCircle2 size={13} className="text-emerald-400" />
                          ) : (
                            <XCircle size={13} className="text-red-400" />
                          )}
                          Test {i + 1}
                        </div>
                        {!t.passed && (
                          <div className="mt-1 space-y-0.5 pl-[19px] font-mono text-slate-400">
                            {t.expected !== null && (
                              <p>expected: {JSON.stringify(t.expected)}</p>
                            )}
                            {t.actual !== null && <p>got: {JSON.stringify(t.actual)}</p>}
                            {t.error && <p className="text-red-300">{t.error}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {feedbackMessages.length === 0 && !testResults && (
                  <p className="text-sm text-slate-500">
                    Write your solution, then click Run Tests to check it against{" "}
                    {question.testCases.length} test cases, or ask the interviewer for feedback
                    directly.
                  </p>
                )}

                <div className="space-y-3">
                  {feedbackMessages
                    .filter((m) => m.sender === "bot")
                    .map((m, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200"
                      >
                        <div className="prose prose-invert prose-sm max-w-none prose-p:leading-6 prose-headings:text-white prose-strong:text-cyan-200 prose-code:text-cyan-300">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                        </div>
                      </div>
                    ))}

                  {isRequestingFeedback && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 size={14} className="animate-spin" />
                      Interviewer is reviewing your code...
                    </div>
                  )}

                  {feedbackError && (
                    <p className="text-sm text-red-300">{feedbackError}</p>
                  )}
                </div>

                <div ref={feedbackEndRef} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
