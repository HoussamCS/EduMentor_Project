import { useState, useEffect } from "react";
import { api } from "../api";

const TOPICS = [
  "Python Basics",
  "Pandas & Data Manipulation",
  "NumPy Arrays",
  "Data Visualization",
  "Scikit-learn Basics",
  "Logistic Regression",
  "Random Forest",
  "Neural Networks",
  "NLP & Text Processing",
  "Large Language Models",
  "RAG Systems",
  "Model Evaluation",
  "Feature Engineering",
  "Cross-Validation",
  "Hyperparameter Tuning",
];

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

const difficultyColors = {
  Beginner: "bg-green-100 text-green-700 border-green-200",
  Intermediate: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Advanced: "bg-red-100 text-red-700 border-red-200",
};

function ExerciseDisplay({ raw }) {
  const [showSolution, setShowSolution] = useState(false);
  const [copied, setCopied] = useState(false);

  // Parse the raw markdown into sections
  const sections = {};
  const lines = raw.split("\n");
  let currentSection = null;
  let buffer = [];

  for (const line of lines) {
    const match = line.match(/^\*\*([^*]+):\*\*/);
    if (match) {
      if (currentSection) sections[currentSection] = buffer.join("\n").trim();
      currentSection = match[1];
      buffer = [];
    } else if (currentSection) {
      buffer.push(line);
    }
  }
  if (currentSection) sections[currentSection] = buffer.join("\n").trim();

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Problem */}
      {sections["Problem"] && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 flex items-center gap-2">
            <span className="text-indigo-600">📋</span>
            <h3 className="font-semibold text-indigo-900 text-sm">Problem Statement</h3>
          </div>
          <div className="p-4 text-sm text-gray-700 leading-relaxed">{sections["Problem"]}</div>
        </div>
      )}

      {/* Requirements */}
      {sections["Requirements"] && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center gap-2">
            <span>✅</span>
            <h3 className="font-semibold text-blue-900 text-sm">Requirements</h3>
          </div>
          <div className="p-4 text-sm text-gray-700">
            <pre className="whitespace-pre-wrap leading-relaxed font-sans">{sections["Requirements"]}</pre>
          </div>
        </div>
      )}

      {/* Hints */}
      {sections["Hints"] && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center gap-2">
            <span>💡</span>
            <h3 className="font-semibold text-amber-900 text-sm">Hints</h3>
          </div>
          <div className="p-4 text-sm text-gray-700">
            <pre className="whitespace-pre-wrap leading-relaxed font-sans">{sections["Hints"]}</pre>
          </div>
        </div>
      )}

      {/* Expected Output */}
      {sections["Expected Output"] && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-teal-50 border-b border-teal-100 px-4 py-2 flex items-center gap-2">
            <span>🎯</span>
            <h3 className="font-semibold text-teal-900 text-sm">Expected Output</h3>
          </div>
          <div className="p-4 text-sm text-gray-700">{sections["Expected Output"]}</div>
        </div>
      )}

      {/* Solution Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowSolution(!showSolution)}
          className="w-full bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span>🔑</span>
            <span>Solution</span>
          </div>
          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
            {showSolution ? "Hide" : "Reveal"}
          </span>
        </button>
        {showSolution && sections["Solution"] && (
          <div className="relative">
            <button
              onClick={() => copyToClipboard(sections["Solution"])}
              className="absolute top-2 right-2 text-xs bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600 transition-colors z-10"
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
            <pre className="p-4 bg-gray-900 text-gray-100 text-xs overflow-x-auto leading-relaxed">
              <code>{sections["Solution"]}</code>
            </pre>
          </div>
        )}
        {showSolution && sections["Explanation"] && (
          <div className="p-4 border-t border-gray-100 text-sm text-gray-700 bg-gray-50">
            <strong>Explanation: </strong>{sections["Explanation"]}
          </div>
        )}
      </div>

      {/* Raw fallback if no sections parsed */}
      {Object.keys(sections).length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{raw}</pre>
        </div>
      )}
    </div>
  );
}

export default function Exercise() {
  const [topic, setTopic] = useState("Python Basics");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Grader
  const [showGrader, setShowGrader] = useState(false);
  const [studentSolution, setStudentSolution] = useState("");
  const [feedback, setFeedback] = useState("");
  const [grading, setGrading] = useState(false);

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    setExercise(null);
    setFeedback("");
    setStudentSolution("");
    setShowGrader(false);

    try {
      const data = await api.generateExercise(topic, difficulty);
      setExercise(data);
    } catch (err) {
      setError(err.message || "Failed to generate exercise");
    } finally {
      setLoading(false);
    }
  };

  const gradeSubmission = async () => {
    if (!studentSolution.trim() || grading) return;
    setGrading(true);
    setFeedback("");

    try {
      const problemText = exercise?.exercise?.raw || topic;
      const data = await api.gradeExercise(problemText, studentSolution);
      setFeedback(data.feedback);
    } catch (err) {
      setFeedback("Error: " + err.message);
    } finally {
      setGrading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-100">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-900">Exercise Generator</h1>
          <p className="text-sm text-gray-500 dark:text-gray-600 mt-1">
            Generate custom coding exercises and get AI-powered feedback on your solutions
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
            {/* Topic */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Topic
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 bg-white"
              >
                {TOPICS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Difficulty
              </label>
              <div className="flex gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-all ${
                      difficulty === d
                        ? difficultyColors[d]
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating exercise...
              </>
            ) : (
              <>
                <span>⚡</span>
                Generate Exercise
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4 flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Exercise Display */}
        {exercise && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${difficultyColors[difficulty]}`}>
                {difficulty}
              </span>
              <span className="text-xs text-gray-500">{topic}</span>
            </div>

            <ExerciseDisplay raw={exercise.exercise?.raw || JSON.stringify(exercise, null, 2)} />

            {/* Submit Solution */}
            <div className="mt-5 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 text-sm">Submit Your Solution</h3>
                <button
                  onClick={() => setShowGrader(!showGrader)}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  {showGrader ? "Hide" : "Open grader"}
                </button>
              </div>

              {showGrader && (
                <>
                  <textarea
                    value={studentSolution}
                    onChange={(e) => setStudentSolution(e.target.value)}
                    placeholder="Paste your Python solution here..."
                    rows={8}
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 mb-3"
                  />
                  <button
                    onClick={gradeSubmission}
                    disabled={!studentSolution.trim() || grading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {grading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Grading...
                      </>
                    ) : (
                      "Grade My Solution"
                    )}
                  </button>

                  {feedback && (
                    <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">📊 Feedback</h4>
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{feedback}</pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
