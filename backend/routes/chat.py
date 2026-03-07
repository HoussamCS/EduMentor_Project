"""
Chat Route — RAG-based Q&A Chatbot
POST /api/chat
"""

import logging
import os
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from config import Config

logger = logging.getLogger(__name__)

chat_bp = Blueprint("chat", __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx', 'md'}

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_text_from_uploaded_file(filepath):
    """Extract text from uploaded file without ChromaDB dependencies."""
    ext = filepath.rsplit('.', 1)[1].lower()
    
    try:
        # Plain text and markdown files
        if ext in ['txt', 'md']:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        
        # PDF files
        elif ext == 'pdf':
            try:
                import PyPDF2
                with open(filepath, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    text = ''
                    for page in reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + '\n'
                    return text
            except ImportError:
                logger.error("PyPDF2 not installed")
                return "[PDF support requires PyPDF2 package]"
            except Exception as e:
                logger.error(f"Error reading PDF {filepath}: {e}")
                return f"[Error reading PDF: {str(e)}]"
        
        # DOCX files
        elif ext in ['doc', 'docx']:
            try:
                import docx
                doc = docx.Document(filepath)
                text = '\n'.join([para.text for para in doc.paragraphs])
                return text
            except ImportError:
                logger.error("python-docx not installed")
                return "[DOCX support requires python-docx package]"
            except Exception as e:
                logger.error(f"Error reading DOCX {filepath}: {e}")
                return f"[Error reading DOCX: {str(e)}]"
        
        else:
            return "[Unsupported file format]"
            
    except Exception as e:
        logger.error(f"Error extracting text from {filepath}: {e}")
        return f"[Error reading file: {str(e)}]"


def get_llm_answer(system_prompt: str, user_prompt: str) -> str:
    """Call LLM with system + user prompts."""
    from config import Config
    from ml.agent import call_llm
    return call_llm(system_prompt, user_prompt)


@chat_bp.route("/chat", methods=["POST"])
def chat():
    """
    RAG-powered chat endpoint with optional file upload.
    
    Request body (JSON):
        {"question": "What is gradient descent?"}
    
    Request body (FormData):
        question: "What is this about?"
        files: [file1, file2, ...]
    
    Response:
        {"answer": "...", "sources": ["doc1.pdf", "faq.md"]}
    """
    try:
        # Handle both JSON and FormData requests
        if request.is_json:
            data = request.get_json()
            question = data.get("question", "").strip()
            uploaded_files = []
        else:
            # FormData with files
            question = request.form.get("question", "").strip()
            uploaded_files = request.files.getlist("files")
        
        # Extract text from uploaded files
        file_context = ""
        file_sources = []
        
        if uploaded_files:
            for file in uploaded_files:
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    
                    try:
                        file.save(filepath)
                        
                        # Extract text using standalone function
                        text = extract_text_from_uploaded_file(filepath)
                        file_context += f"\n\n--- Content from {filename} ---\n{text}\n"
                        file_sources.append(filename)
                        
                    except Exception as e:
                        logger.error(f"Error processing {filename}: {e}")
                        file_context += f"\n\n--- Error reading {filename}: {str(e)} ---\n"
                    
                    finally:
                        # Clean up uploaded file
                        try:
                            if os.path.exists(filepath):
                                os.remove(filepath)
                        except Exception as e:
                            logger.warning(f"Could not delete temp file {filepath}: {e}")
        
        # Validate question
        if not question and not file_context:
            return jsonify({"error": "Missing 'question' field or files"}), 400

        if question and len(question) > 2000:
            return jsonify({"error": "Question too long (max 2000 characters)"}), 400

        # If only files uploaded without question, use a default question
        if not question:
            question = "Please summarize and explain the content of the uploaded files."

        # Retrieve relevant context from ChromaDB (if no files, or to augment file context)
        from rag.retriever import retrieve, format_context
        retrieval = retrieve(question)

        # Build context: uploaded files + RAG context
        combined_context = file_context
        combined_sources = file_sources.copy()
        
        if retrieval["found"]:
            rag_context = format_context(retrieval["chunks"])
            combined_context += f"\n\n--- Knowledge Base Context ---\n{rag_context}"
            combined_sources.extend(retrieval["sources"])
        
        # Handle no context at all
        if not combined_context.strip():
            from rag.prompts import RAG_NO_CONTEXT_RESPONSE
            return jsonify({
                "answer": RAG_NO_CONTEXT_RESPONSE,
                "sources": []
            })

        # Build prompts
        from rag.prompts import RAG_SYSTEM_PROMPT, RAG_USER_TEMPLATE
        user_prompt = RAG_USER_TEMPLATE.format(
            context=combined_context,
            question=question
        )

        # Call LLM
        logger.info(f"Calling LLM with provider: {Config.LLM_PROVIDER}, API key present: {bool(Config.OPENAI_API_KEY)}")
        logger.info(f"Context being sent (first 300 chars): {combined_context[:300]}")
        answer = get_llm_answer(RAG_SYSTEM_PROMPT, user_prompt)
        logger.info(f"LLM response received: {answer is not None}")

        if answer is None:
            # Fallback: return context directly
            logger.warning("LLM returned None, using fallback")
            answer = (
                "Based on the provided materials, here is what I found:\n\n"
                + combined_context[:500]
                + "\n\n*(Note: LLM not configured — showing raw context)*"
            )

        return jsonify({
            "answer": answer,
            "sources": list(set(combined_sources))  # Remove duplicates
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
