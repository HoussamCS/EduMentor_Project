import { useState, useRef, useEffect } from "react";
import { api } from "../api";

const MessageBubble = ({ message }) => {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-3xl ${isUser ? "order-2" : "order-1"}`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              AI
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-600 font-medium">EduMentor AI</span>
          </div>
        )}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-indigo-600 text-white rounded-br-sm"
              : "bg-white dark:bg-gray-50/80 border border-gray-200 dark:border-gray-300 text-gray-800 dark:text-gray-900 rounded-bl-sm shadow-sm"
          }`}
        >
          {message.content}
        </div>
        {message.files && message.files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.files.map((file, i) => (
              <span
                key={i}
                className="text-xs bg-indigo-50 dark:bg-indigo-100 text-indigo-600 dark:text-indigo-700 border border-indigo-200 dark:border-indigo-300 px-2 py-0.5 rounded-full"
              >
                📎 {file}
              </span>
            ))}
          </div>
        )}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="text-xs text-gray-400 dark:text-gray-500">Sources:</span>
            {message.sources.map((src, i) => (
              <span
                key={i}
                className="text-xs bg-blue-50 dark:bg-blue-100 text-blue-600 dark:text-blue-700 border border-blue-200 dark:border-blue-300 px-2 py-0.5 rounded-full"
              >
                📄 {src}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TypingIndicator = () => (
  <div className="flex justify-start mb-4">
    <div className="bg-white dark:bg-gray-50/80 border border-gray-200 dark:border-gray-300 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
      <div className="flex gap-1 items-center h-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  </div>
);

const WELCOME_MESSAGE = {
  id: 0,
  role: "assistant",
  content:
    "👋 Hi! I'm EduMentor AI, your course assistant. Ask me anything about Python, Machine Learning, NLP, or any topic from your course materials. I'll answer based on your course documents and cite my sources!",
  sources: [],
};

export default function Chat() {
  // Load conversations from localStorage
  const loadConversations = () => {
    try {
      const saved = localStorage.getItem('chatConversations');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
    // Default conversation
    return {
      conversations: [{
        id: Date.now(),
        title: "New Conversation",
        messages: [WELCOME_MESSAGE],
        createdAt: Date.now()
      }],
      activeId: null
    };
  };

  const [conversationsData, setConversationsData] = useState(loadConversations);
  const [activeConversationId, setActiveConversationId] = useState(() => {
    const data = loadConversations();
    return data.activeId || data.conversations[0]?.id;
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  // Voice recognition setup
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setRecognizing(false);
      textareaRef.current?.focus();
    };
    recognitionRef.current.onerror = () => {
      setRecognizing(false);
    };
    recognitionRef.current.onend = () => {
      setRecognizing(false);
    };
  }, []);

  const handleVoiceInput = () => {
    if (!recognitionRef.current) return;
    if (recognizing) {
      recognitionRef.current.stop();
      setRecognizing(false);
    } else {
      setRecognizing(true);
      recognitionRef.current.start();
    }
  };

  // Get current conversation
  const currentConversation = conversationsData.conversations.find(
    c => c.id === activeConversationId
  ) || conversationsData.conversations[0];
  
  const messages = currentConversation?.messages || [WELCOME_MESSAGE];

  // Save to localStorage whenever conversations change
  useEffect(() => {
    try {
      localStorage.setItem('chatConversations', JSON.stringify({
        conversations: conversationsData.conversations,
        activeId: activeConversationId
      }));
    } catch (e) {
      console.error('Failed to save conversations:', e);
    }
  }, [conversationsData, activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    const question = input.trim();
    if ((!question && uploadedFiles.length === 0) || loading) return;

    setError("");
    setInput("");

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: question || "[Uploaded files]",
      files: uploadedFiles.map(f => f.name),
    };
    
    // Update messages in current conversation
    setConversationsData(prev => ({
      ...prev,
      conversations: prev.conversations.map(conv =>
        conv.id === activeConversationId
          ? { ...conv, messages: [...conv.messages, userMsg] }
          : conv
      )
    }));
    
    setLoading(true);
    const filesToSend = uploadedFiles;
    setUploadedFiles([]);

    try {
      const data = await api.chatWithFiles(question, filesToSend);
      const assistantMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.answer,
        sources: data.sources || [],
      };
      
      setConversationsData(prev => ({
        ...prev,
        conversations: prev.conversations.map(conv =>
          conv.id === activeConversationId
            ? { 
                ...conv, 
                messages: [...conv.messages, assistantMsg],
                // Update title if it's the first user message
                title: conv.messages.length === 1 ? question.slice(0, 30) + (question.length > 30 ? '...' : '') : conv.title
              }
            : conv
        )
      }));
    } catch (err) {
      setError(err.message || "Failed to get response. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setConversationsData(prev => ({
      ...prev,
      conversations: prev.conversations.map(conv =>
        conv.id === activeConversationId
          ? { ...conv, messages: [WELCOME_MESSAGE] }
          : conv
      )
    }));
    setError("");
  };

  const createNewConversation = () => {
    const newConv = {
      id: Date.now(),
      title: "New Conversation",
      messages: [WELCOME_MESSAGE],
      createdAt: Date.now()
    };
    
    setConversationsData(prev => ({
      ...prev,
      conversations: [newConv, ...prev.conversations]
    }));
    setActiveConversationId(newConv.id);
    setShowSidebar(false);
  };

  const deleteConversation = (id) => {
    setConversationsData(prev => {
      const filtered = prev.conversations.filter(c => c.id !== id);
      // If deleting active conversation, switch to first remaining
      if (id === activeConversationId && filtered.length > 0) {
        setActiveConversationId(filtered[0].id);
      }
      return {
        ...prev,
        conversations: filtered.length > 0 ? filtered : [{
          id: Date.now(),
          title: "New Conversation",
          messages: [WELCOME_MESSAGE],
          createdAt: Date.now()
        }]
      };
    });
  };

  const switchConversation = (id) => {
    setActiveConversationId(id);
    setShowSidebar(false);
  };

  const suggestions = [
    "What is gradient descent?",
    "Explain overfitting vs underfitting",
    "How does the attention mechanism work?",
    "What is RAG in LLMs?",
  ];

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-100 relative">
      {/* Conversations Sidebar */}
      {showSidebar && (
        <>
          <div 
            className="absolute inset-0 bg-black/20 z-10"
            onClick={() => setShowSidebar(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-50 border-r border-gray-200 dark:border-gray-300 z-20 flex flex-col shadow-xl">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-300">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-gray-900">Conversations</h3>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <button
                onClick={createNewConversation}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Conversation
              </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto p-2">
              {conversationsData.conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group p-3 rounded-lg mb-1 cursor-pointer transition-colors ${
                    conv.id === activeConversationId
                      ? 'bg-indigo-50 dark:bg-indigo-100 border border-indigo-200'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-200'
                  }`}
                  onClick={() => switchConversation(conv.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        conv.id === activeConversationId 
                          ? 'text-indigo-900' 
                          : 'text-gray-700 dark:text-gray-900'
                      }`}>
                        {conv.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-600 mt-0.5">
                        {conv.messages.length - 1} message{conv.messages.length - 1 !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {conversationsData.conversations.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 p-1 transition-opacity"
                        title="Delete conversation"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Main Chat Area */}
      <div className="flex flex-col h-full flex-1">
        {/* Header */}
        <div className="bg-white dark:bg-gray-100 border-b border-gray-200 dark:border-gray-300 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setShowSidebar(true)}
              className="text-gray-500 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-200 transition-all"
              title="Show conversations"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex-1 text-center">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-900">Course Q&A Chatbot</h1>
              <p className="text-xs text-gray-500 dark:text-gray-600 mt-0.5">
                Answers grounded in your course materials
              </p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="text-sm text-gray-500 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-200 transition-all"
          >
            Clear chat
          </button>
        </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-1 bg-gray-50 dark:bg-gray-100">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {loading && <TypingIndicator />}
        
        {/* Suggestions (shown when only welcome message) */}
        {messages.length === 1 && !loading && (
          <div className="pt-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="text-xs bg-gray-50 dark:bg-gray-100 hover:bg-gray-100 dark:hover:bg-gray-200 text-gray-600 dark:text-gray-700 border border-gray-200 dark:border-gray-300 px-3 py-1.5 rounded-full transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mb-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg flex items-center justify-between flex-shrink-0">
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} className="ml-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Input - Fixed at Bottom */}
      <div className="bg-white dark:bg-gray-100 border-t border-gray-200 dark:border-gray-300 px-6 py-4 flex-shrink-0">
        {/* Uploaded Files Preview */}
        {uploadedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg text-sm">
                <span className="text-blue-700">📎 {file.name}</span>
                <button
                  onClick={() => removeFile(idx)}
                  className="text-blue-400 hover:text-red-600 transition-colors"
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about course materials... (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-400 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-300 px-4 py-3 text-sm outline-none transition-all bg-white dark:bg-gray-50 text-gray-900 dark:text-gray-900 placeholder-gray-400 dark:placeholder-gray-500"
            style={{ minHeight: "44px", maxHeight: "120px" }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            disabled={loading}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.doc,.docx,.md"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-3 rounded-xl transition-colors font-medium text-sm flex items-center gap-1.5 min-w-[44px] justify-center"
            title="Upload files"
          >
            📎
          </button>
          <button
            onClick={handleVoiceInput}
            disabled={loading || recognizing || !(window.SpeechRecognition || window.webkitSpeechRecognition)}
            className={`bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-3 rounded-xl transition-colors font-medium text-sm flex items-center gap-1.5 min-w-[44px] justify-center ${recognizing ? 'animate-pulse' : ''}`}
            title="Speak"
          >
            {recognizing ? (
              <span className="flex items-center gap-1">🎤 Listening...</span>
            ) : (
              <span className="flex items-center gap-1">🎤 Voice</span>
            )}
          </button>
          <button
            onClick={sendMessage}
            disabled={(!input.trim() && uploadedFiles.length === 0) || loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl transition-colors font-medium text-sm flex items-center gap-1.5 min-w-[80px] justify-center"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Send
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}