import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRef, useEffect, useState, useCallback } from "react";
import {
  Bot,
  Mic,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Keyboard,
  Send,
  UserRound,
} from "lucide-react";

// Strip Markdown symbols before handing text to the speech synthesizer, so
// the AI doesn't literally say "asterisk asterisk" or "hash hash".
function stripMarkdownForSpeech(text = "") {
  return text
    .replace(/[#*_`>~]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\|/g, ", ")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const SPEECH_SUPPORTED = Boolean(SpeechRecognitionAPI);
const SYNTHESIS_SUPPORTED =
  typeof window !== "undefined" && "speechSynthesis" in window;

function isFullscreenActive() {
  return Boolean(
    document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
  );
}

function enterFullscreen() {
  const el = document.documentElement;
  const request =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen;
  if (!request) return false;
  try {
    const result = request.call(el);
    if (result && typeof result.catch === "function") {
      result.catch((err) => {
        console.warn("Fullscreen request rejected:", err);
      });
    }
    return true;
  } catch (err) {
    // Can throw synchronously (e.g. inside an iframe without
    // allow="fullscreen", or blocked by browser/OS policy).
    console.warn("Fullscreen request blocked:", err);
    return false;
  }
}

function exitFullscreen() {
  if (!isFullscreenActive()) return;
  const exit =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.mozCancelFullScreen ||
    document.msExitFullscreen;
  if (exit) {
    Promise.resolve(exit.call(document)).catch(() => {});
  }
}

// Chrome sometimes returns an empty voice list on the very first call,
// since voices load asynchronously. This waits for them once, so the
// interview's opening line doesn't silently fail to speak.
let voicesReadyPromise = null;
function waitForVoices() {
  if (!SYNTHESIS_SUPPORTED) return Promise.resolve([]);
  if (voicesReadyPromise) return voicesReadyPromise;

  voicesReadyPromise = new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    const onVoicesChanged = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    // Fallback in case the event never fires on some browsers.
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500);
  });
  return voicesReadyPromise;
}

// A rough, deliberately generous estimate of how long an utterance will
// take to speak, used only as a safety-net timeout (see speak() below).
function estimateSpeechDurationMs(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = 150; // conservative TTS speaking rate
  return Math.max(2000, (words / wordsPerMinute) * 60000 + 4000);
}

function normalizeWords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

// Detects when a "candidate answer" is actually just the mic re-hearing
// the interviewer's own question/feedback through the speakers.
function isLikelyEcho(candidate, aiText) {
  const candidateWords = normalizeWords(candidate);
  if (candidateWords.length < 4) return false; // too short to judge reliably

  const aiWords = new Set(normalizeWords(aiText));
  if (aiWords.size === 0) return false;

  const overlap = candidateWords.filter((w) => aiWords.has(w)).length;
  const overlapRatio = overlap / candidateWords.length;

  return overlapRatio > 0.65;
}

