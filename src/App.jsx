import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, MessageSquarePlus, Sparkles } from "lucide-react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Roadmap from "./pages/Roadmap";
import ResumeBuilder from "./pages/ResumeBuilder";
import ResumeAnalyzer from "./pages/ResumeAnalyzer";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNewChat = () => {
    localStorage.removeItem("placementgpt_chat");
    window.dispatchEvent(new Event("placementgpt_new_chat"));
    window.location.href = `/?newChat=${Date.now()}`;
  };

  return (
    <BrowserRouter>
      <div className="flex h-[100dvh] bg-slate-950 text-white overflow-hidden relative">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

        <div className="flex flex-1 flex-col h-full overflow-hidden">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#060b1d]">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-300 hover:text-white transition"
            >
              <Menu size={24} />
            </button>
            <div className="font-bold tracking-tight text-lg flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-cyan-400 to-blue-600 shadow-sm">
                <Sparkles size={12} className="text-white" />
              </div>
              Placement<span className="text-cyan-400">GPT</span>
            </div>
            <button
              onClick={handleNewChat}
              className="p-2 -mr-2 text-slate-300 hover:text-white transition"
            >
              <MessageSquarePlus size={24} />
            </button>
          </div>

          <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/resume-builder" element={<ResumeBuilder />} />
              <Route path="/resume-analyzer" element={<ResumeAnalyzer />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;