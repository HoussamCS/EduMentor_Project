const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.details || `HTTP error ${res.status}`);
  }
  return data;
}

export const api = {
  // ── Health check ──────────────────────────────────────────────
  health: () =>
    fetch(`${BASE_URL}/health`).then(handleResponse),

  // ── Chat ──────────────────────────────────────────────────────
  chat: (question) =>
    fetch(`${BASE_URL}/chat`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ question }),
    }).then(handleResponse),

  ingest: () =>
    fetch(`${BASE_URL}/ingest`, { 
      method: "POST",
      headers: getAuthHeaders()
    }).then(handleResponse),

  // ── Exercise ──────────────────────────────────────────────────
  generateExercise: (topic, difficulty) =>
    fetch(`${BASE_URL}/generate-exercise`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ topic, difficulty }),
    }).then(handleResponse),

  gradeExercise: (problem, studentSolution) =>
    fetch(`${BASE_URL}/grade`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ problem, student_solution: studentSolution }),
    }).then(handleResponse),

  getTopics: () =>
    fetch(`${BASE_URL}/topics`, {
      headers: getAuthHeaders()
    }).then(handleResponse),

  // ── Analytics ─────────────────────────────────────────────────
  predictRiskCSV: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${BASE_URL}/predict-risk`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    }).then(handleResponse);
  },

  predictRiskSingle: (studentData) =>
    fetch(`${BASE_URL}/predict-risk-single`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(studentData),
    }).then(handleResponse),

  modelInfo: () =>
    fetch(`${BASE_URL}/model-info`, {
      headers: getAuthHeaders()
    }).then(handleResponse),

  // ── User Data ─────────────────────────────────────────────────
  getUserConversations: () =>
    fetch(`${BASE_URL}/user/conversations`, {
      headers: getAuthHeaders()
    }).then(handleResponse),

  saveConversation: (conversation) =>
    fetch(`${BASE_URL}/user/conversations`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(conversation),
    }).then(handleResponse),

  deleteConversation: (conversationId) =>
    fetch(`${BASE_URL}/user/conversations/${conversationId}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    }).then(handleResponse),

  getUserAnalytics: () =>
    fetch(`${BASE_URL}/user/analytics`, {
      headers: getAuthHeaders()
    }).then(handleResponse),
};
