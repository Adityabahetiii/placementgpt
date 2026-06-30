import ReactMarkdown from "react-markdown";
import { useRef, useEffect, useState } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Code2,
  Database,
  Mic2,
  ShieldCheck,
  Brain,
  Map,
  UserRound,
} from "lucide-react";

const suggestions = [
  {
    label: "DSA Interview Questions",
    prompt: "Give me DSA interview questions",
    icon: Code2,
  },
  {
    label: "SQL Mock Interview",
    prompt: "Start a SQL mock interview",
    icon: Database,
  },
  {
    label: "HR Interview Practice",
    prompt: "Conduct an HR mock interview",
    icon: Mic2,
  },
  {
    label: "Cybersecurity Preparation",
    prompt: "Help me prepare for a cybersecurity internship",
    icon: ShieldCheck,
  },
  {
    label: "Aptitude Questions",
    prompt: "Give me aptitude practice questions",
    icon: Brain,
  },
  {
    label: "Placement Roadmap",
    prompt: "Show me a 3 month placement roadmap",
    icon: Map,
  },
];

export default function ChatArea() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("placementgpt_chat");
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("placementgpt_chat", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  const getBotReply = async (updatedMessages) => {
    const apiMessages = updatedMessages.map((msg) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text,
    }));

    const response = await fetch(`${import.meta.env.VITE_API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: apiMessages }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to get response");
    }

    return data.reply;
  };

  const sendMessage = async (text) => {
    const cleanText = text.trim();

    if (!cleanText || loading) return;

    const userMessage = {
      sender: "user",
      text: cleanText,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setMessage("");
    setLoading(true);

    try {
      const reply = await getBotReply(updatedMessages);

      setMessages((previous) => [
        ...previous,
        {
          sender: "bot",
          text: reply,
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          sender: "bot",
          text: "❌ Something went wrong. Please check that the backend server is running.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    sendMessage(message);
  };

  return (
    <main className="flex h-screen min-h-0 flex-1 flex-col overflow-hidden bg-[#060b1d] text-white">
      {/* Chat content: only this section scrolls */}
      <section className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-6 py-8">
          {messages.length === 0 ? (
            <div className="pt-5">
              <div className="mb-10 max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
                  <Sparkles size={14} />
                  Placement companion
                </div>

                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  Welcome back, <span className="text-cyan-300">Aditya</span> 👋
                </h1>

                <p className="mt-4 text-base leading-7 text-slate-400 sm:text-lg">
                  Practice interviews, improve your resume, revise technical
                  topics, and prepare confidently for placements.
                </p>
              </div>

              <div className="max-w-3xl">
                <h2 className="text-lg font-semibold">
                  Start with a quick prompt
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Choose a topic or ask anything below.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {suggestions.map((item) => {
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.label}
                        onClick={() => sendMessage(item.prompt)}
                        disabled={loading}
                        className="group flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                          <Icon size={19} />
                        </div>

                        <div>
                          <p className="font-semibold text-slate-100">
                            {item.label}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Start practicing now
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    msg.sender === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  {msg.sender === "bot" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/20">
                      <Bot size={18} />
                    </div>
                  )}

                  <div
                    className={`max-w-3xl rounded-2xl px-5 py-4 shadow-sm ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
                        : "border border-slate-800 bg-slate-900/80 text-slate-200"
                    }`}
                  >
                    {msg.sender === "bot" ? (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-7 prose-headings:text-white prose-strong:text-cyan-200">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">
                        {msg.text}
                      </p>
                    )}
                  </div>

                  {msg.sender === "user" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-200 ring-1 ring-blue-400/20">
                      <UserRound size={18} />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/20">
                    <Bot size={18} />
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 text-sm text-slate-400">
                    PlacementGPT is thinking...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </section>

      {/* Fixed input area */}
      <footer className="shrink-0 border-t border-slate-800 bg-[#080f25] px-6 py-4">
        <div className="mx-auto flex max-w-5xl gap-3">
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about placements, DSA, interviews, SQL, cybersecurity..."
            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
          />

          <button
            onClick={handleSend}
            disabled={loading || !message.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3.5 font-semibold text-white transition hover:from-blue-500 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={18} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </footer>
    </main>
  );
}