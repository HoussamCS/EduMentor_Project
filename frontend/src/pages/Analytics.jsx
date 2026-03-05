import { useState, useRef } from "react";
import { api } from "../api";

const riskColors = {
  "High Risk": {
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-700 border-red-200",
    bar: "bg-red-500",
    icon: "🔴",
  },
  "Medium Risk": {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
    bar: "bg-yellow-500",
    icon: "🟡",
  },
  "Low Risk": {
    bg: "bg-green-50",
    border: "border-green-200",
    badge: "bg-green-100 text-green-700 border-green-200",
    bar: "bg-green-500",
    icon: "🟢",
  },
};

function RiskBar({ score }) {
  const level = score >= 0.65 ? "High Risk" : score >= 0.35 ? "Medium Risk" : "Low Risk";
  const { bar } = riskColors[level];
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
      <div
        className={`${bar} h-1.5 rounded-full transition-all`}
        style={{ width: `${Math.round(score * 100)}%` }}
      />
    </div>
  );
}

function StudentCard({ result }) {
  const [showQuiz, setShowQuiz] = useState(false);
  const level = result.risk_level;
  const colors = riskColors[level] || riskColors["Low Risk"];

  return (
    <div className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-semibold text-gray-900 text-sm">Student #{result.student_id}</span>
          <span className="ml-2 text-xs text-gray-400">{result.model_used}</span>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${colors.badge}`}>
          {colors.icon} {result.risk_level}
        </span>
      </div>

      {/* Score Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Risk Score</span>
          <span className="font-semibold text-gray-800">{(result.risk_score * 100).toFixed(0)}%</span>
        </div>
        <RiskBar score={result.risk_score} />
      </div>

      {/* High Risk Details */}
      {level === "High Risk" && (
        <>
          {/* Encouragement */}
          {result.encouragement && (
            <div className="bg-white/70 rounded-lg px-3 py-2 mb-3 text-xs text-gray-600 italic border border-gray-200">
              💬 "{result.encouragement}"
            </div>
          )}

          {/* Study Tips */}
          {result.study_tips && result.study_tips.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-gray-700 mb-1.5">📚 Study Tips</h4>
              <ul className="space-y-1">
                {result.study_tips.map((tip, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className="text-gray-400 mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-gray-700 mb-1.5">🎯 Recommended Chapters</h4>
              <div className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="bg-white/70 rounded-lg p-2.5 border border-gray-200">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-gray-800">{rec.title}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          rec.priority === "High"
                            ? "bg-red-100 text-red-600"
                            : rec.priority === "Medium"
                            ? "bg-yellow-100 text-yellow-600"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">{rec.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quiz */}
          {result.generated_quiz && (
            <div>
              <button
                onClick={() => setShowQuiz(!showQuiz)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                📝 {showQuiz ? "Hide" : "Show"} Remedial Quiz ({result.generated_quiz.questions?.length || 0} questions)
              </button>

              {showQuiz && (
                <div className="mt-3 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-700">
                    {result.generated_quiz.quiz_title}
                  </h4>
                  {result.generated_quiz.questions?.map((q, qi) => (
                    <div key={qi} className="bg-white/80 rounded-lg p-3 border border-gray-200">
                      <p className="text-xs font-medium text-gray-800 mb-2">
                        Q{qi + 1}: {q.question}
                      </p>
                      <div className="space-y-1 mb-2">
                        {q.options?.map((opt, oi) => (
                          <div
                            key={oi}
                            className={`text-[11px] px-2 py-1 rounded ${
                              opt.startsWith(q.correct)
                                ? "bg-green-100 text-green-700 font-medium"
                                : "text-gray-600"
                            }`}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-500 bg-blue-50 px-2 py-1 rounded">
                        💡 {q.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {level === "Low Risk" && (
        <p className="text-xs text-green-700 font-medium">
          ✅ Great performance! Keep up the excellent work.
        </p>
      )}

      {level === "Medium Risk" && (
        <p className="text-xs text-yellow-700 font-medium">
          ⚡ Moderate engagement — consider increasing study sessions and forum participation.
        </p>
      )}
    </div>
  );
}

function SummaryStats({ data }) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      {[
        { label: "High Risk", count: data.high_risk_count, color: "text-red-600", bg: "bg-red-50 border-red-200" },
        { label: "Medium Risk", count: data.medium_risk_count, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
        { label: "Low Risk", count: data.low_risk_count, color: "text-green-600", bg: "bg-green-50 border-green-200" },
      ].map((stat) => (
        <div key={stat.label} className={`rounded-xl border p-3 text-center ${stat.bg}`}>
          <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
          <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f && f.name.endsWith(".csv")) {
      setFile(f);
      setError("");
    } else if (f) {
      setError("Only CSV files are supported");
      setFile(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".csv")) {
      setFile(f);
      setError("");
    } else {
      setError("Only CSV files are supported");
    }
  };

  const predict = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const data = await api.predictRiskCSV(file);
      setResults(data);
    } catch (err) {
      setError(err.message || "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResults(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-100">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-600 mt-1">
            Upload student activity data to predict dropout risk and get AI-powered intervention recommendations
          </p>
        </div>

        {/* Upload Card */}
        {!results && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Upload Student CSV</h3>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                file
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div>
                  <div className="text-3xl mb-2">📊</div>
                  <p className="text-sm font-medium text-indigo-700">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <div className="text-3xl mb-2">📂</div>
                  <p className="text-sm font-medium text-gray-600">
                    Drop your CSV here or <span className="text-indigo-600">browse</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Required columns: student_id, age, avg_score, days_active, forum_posts, etc.
                  </p>
                </div>
              )}
            </div>

            {/* CSV Format Note */}
            <details className="mt-3">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                ℹ️ Expected CSV format
              </summary>
              <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs text-gray-600 font-mono overflow-x-auto">
                student_id, age, gender, education_level, num_prev_attempts,<br />
                studied_credits, disability, region, avg_score, days_active,<br />
                forum_posts, resource_clicks, assignment_submissions, video_views, quiz_attempts
              </div>
            </details>

            <button
              onClick={predict}
              disabled={!file || loading}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing students...
                </>
              ) : (
                <>
                  <span>🔍</span>
                  Run Risk Analysis
                </>
              )}
            </button>

            {/* Loading Info */}
            {loading && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg">⏳</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-1">AI Analysis in Progress</p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Analyzing risk scores and generating personalized AI recommendations. 
                      Full AI analysis (with custom quizzes) is performed for the first 5 high-risk students, 
                      with faster fallback recommendations for others. This typically takes 30-60 seconds.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4 flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Results */}
        {results && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                Analysis Results — {results.total} students
              </h2>
              <button
                onClick={reset}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ← Upload New CSV
              </button>
            </div>

            <SummaryStats data={results} />

            {/* View Details Button */}
            <button
              onClick={() => setShowDetailsModal(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>📋</span>
              View Detailed Student Records
            </button>

            {/* Details Modal */}
            {showDetailsModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDetailsModal(false)}>
                <div 
                  className="bg-white dark:bg-gray-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Detailed Student Records</h2>
                      <p className="text-xs text-gray-500 mt-0.5">{results.total} students analyzed</p>
                    </div>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Scrollable Content */}
                  <div className="overflow-y-auto p-6 space-y-3">
                    {results.results?.map((result, i) => (
                      <StudentCard key={i} result={result} />
                    ))}
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 dark:bg-gray-100 rounded-b-2xl">
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
