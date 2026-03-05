import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Anthropic / OpenAI API
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "anthropic")  # "anthropic" or "openai"

    # ChromaDB
    CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
    CHROMA_COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "edumentor_knowledge")

    # Embedding model
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

    # RAG settings
    CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "700"))
    CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "100"))
    TOP_K_RESULTS = int(os.getenv("TOP_K_RESULTS", "5"))

    # ML model
    MODEL_PATH = os.getenv("MODEL_PATH", "./models/risk_model.joblib")

    # Knowledge base path
    KNOWLEDGE_BASE_DIR = os.getenv("KNOWLEDGE_BASE_DIR", "./knowledge_base")

    # Flask
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"
    SECRET_KEY = os.getenv("SECRET_KEY", "edumentor-secret-key-change-in-production")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:3000")
