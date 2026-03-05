"""
Chat Route — RAG-based Q&A Chatbot
POST /api/chat
"""

import logging
from flask import Blueprint, request, jsonify
from config import Config

logger = logging.getLogger(__name__)

chat_bp = Blueprint("chat", __name__)


def get_llm_answer(system_prompt: str, user_prompt: str) -> str:
    """Call LLM with system + user prompts."""
    from config import Config
    from ml.agent import call_llm
    return call_llm(system_prompt, user_prompt)


@chat_bp.route("/chat", methods=["POST"])
def chat():
    """
    RAG-powered chat endpoint.
    
    Request body:
        {"question": "What is gradient descent?"}
    
    Response:
        {"answer": "...", "sources": ["doc1.pdf", "faq.md"]}
    """
    try:
        data = request.get_json()
        if not data or "question" not in data:
            return jsonify({"error": "Missing 'question' field"}), 400

        question = data["question"].strip()
        if not question:
            return jsonify({"error": "Question cannot be empty"}), 400

        if len(question) > 2000:
            return jsonify({"error": "Question too long (max 2000 characters)"}), 400

        # Retrieve relevant context from ChromaDB
        from rag.retriever import retrieve, format_context
        retrieval = retrieve(question)

        # Handle no relevant context
        if not retrieval["found"]:
            from rag.prompts import RAG_NO_CONTEXT_RESPONSE
            return jsonify({
                "answer": RAG_NO_CONTEXT_RESPONSE,
                "sources": []
            })

        # Build prompts
        from rag.prompts import RAG_SYSTEM_PROMPT, RAG_USER_TEMPLATE
        context = format_context(retrieval["chunks"])
        user_prompt = RAG_USER_TEMPLATE.format(
            context=context,
            question=question
        )

        # Call LLM
        logger.info(f"Calling LLM with provider: {Config.LLM_PROVIDER}, API key present: {bool(Config.OPENAI_API_KEY)}")
        answer = get_llm_answer(RAG_SYSTEM_PROMPT, user_prompt)
        logger.info(f"LLM response received: {answer is not None}")

        if answer is None:
            # Fallback: return context directly
            logger.warning("LLM returned None, using fallback")
            answer = (
                "Based on the course materials, here is what I found:\n\n"
                + retrieval["chunks"][0][:500]
                + "\n\n*(Note: LLM not configured — showing raw context)*"
            )

        return jsonify({
            "answer": answer,
            "sources": retrieval["sources"]
        })

    except Exception as e:
        logger.exception(f"Chat error: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@chat_bp.route("/ingest", methods=["POST"])
def ingest():
    """
    Trigger document ingestion into ChromaDB.
    POST /api/ingest
    """
    try:
        from rag.ingest import ingest_documents
        from config import Config
        result = ingest_documents(Config.KNOWLEDGE_BASE_DIR)
        return jsonify(result)
    except Exception as e:
        logger.exception(f"Ingestion error: {e}")
        return jsonify({"error": str(e)}), 500