// Interview lifecycle: "setup" -> "ai_speaking" -> "listening" -> "thinking" -> loop -> "ended"
export default function MockInterviewChat() {
  const [phase, setPhase] = useState("setup");
  const [roleInput, setRoleInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [typedAnswer, setTypedAnswer] = useState("");
  const [useTypedMode, setUseTypedMode] = useState(!SPEECH_SUPPORTED);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(SYNTHESIS_SUPPORTED);
  const [errorBanner, setErrorBanner] = useState("");
  const [violationWarning, setViolationWarning] = useState("");
  const [malpracticeReason, setMalpracticeReason] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const phaseRef = useRef(phase);
  const violationCountRef = useRef(0);
  const malpracticeTriggeredRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const handleIntegrityViolationRef = useRef(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, phase, interimTranscript]);

  // ---------- camera ----------
  const startCamera = useCallback(async () => {
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false, // mic audio is handled separately by SpeechRecognition
        });
      } catch (constraintErr) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.warn("Camera video play error:", err);
        });
      }

      // Detect the camera being turned off mid-interview (permission
      // revoked via the browser's own camera indicator, device unplugged,
      // OS-level camera privacy toggle, etc.) and treat it the same way
      // as exiting fullscreen or switching tabs.
      const [track] = stream.getVideoTracks();
      if (track) {
        track.onended = () => {
          if (intentionalStopRef.current) return;
          setVideoEnabled(false);
          handleIntegrityViolationRef.current?.("turned off their camera");
        };
      }

      setVideoEnabled(true);
      return true;
    } catch (err) {
      console.error("Camera error:", err);
      setVideoEnabled(false);
      setErrorBanner(
        "Camera access is required for this interview and couldn't be started (permission denied or no camera found). Please allow camera access and try again."
      );
      return false;
    }
  }, []);

  const handleVideoRef = useCallback((node) => {
    videoRef.current = node;
    if (node) {
      node.muted = true;
      node.defaultMuted = true;
      if (streamRef.current && node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
        node.play().catch((err) => {
          console.warn("Camera video play failed on ref mount:", err);
        });
      }
    }
  }, []);

  // Ensure camera feed stays connected across re-renders and phase changes
  useEffect(() => {
    if (videoEnabled && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch((err) => {
        console.warn("Camera video play failed in sync effect:", err);
      });
    }
  }, [phase, videoEnabled]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setVideoEnabled(false);
  }, []);

  // ---------- text to speech ----------
  const speak = useCallback(
    async (text) => {
      if (!voiceEnabled || !SYNTHESIS_SUPPORTED) return;

      window.speechSynthesis.cancel();
      const cleanText = stripMarkdownForSpeech(text);
      const voices = await waitForVoices();

      await new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1;
        utterance.pitch = 1;
        const preferred = voices.find((v) => /en-(US|GB|IN)/i.test(v.lang));
        if (preferred) utterance.voice = preferred;

        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearInterval(heartbeat);
          clearTimeout(safetyTimeout);
          // Chrome's onend can fire slightly before the speaker audio has
          // actually finished playing. Waiting for speechSynthesis.speaking
          // to go false, plus a short grace buffer, stops the mic from
          // picking up the tail end of the AI's own voice as an "answer".
          const waitForSilence = () => {
            if (!window.speechSynthesis.speaking) {
              setTimeout(resolve, 400);
            } else {
              setTimeout(waitForSilence, 150);
            }
          };
          waitForSilence();
        };

        // Chrome silently pauses speech synthesis after ~15s unless nudged;
        // this keeps long interview turns from cutting off mid-sentence.
        const heartbeat = setInterval(() => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 10000);

        // Safety net: if onend/onerror never fire due to a browser bug,
        // don't leave the interview stuck on "AI is speaking..." forever.
        const safetyTimeout = setTimeout(finish, estimateSpeechDurationMs(cleanText));

        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
      });
    },
    [voiceEnabled]
  );

  // ---------- speech to text ----------
  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    if (!SPEECH_SUPPORTED || useTypedMode) return;

    setInterimTranscript("");
    setFinalTranscript("");

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      let finalPiece = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalPiece += transcriptPiece + " ";
        } else {
          interim += transcriptPiece;
        }
      }
      if (finalPiece) {
        setFinalTranscript((prev) => prev + finalPiece);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setErrorBanner("Microphone access was denied. Switch to typing your answers below.");
        setUseTypedMode(true);
      }
    };

    // Auto-restart if it stops on its own (e.g. brief silence timeout)
    // while we're still supposed to be in the listening phase.
    recognition.onend = () => {
      if (phaseRef.current === "listening") {
        try {
          recognition.start();
        } catch {
          /* already started; ignore */
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [useTypedMode]);

  // ---------- backend call ----------
  const getAiReply = async (updatedMessages) => {
    const apiMessages = updatedMessages.map((msg) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text,
    }));

    const response = await fetch(`${import.meta.env.VITE_API_URL}/mock-interview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: apiMessages }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to get response");

    if (data?.can_continue) {
      try {
        const contResp = await fetch(`${import.meta.env.VITE_API_URL}/mock-interview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, continue: true }),
        });
        const contData = await contResp.json();
        if (contResp.ok && contData?.reply) return contData.reply;
      } catch (err) {
        console.error("Continuation request failed:", err);
      }
    }

    return data.reply;
  };

  const advanceInterview = useCallback(async (updatedMessages) => {
    setPhase("thinking");
    try {
      const reply = await getAiReply(updatedMessages);
      const withReply = [...updatedMessages, { sender: "bot", text: reply }];
      setMessages(withReply);
      setPhase("ai_speaking");
      await speak(reply);
      if (phaseRef.current !== "ended") {
        setPhase("listening");
        startListening();
      }
    } catch (error) {
      console.error(error);
      setErrorBanner("Something went wrong reaching the interviewer. Please try again.");
      setPhase("listening");
      startListening();
    }
  }, [speak, startListening]);

  // Forcibly ends the interview after repeated integrity violations, giving
  // the AI one last (proctor-directed) turn to close things out gracefully.
  const triggerMalpracticeEnd = useCallback((reason) => {
    stopListening();
    window.speechSynthesis?.cancel();
    setViolationWarning("");
    setMalpracticeReason(reason);

    setMessages((prev) => {
      const proctorNote = {
        sender: "user",
        text: `[Proctor note — this is not from the candidate: The candidate ${reason} more than once during this interview, which violates interview integrity rules. End the interview now with a brief, professional closing statement that flags this as a potential integrity/malpractice concern. Do not ask any further questions.]`,
      };
      const updated = [...prev, proctorNote];

      setPhase("thinking");
      getAiReply(updated)
        .then(async (reply) => {
          setMessages((current) => [...current, { sender: "bot", text: reply }]);
          setPhase("ai_speaking");
          await speak(reply);
        })
        .catch((err) => console.error("Malpractice closing message failed:", err))
        .finally(() => {
          setPhase("ended");
          exitFullscreen();
          intentionalStopRef.current = true;
          stopCamera();
        });

      return updated;
    });
  }, [stopListening, speak, stopCamera]);

  const handleIntegrityViolation = useCallback((reason) => {
    if (
      phaseRef.current === "setup" ||
      phaseRef.current === "ended" ||
      malpracticeTriggeredRef.current
    ) {
      return;
    }

    violationCountRef.current += 1;

    if (violationCountRef.current >= 2) {
      malpracticeTriggeredRef.current = true;
      triggerMalpracticeEnd(reason);
    } else {
      setViolationWarning(
        `Warning: it looks like you ${reason}. This has been noted. Doing this again will end the interview immediately.`
      );
    }
  }, [triggerMalpracticeEnd]);

  useEffect(() => {
    handleIntegrityViolationRef.current = handleIntegrityViolation;
  }, [handleIntegrityViolation]);

  // Monitor fullscreen exits and tab/window switches for the whole session.
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!isFullscreenActive()) {
        handleIntegrityViolation("exited fullscreen mode");
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        handleIntegrityViolation("switched away from this tab or window");
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("mozfullscreenchange", onFullscreenChange);
    document.addEventListener("MSFullscreenChange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("mozfullscreenchange", onFullscreenChange);
      document.removeEventListener("MSFullscreenChange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [handleIntegrityViolation]);

  const submitAnswer = () => {
    const answer = (useTypedMode ? typedAnswer : (finalTranscript + interimTranscript)).trim();
    if (!answer || phase !== "listening") return;

    // Voice mode only: guard against the mic picking up the AI's own voice
    // through the speakers (common without headphones). If the "answer"
    // closely matches what the interviewer just said, treat it as an echo
    // rather than a real response.
    if (!useTypedMode) {
      const lastAiText = [...messages].reverse().find((m) => m.sender === "bot")?.text || "";
      if (lastAiText && isLikelyEcho(answer, lastAiText)) {
        setInterimTranscript("");
        setFinalTranscript("");
        setViolationWarning("");
        setErrorBanner(
          "That sounded like the interviewer's own voice picked up by your microphone. Using headphones prevents this. Please answer again."
        );
        return;
      }
    }

    stopListening();
    setInterimTranscript("");
    setFinalTranscript("");
    setTypedAnswer("");
    setViolationWarning("");
    setErrorBanner("");

    const updatedMessages = [...messages, { sender: "user", text: answer }];
    setMessages(updatedMessages);
    advanceInterview(updatedMessages);
  };

  const startInterview = async () => {
    if (!roleInput.trim()) return;
    setErrorBanner("");
    setViolationWarning("");
    setMalpracticeReason(null);
    violationCountRef.current = 0;
    malpracticeTriggeredRef.current = false;
    intentionalStopRef.current = false;

    // Must be called synchronously within this click handler (before any
    // await) so browsers recognize it as a direct response to user action.
    enterFullscreen();

    setPhase("thinking");

    // Camera is required for this interview (same as a real video
    // interview) — if it can't be started, don't proceed.
    const cameraOk = await startCamera();
    if (!cameraOk) {
      setPhase("setup");
      exitFullscreen();
      return;
    }

    const opening = {
      sender: "user",
      text: `I want to practice a mock interview for the role of ${roleInput}. Start by greeting me warmly and asking my name, then ask a couple of short introductory questions before moving into role-specific questions.`,
    };
    setMessages([opening]);
    advanceInterview([opening]);
  };

  const endInterview = () => {
    setPhase("ended");
    stopListening();
    window.speechSynthesis?.cancel();
    intentionalStopRef.current = true;
    stopCamera();
    exitFullscreen();
  };

  const restart = () => {
    setPhase("setup");
    setMessages([]);
    setRoleInput("");
    setInterimTranscript("");
    setTypedAnswer("");
    setErrorBanner("");
    setViolationWarning("");
    setMalpracticeReason(null);
    violationCountRef.current = 0;
    malpracticeTriggeredRef.current = false;
    intentionalStopRef.current = false;
  };

  useEffect(() => {
    return () => {
      stopListening();
      window.speechSynthesis?.cancel();
      intentionalStopRef.current = true;
      stopCamera();
      exitFullscreen();
    };
  }, [stopListening, stopCamera]);

  // ---------- setup screen ----------
  if (phase === "setup") {
    return (
      <main className="flex h-screen min-h-0 flex-1 flex-col overflow-hidden bg-[#060b1d] text-white">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
            <Mic size={14} />
            Live AI Interview
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Speak with your <span className="text-cyan-300">AI Interviewer</span>
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-400 sm:text-lg">
            A real-time, spoken mock interview with video. The interviewer
            asks a question out loud, you answer by speaking, and it responds
            with feedback and the next question — just like a real video
            interview.
          </p>

          {!SPEECH_SUPPORTED && (
            <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-200">
              Your browser doesn't support voice recognition (this works best
              in Chrome or Edge). You can still do the interview by typing
              your answers instead.
            </div>
          )}

          {SPEECH_SUPPORTED && !useTypedMode && (
            <div className="mt-6 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-200">
              🎧 Tip: use headphones if you can. Without them, your
              microphone can sometimes pick up the interviewer's own voice
              through your speakers.
            </div>
          )}

          <div className="mt-8 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-200">
                What role are you applying for?
              </label>
              <input
                type="text"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startInterview()}
                placeholder="e.g., Software Engineer, Data Analyst"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200">
                <Video size={16} />
                Camera Required
              </div>

              {SYNTHESIS_SUPPORTED && (
                <button
                  onClick={() => setVoiceEnabled((v) => !v)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    voiceEnabled
                      ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                      : "border-slate-700 bg-slate-900 text-slate-400"
                  }`}
                >
                  {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  AI Voice {voiceEnabled ? "On" : "Off"}
                </button>
              )}

              {SPEECH_SUPPORTED && (
                <button
                  onClick={() => setUseTypedMode((v) => !v)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    useTypedMode
                      ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                      : "border-slate-700 bg-slate-900 text-slate-400"
                  }`}
                >
                  <Keyboard size={16} />
                  {useTypedMode ? "Typing Mode" : "Speaking Mode"}
                </button>
              )}
            </div>

            <button
              onClick={startInterview}
              disabled={!roleInput.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3.5 font-semibold text-white transition hover:from-blue-500 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start Interview
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ---------- live interview screen ----------
  return (
    <main className="flex h-screen min-h-0 flex-1 flex-col overflow-hidden bg-[#060b1d] text-white">
      {errorBanner && (
        <div className="border-b border-amber-400/30 bg-amber-400/10 px-6 py-2 text-center text-sm text-amber-200">
          {errorBanner}
        </div>
      )}

      {violationWarning && phase !== "ended" && (
        <div className="flex items-center justify-between gap-3 border-b border-red-500/40 bg-red-500/10 px-6 py-3 text-sm text-red-200">
          <span>⚠️ {violationWarning}</span>
          {!isFullscreenActive() && (
            <button
              onClick={enterFullscreen}
              className="shrink-0 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-100 transition hover:bg-red-400/20"
            >
              Return to Fullscreen
            </button>
          )}
        </div>
      )}

      {malpracticeReason && phase === "ended" && (
        <div className="border-b border-red-500/40 bg-red-500/10 px-6 py-3 text-center text-sm font-semibold text-red-200">
          🚩 This interview was flagged: the candidate {malpracticeReason} more than once, which is treated as a potential integrity/malpractice concern in the feedback.
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Video / interviewer panel */}
        <section className="flex flex-col items-center justify-center gap-6 border-b border-slate-800 bg-[#080f25] p-6 lg:w-[380px] lg:border-b-0 lg:border-r">
          <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-blue-600/20 to-cyan-500/20 ring-1 ring-cyan-400/20">
            <div
              className={`absolute inset-0 rounded-full ring-4 ring-cyan-400/40 transition-opacity ${
                phase === "ai_speaking" ? "animate-ping opacity-70" : "opacity-0"
              }`}
            />
            <Bot size={56} className="text-cyan-300" />
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-slate-200">
              {phase === "ai_speaking" && "Interviewer is speaking..."}
              {phase === "thinking" && "Interviewer is thinking..."}
              {phase === "listening" && "Your turn — listening..."}
              {phase === "ended" && "Interview ended"}
            </p>
            {phase === "listening" && !useTypedMode && (
              <p className="mt-1 text-xs text-slate-500">
                Speak your answer, then check and edit the transcript before pressing Submit
              </p>
            )}
          </div>

          {videoEnabled ? (
            <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-black shadow-lg">
              <video
                ref={handleVideoRef}
                autoPlay
                muted
                playsInline
                onLoadedMetadata={(e) => {
                  e.currentTarget.play().catch((err) =>
                    console.warn("play onLoadedMetadata:", err)
                  );
                }}
                className="h-36 w-48 -scale-x-100 object-cover"
              />
              <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live Camera
              </div>
            </div>
          ) : (
            phase !== "ended" && (
              <div className="flex h-36 w-48 flex-col items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/5 text-red-300">
                <VideoOff size={20} />
                <span className="text-xs">Camera not active</span>
              </div>
            )
          )}

          <div className="flex gap-2">
            {SPEECH_SUPPORTED && (
              <button
                onClick={() => setUseTypedMode((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-400/40"
              >
                <Keyboard size={14} />
                {useTypedMode ? "Use Voice" : "Type Instead"}
              </button>
            )}
            {SYNTHESIS_SUPPORTED && (
              <button
                onClick={() => setVoiceEnabled((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-400/40"
              >
                {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                Voice {voiceEnabled ? "On" : "Off"}
              </button>
            )}
            <button
              onClick={endInterview}
              disabled={phase === "ended"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              <PhoneOff size={14} />
              End Interview
            </button>
          </div>

          {phase === "ended" && (
            <button
              onClick={restart}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-cyan-400"
            >
              Start New Interview
            </button>
          )}
        </section>

        {/* Transcript */}
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.slice(1).map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.sender === "bot" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/20">
                      <Bot size={18} />
                    </div>
                  )}
                  <div
                    className={`max-w-xl rounded-2xl px-5 py-4 shadow-sm ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
                        : "border border-slate-800 bg-slate-900/80 text-slate-200"
                    }`}
                  >
                    {msg.sender === "bot" ? (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-7 prose-headings:text-white prose-strong:text-cyan-200">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    )}
                  </div>
                  {msg.sender === "user" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-200 ring-1 ring-blue-400/20">
                      <UserRound size={18} />
                    </div>
                  )}
                </div>
              ))}

              {phase === "listening" && !useTypedMode && (finalTranscript || interimTranscript) && (
                <div className="flex justify-end gap-3">
                  <div className="max-w-xl flex-1 rounded-2xl border border-dashed border-cyan-400/40 bg-cyan-400/5 px-5 py-4 text-slate-300">
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-cyan-400/70">
                      Edit if anything was misheard
                    </p>
                    <textarea
                      value={finalTranscript}
                      onChange={(e) => setFinalTranscript(e.target.value)}
                      rows={Math.max(2, Math.ceil((finalTranscript.length + interimTranscript.length) / 60))}
                      className="w-full resize-none whitespace-pre-wrap break-words bg-transparent text-slate-100 outline-none"
                    />
                    {interimTranscript && (
                      <p className="whitespace-pre-wrap break-words italic text-slate-500">
                        {interimTranscript}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {phase === "thinking" && (
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/20">
                    <Bot size={18} />
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 text-sm text-slate-400">
                    Interviewer is thinking...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Answer input */}
          {phase === "listening" && (
            <footer className="shrink-0 border-t border-slate-800 bg-[#080f25] px-6 py-4">
              <div className="mx-auto flex max-w-3xl gap-3">
                {useTypedMode ? (
                  <>
                    <input
                      type="text"
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
                      placeholder="Type your answer..."
                      autoFocus
                      className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
                    />
                    <button
                      onClick={submitAnswer}
                      disabled={!typedAnswer.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3.5 font-semibold text-white transition hover:from-blue-500 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send size={18} />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setFinalTranscript("");
                        setInterimTranscript("");
                      }}
                      disabled={!finalTranscript && !interimTranscript}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3.5 text-sm font-medium text-slate-300 transition hover:border-red-400/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Clear
                    </button>
                    <button
                      onClick={submitAnswer}
                      disabled={!finalTranscript && !interimTranscript}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3.5 font-semibold text-white transition hover:from-blue-500 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Mic size={18} />
                      Submit Answer
                    </button>
                  </>
                )}
              </div>
            </footer>
          )}
        </section>
      </div>
    </main>
  );
}
