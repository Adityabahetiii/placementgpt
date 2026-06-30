import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

const API_URL = "http://localhost:5000";

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
    window.removeEventListener(
      "placementgpt_new_chat",
      startFreshChat
    );
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
        },
      ]);
    } catch (error) {
      console.error("Roadmap generation error:", error);

      addBotMessage(
        `❌ ${error.message || "Could not generate the roadmap. Please try again."}`
      );
    }
  };

  const generateImage = async (goal, duration, level, reply) => {
  try {
    const response = await fetch(`${API_URL}/generate-roadmap-image`, {
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
      throw new Error(data.error || "Image generation failed.");
    }

    setMessages((previous) => [
      ...previous,
      {
        id: Date.now() + Math.random(),
        sender: "bot",
        type: "image",
        text: reply || "",
        imageUrl: data.image,
        goal,
        duration,
        level,
      },
    ]);
  } catch (error) {
    console.error(error);

    addBotMessage("❌ Failed to generate image.");
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
          data.reply ||
            "Could you share one more detail about your goal?"
        );
        return;
      }

      if (!data.goal || !data.duration || !data.level) {
        addBotMessage(
          "I need one more detail before creating your roadmap. What is your current level and how much time do you have?"
        );
        return;
      }

      if (data.type === "image") {
        generateImage(
          data.goal,
          data.duration,
          data.level,
          data.reply
        );
        return;
      }

      if (data.type === "roadmap") {
        await generateRoadmap(
          data.goal,
          data.duration,
          data.level,
          data.reply
        );
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

  const renderList = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) {
      return <li>Not specified.</li>;
    }

    return items.map((item, index) => (
      <li key={index}>• {String(item)}</li>
    ));
  };

  const suggestions = [
    "Give me a 6 month roadmap for Prompt Engineer as a beginner",
    "I want a 3 month roadmap for Data Analyst",
    "Generate a visual roadmap for Cybersecurity for 6 months as a beginner",
    "Create a 2 month roadmap to learn Blender as a beginner",
  ];

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-950 text-white">
    <div className="flex-1 overflow-y-auto p-8">
        {messages.length === 0 && (
          <div className="mx-auto mt-10 max-w-3xl text-center">
            <h2 className="mb-4 text-5xl font-bold tracking-tight">
              🚀 Build Your Learning Roadmap
            </h2>

            <p className="mx-auto mb-10 max-w-2xl text-lg leading-8 text-slate-400">
              Create detailed learning roadmaps for any career, skill, certification, programming language, exam, or technology. You can also generate beautiful visual roadmap images.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
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

        <div className="mx-auto max-w-4xl space-y-6">
          {messages.map((item) => (
            <div key={item.id}>
              {item.sender === "user" && (
                <div className="ml-auto max-w-2xl rounded-2xl rounded-tr-sm bg-blue-600 p-4">
                  {item.text}
                </div>
              )}

              {item.sender === "bot" && item.type === "text" && (
                <div className="max-w-3xl rounded-2xl rounded-tl-sm bg-slate-800 p-4">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{item.text}</ReactMarkdown>
                  </div>
                </div>
              )}

              {item.sender === "bot" && item.type === "image" && (
                <div className="max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  {item.text && (
                    <p className="mb-4 text-slate-300">{item.text}</p>
                  )}

                  <p className="mb-4 font-semibold text-cyan-300">
                    {item.duration} {item.goal} Visual Roadmap
                  </p>

                  <img
                    src={item.imageUrl}
                    alt={`${item.goal} visual roadmap`}
                    className="w-full rounded-xl border border-slate-700"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}

              {item.sender === "bot" && item.type === "roadmap" && (
                <div className="max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  {item.text && (
                    <p className="mb-4 text-slate-300">{item.text}</p>
                  )}

                  <h2 className="text-2xl font-bold text-cyan-300">
                    {item.roadmap.title}
                  </h2>

                  <p className="mt-3 leading-relaxed text-slate-300">
                    {item.roadmap.overview}
                  </p>

                  <div className="mt-7 space-y-5">
                    {item.roadmap.phases.map((phase, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-700 bg-slate-800 p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-lg font-semibold">
                            Phase {index + 1}: {phase.title}
                          </h3>

                          {phase.duration && (
                            <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-sm text-cyan-300">
                              {phase.duration}
                            </span>
                          )}
                        </div>

                        <div className="mt-5 space-y-5">
                          <div>
                            <h4 className="mb-2 text-sm font-semibold text-cyan-300">
                              Topics
                            </h4>

                            <ul className="space-y-1 text-slate-300">
                              {renderList(phase.topics)}
                            </ul>
                          </div>

                          <div>
                            <h4 className="mb-2 text-sm font-semibold text-cyan-300">
                              Tasks
                            </h4>

                            <ul className="space-y-1 text-slate-300">
                              {renderList(phase.tasks)}
                            </ul>
                          </div>

                          {phase.project && (
                            <div className="rounded-xl border border-cyan-500/30 bg-slate-900 p-4">
                              <h4 className="mb-1 text-sm font-semibold text-cyan-300">
                                Practice / Project
                              </h4>

                              <p className="text-slate-300">
                                {phase.project}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-7 rounded-xl bg-slate-800 p-5">
                    <h3 className="mb-3 text-lg font-semibold text-cyan-300">
                      Preparation Tips
                    </h3>

                    <ul className="space-y-2 text-slate-300">
                      {renderList(item.roadmap.interviewPreparation)}
                    </ul>
                  </div>

                  <div className="mt-5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-5">
                    <h3 className="mb-2 font-semibold text-cyan-300">
                      Final Advice
                    </h3>

                    <p className="text-slate-200">
                      {item.roadmap.finalAdvice}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="max-w-fit rounded-2xl bg-slate-800 p-4 animate-pulse">
              🤖 PlacementGPT is thinking...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-slate-800 bg-slate-950 p-4">
        <div className="mx-auto flex max-w-4xl gap-3">
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
            className="flex-1 rounded-xl bg-slate-800 p-4 text-white outline-none placeholder:text-slate-400"
          />

          <button
            onClick={() => sendMessage()}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-6 hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}