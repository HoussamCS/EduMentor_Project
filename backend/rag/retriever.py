"""
RAG Retriever
Retrieves top-k relevant chunks from ChromaDB for a given query.
"""

import os
import sys
import logging
from pathlib import Path

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from config import Config

logger = logging.getLogger(__name__)

# Try to import ChromaDB (may fail on Python 3.14+)
try:
    import chromadb
    from sentence_transformers import SentenceTransformer
    CHROMADB_AVAILABLE = True
except Exception as e:
    logger.warning(f"ChromaDB not available: {e}. Using fallback search.")
    CHROMADB_AVAILABLE = False
    chromadb = None
    SentenceTransformer = None

# Singleton model and client to avoid reloading
_embedding_model = None
_chroma_client = None
_collection = None


def get_embedding_model():
    global _embedding_model
    if not CHROMADB_AVAILABLE:
        return None
    if _embedding_model is None:
        logger.info(f"Loading embedding model: {Config.EMBEDDING_MODEL}")
        _embedding_model = SentenceTransformer(Config.EMBEDDING_MODEL)
    return _embedding_model


def get_collection():
    global _chroma_client, _collection
    if not CHROMADB_AVAILABLE:
        return None
    if _collection is None:
        _chroma_client = chromadb.PersistentClient(
            path=Config.CHROMA_PERSIST_DIR
        )
        try:
            _collection = _chroma_client.get_collection(Config.CHROMA_COLLECTION_NAME)
            logger.info(f"Connected to collection: {Config.CHROMA_COLLECTION_NAME} ({_collection.count()} chunks)")
        except Exception as e:
            logger.warning(f"Collection not found: {e}. Please run ingest.py first.")
            _collection = None
    return _collection


def fallback_keyword_search(query: str, top_k: int = 5) -> dict:
    """
    Improved keyword-based search through knowledge base files.
    Used when ChromaDB is not available.
    """
    kb_dir = Path(Config.KNOWLEDGE_BASE_DIR)
    if not kb_dir.exists():
        return {"chunks": [], "sources": [], "found": False}
    
    query_lower = query.lower()
    
    # Remove common stop words
    stop_words = {'what', 'is', 'are', 'in', 'the', 'a', 'an', 'to', 'of', 'for', 'on', 'at', 
                  'how', 'why', 'when', 'where', 'can', 'do', 'does', 'i', 'you', 'me', 'my',
                  'about', 'with', 'that', 'this', 'it', 'be', 'by', 'or', 'and'}
    
    # Extract important keywords
    query_words = [word.strip('?,!.') for word in query_lower.split() if word.strip('?,!.') not in stop_words]
    
    if not query_words:
        return {"chunks": [], "sources": [], "found": False}
    
    results = []
    
    # Search through all text files in knowledge base
    for file_path in kb_dir.glob("**/*"):
        if file_path.is_file() and file_path.suffix in ['.txt', '.md']:
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    content_lower = content.lower()
                    filename_lower = file_path.stem.lower()
                    
                    # Calculate file-level relevance score
                    file_score = sum(2 if word in filename_lower else 0 for word in query_words)
                    
                    # Split into paragraphs/sections
                    paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
                    
                    for para in paragraphs:
                        para_lower = para.lower()
                        
                        # Count keyword matches with different weights
                        match_score = 0
                        for word in query_words:
                            if word in para_lower:
                                # Exact word boundary match gets higher score
                                if f" {word} " in f" {para_lower} ":
                                    match_score += 3
                                else:
                                    match_score += 1
                        
                        if match_score > 0:
                            results.append({
                                'text': para,
                                'source': file_path.name,
                                'score': match_score + file_score
                            })
                            
            except Exception as e:
                logger.warning(f"Error reading {file_path}: {e}")
    
    # Sort by score and take top_k
    results.sort(key=lambda x: x['score'], reverse=True)
    top_results = results[:top_k]
    
    chunks = [r['text'][:700] for r in top_results]  # Limit chunk size
    sources = list(set(r['source'] for r in top_results))
    
    logger.info(f"Fallback search found {len(chunks)} chunks from sources: {sources}")
    if chunks:
        logger.info(f"First chunk preview: {chunks[0][:200]}...")
    
    return {
        "chunks": chunks,
        "sources": sources,
        "found": len(chunks) > 0
    }


def retrieve(query: str, top_k: int = None) -> dict:
    """
    Retrieve top-k relevant chunks for a query.
    
    Returns:
        {
            "chunks": [str, ...],
            "sources": [str, ...],
            "found": bool
        }
    """
    top_k = top_k or Config.TOP_K_RESULTS

    # Use fallback if ChromaDB is not available
    if not CHROMADB_AVAILABLE:
        logger.info("Using fallback keyword search")
        return fallback_keyword_search(query, top_k)

    collection = get_collection()
    if collection is None or collection.count() == 0:
        logger.info("Collection not available, using fallback")
        return fallback_keyword_search(query, top_k)

    model = get_embedding_model()

    # Generate query embedding
    query_embedding = model.encode([query]).tolist()

    # Query ChromaDB
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(top_k, collection.count()),
        include=["documents", "metadatas", "distances"]
    )

    chunks = results["documents"][0] if results["documents"] else []
    metadatas = results["metadatas"][0] if results["metadatas"] else []
    distances = results["distances"][0] if results["distances"] else []

    # Filter by relevance threshold (cosine distance < 0.7 means somewhat relevant)
    RELEVANCE_THRESHOLD = 0.7
    filtered_chunks = []
    filtered_sources = []

    for chunk, meta, dist in zip(chunks, metadatas, distances):
        if dist < RELEVANCE_THRESHOLD:
            filtered_chunks.append(chunk)
            source = meta.get("source", "unknown")
            if source not in filtered_sources:
                filtered_sources.append(source)

    # If no results from ChromaDB, try fallback
    if not filtered_chunks:
        logger.info("No results from ChromaDB, using fallback")
        return fallback_keyword_search(query, top_k)

    return {
        "chunks": filtered_chunks,
        "sources": filtered_sources,
        "found": len(filtered_chunks) > 0
    }


def format_context(chunks: list[str]) -> str:
    """Format retrieved chunks into a context string for the LLM."""
    if not chunks:
        return ""
    formatted = []
    for i, chunk in enumerate(chunks, 1):
        formatted.append(f"[Context {i}]:\n{chunk}")
    return "\n\n".join(formatted)
