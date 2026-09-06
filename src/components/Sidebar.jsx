import { useState, useEffect } from "react";
import { NavLink, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  MessageSquarePlus,
  MessageCircle,
  FileText,
  Sparkles,
  Map,
  LayoutDashboard,
  ShieldCheck,
  ChevronRight,
  UserRound,
  Mic2,
  Code2,
  Trash2,
} from "lucide-react";
import { getChatSessions, deleteChatSession } from "../utils/chatStorage";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentChatId = searchParams.get("chatId");

  const [sessions, setSessions] = useState(() => getChatSessions());

  useEffect(() => {
    const refreshSessions = () => {
      setSessions(getChatSessions());
    };

    window.addEventListener("chat_history_updated", refreshSessions);
    window.addEventListener("storage", refreshSessions);

    return () => {
      window.removeEventListener("chat_history_updated", refreshSessions);
      window.removeEventListener("storage", refreshSessions);
    };
  }, []);

  const handleNewChat = () => {
    navigate(`/?newChat=${Date.now()}`);
  };

  const handleDeleteChat = (e, id) => {
    e.stopPropagation();
    deleteChatSession(id);
    if (currentChatId === id) {
      navigate("/");
    }
  };

  const navItems = [
    {
      label: "Chat",
      path: "/",
      icon: LayoutDashboard,
    },
    {
      label: "Resume Analyzer",
      path: "/resume-analyzer",
      icon: FileText,
    },
    {
      label: "Resume Builder",
      path: "/resume-builder",
      icon: Sparkles,
    },
    {
      label: "Roadmap",
      path: "/roadmap",
      icon: Map,
    },
    {
      label: "Mock Interview",
      path: "/mock-interview",
      icon: Mic2,
    },
    {
      label: "Technical Interview",
      path: "/technical-interview",
      icon: Code2,
    },
  ];

  const isMainChatActive = location.pathname === "/" && !currentChatId;

  return (
    <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-[#060b1d] text-white">
      {/* Header */}
      <div className="border-b border-slate-800 px-5 py-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-3 text-left transition hover:opacity-90"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20">
            <Sparkles size={20} className="text-white" />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Placement<span className="text-cyan-400">GPT</span>
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Your placement co-pilot
            </p>
          </div>
        </button>
      </div>

      {/* New Chat Action */}
      <div className="px-4 pt-5">
        <button
          onClick={handleNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:scale-[1.02] hover:from-blue-500 hover:to-cyan-400 active:scale-[0.98]"
        >
          <MessageSquarePlus size={19} />
          New Chat
        </button>
      </div>

      {/* Scrollable Navigation & Recent Chat History Container */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 custom-scrollbar">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Workspace
        </p>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === "/"
                ? isMainChatActive
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={() =>
                  `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${isActive
                    ? "bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/20"
                    : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
                  }`
                }
              >
                <Icon size={19} />
                <span className="flex-1">{item.label}</span>
                <ChevronRight
                  size={16}
                  className="opacity-0 transition group-hover:opacity-100"
                />
              </NavLink>
            );
          })}
        </nav>

        {/* Dynamic Chat History Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between px-3 mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Recent Chats
            </p>
            {sessions.length > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {sessions.length}
              </span>
            )}
          </div>

          <div className="space-y-1">
            {sessions.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-500 italic">
                No past chats yet. Start a new prompt!
              </p>
            ) : (
              sessions.map((session) => {
                const isActive = currentChatId === session.id;

                return (
                  <div
                    key={session.id}
                    onClick={() => navigate(`/?chatId=${session.id}`)}
                    className={`group relative flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition ${isActive
                        ? "bg-slate-800/90 font-medium text-cyan-300 ring-1 ring-cyan-400/30"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      }`}
                  >
                    <MessageCircle
                      size={16}
                      className={`shrink-0 ${isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-400"
                        }`}
                    />
                    <span className="flex-1 truncate pr-5">{session.title}</span>

                    <button
                      type="button"
                      title="Delete Chat"
                      onClick={(e) => handleDeleteChat(e, session.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 opacity-0 transition hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Profile Footer */}
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-slate-900/70 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300">
            <UserRound size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-200">
              Aditya Baheti
            </p>
            <p className="truncate text-xs text-slate-500">
              Placement preparation
            </p>
          </div>

          <ShieldCheck size={18} className="text-cyan-400" />
        </div>
      </div>
    </aside>
  );
}