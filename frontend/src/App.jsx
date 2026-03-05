import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import AuthPage from "./pages/AuthPage";
import Chat from "./pages/Chat";
import Exercise from "./pages/Exercise";
import Analytics from "./pages/Analytics";

const tabs = [
  {
    id: "chat",
    label: "Course Chat",
    icon: "💬",
    description: "Ask questions about course materials",
  },
  {
    id: "exercise",
    label: "Exercises",
    icon: "⚡",
    description: "Generate practice problems",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: "📊",
    description: "Predict dropout risk",
  },
];

function MainApp() {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("chat");
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className={`h-screen flex flex-col relative overflow-hidden ${darkMode ? "" : "bg-gray-50"}`}>
      {/* Background Decorative Shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Wavy lines */}
          <path
            d="M0,100 Q250,50 500,100 T1000,100"
            stroke={darkMode ? "rgba(99, 102, 241, 0.28)" : "rgba(0, 0, 0, 0.37)"}
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M0,300 Q300,250 600,300 T1200,300"
            stroke={darkMode ? "rgba(139, 92, 246, 0.28)" : "rgba(0, 0, 0, 0.37)"}
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M-200,500 Q100,450 400,500 T800,500"
            stroke={darkMode ? "rgba(99, 102, 241, 0.28)" : "rgba(0, 0, 0, 0.37)"}
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M200,700 Q500,650 800,700 T1400,700"
            stroke={darkMode ? "rgba(168, 85, 247, 0.28)" : "rgba(0, 0, 0, 0.37)"}
            strokeWidth="2"
            fill="none"
          />
          
          {/* Circles */}
          <circle
            cx="90%"
            cy="15%"
            r="120"
            stroke={darkMode ? "rgba(99, 102, 241, 0.28)" : "rgba(0, 0, 0, 0.37)"}
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="10%"
            cy="80%"
            r="80"
            stroke={darkMode ? "rgba(139, 92, 246, 0.28)" : "rgba(0, 0, 0, 0.37)"}
            strokeWidth="2"
            fill="none"
          />
          
          {/* Diagonal lines */}
          <line
            x1="0"
            y1="0"
            x2="200"
            y2="200"
            stroke={darkMode ? "rgba(99, 102, 241, 0.28)" : "rgba(0, 0, 0, 0.37)"}
            strokeWidth="1"
          />
          <line
            x1="100%"
            y1="50%"
            x2="80%"
            y2="70%"
            stroke={darkMode ? "rgba(139, 92, 246, 0.28)" : "rgba(0, 0, 0, 0.37)"}
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Top Navigation */}
      <header className={`${darkMode ? "bg-gray-900/80 backdrop-blur-lg border-indigo-500/20" : "bg-white border-gray-200"} border-b sticky top-0 z-10 ${darkMode ? "shadow-lg shadow-indigo-500/10" : ""}`}>
        <div className="w-full px-4">
          {/* Brand */}
          <div className={`flex items-center justify-between py-3 border-b ${darkMode ? "border-indigo-500/20 bg-gray-900/40" : "border-gray-100 bg-gray-50/50"}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl">🎓</span>
              </div>
              <div>
                <h1 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>EduMentor AI</h1>
                <p className="text-xs text-gray-400">GenAI & ML Bootcamp Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Welcome, {user?.username}
              </span>
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-all ${darkMode ? "bg-gradient-to-br from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 text-yellow-400 border border-indigo-400/30" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
                  </svg>
                )}
              </button>
              <button
                onClick={logout}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  darkMode 
                    ? "bg-red-600 hover:bg-red-700 text-white" 
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
                title="Logout"
              >
                Logout
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">RAG + ML + Agents</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <nav className={`flex justify-center gap-10 ${darkMode ? "bg-gray-800/60" : "bg-white"}`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-8 py-3 text-lg font-semibold border-b-[3px] transition-colors ${
                  activeTab === tab.id
                    ? darkMode ? "border-indigo-400 text-indigo-400" : "border-indigo-600 text-indigo-600"
                    : darkMode
                    ? "border-transparent text-gray-400 hover:text-indigo-300 hover:border-indigo-500/30"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full overflow-hidden flex flex-col px-4 py-3 relative z-10">
        <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-gray-50 rounded-2xl border dark:border-indigo-400/30 max-w-[89%] mx-auto w-full" style={{ boxShadow: darkMode ? '0 25px 50px -12px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(99, 102, 241, 0.1)' : '0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 10px 25px -5px rgba(0, 0, 0, 0.15)' }}>
          {activeTab === "chat" && <Chat />}
          {activeTab === "exercise" && <Exercise />}
          {activeTab === "analytics" && <Analytics />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
