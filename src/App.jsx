import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Roadmap from "./pages/Roadmap";
import ResumeBuilder from "./pages/ResumeBuilder";
import ResumeAnalyzer from "./pages/ResumeAnalyzer";
function DashboardRoute() {
  const location = useLocation();

  return <Dashboard key={location.search} />;
}
function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-slate-950 text-white overflow-hidden">

        <Sidebar />

        <main className="flex-1 h-screen overflow-y-auto">

          <Routes>

            <Route path="/" element={<Dashboard />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/resume-builder" element={<ResumeBuilder />} />
            <Route path="/resume-analyzer" element={<ResumeAnalyzer />} />
          </Routes>

        </main>

      </div>
    </BrowserRouter>
  );
}

export default App;