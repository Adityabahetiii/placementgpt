import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import ResumeBuilder from "./pages/ResumeBuilder";
import ResumeAnalyzer from "./pages/ResumeAnalyzer";
import Roadmap from "./pages/Roadmap";
import MockInterview from "./pages/MockInterview";
import TechnicalInterview from "./pages/TechnicalInterview";

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
        <Sidebar />

        <main className="flex-1 h-screen overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/resume-analyzer" element={<ResumeAnalyzer />} />
            <Route path="/resume-builder" element={<ResumeBuilder />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/mock-interview" element={<MockInterview />} />
            <Route path="/technical-interview" element={<TechnicalInterview />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;