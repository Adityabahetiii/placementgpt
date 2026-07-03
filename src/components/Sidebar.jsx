import { NavLink, useNavigate } from "react-router-dom";
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
} from "lucide-react";

export default function Sidebar({ isOpen, setIsOpen }) {
  const navigate = useNavigate();

  const handleNewChat = () => {
    localStorage.removeItem("placementgpt_chat");
    navigate(`/?newChat=${Date.now()}`);
    // Close sidebar on mobile after clicking
    if (setIsOpen) setIsOpen(false);
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
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-[#060b1d] text-white transition-transform duration-300 md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-slate-800 px-5 py-6">
          <button
            onClick={() => {
              navigate("/");
              if (setIsOpen) setIsOpen(false);
            }}
            className="flex items-center gap-3 text-left"
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

        <div className="px-4 pt-5">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:scale-[1.02] hover:from-blue-500 hover:to-cyan-400 active:scale-[0.98]"
          >
            <MessageSquarePlus size={19} />
            New Chat
          </button>
        </div>

        <div className="flex-1 px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Workspace
          </p>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  onClick={() => setIsOpen && setIsOpen(false)}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                      isActive
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

          <div className="mt-8">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Recent Chats
            </p>

            <div className="space-y-1">
              {["Resume Review", "DSA Preparation", "Cybersecurity Prep"].map(
                (chat) => (
                  <button
                    key={chat}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-400 transition hover:bg-slate-800/70 hover:text-white"
                  >
                    <MessageCircle size={16} className="text-slate-500" />
                    <span className="truncate">{chat}</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 rounded-xl hover:bg-slate-900/70 p-3 cursor-pointer transition">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              <span className="text-sm font-semibold tracking-wider">AB</span>
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
    </>
  );
}