"""
RAG Ingestion Pipeline
Loads documents from knowledge_base/, chunks them, generates embeddings,
and stores them in ChromaDB.
"""

import os
import sys
import logging
from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_text_file(filepath: str) -> str:
    """Load a plain text or markdown file."""
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def load_pdf_file(filepath: str) -> str:
    """Load text from a PDF file using pdfplumber."""
    try:
        import pdfplumber
        text = ""
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        return text
    except Exception as e:
        logger.warning(f"pdfplumber failed for {filepath}: {e}. Trying PyPDF2...")
        try:
            import PyPDF2
            text = ""
            with open(filepath, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
            return text
        except Exception as e2:
            logger.error(f"Could not load PDF {filepath}: {e2}")
            return ""


def chunk_text(text: str, chunk_size: int = None, overlap: int = None) -> list[str]:
    """Split text into overlapping chunks."""
    chunk_size = chunk_size or Config.CHUNK_SIZE
    overlap = overlap or Config.CHUNK_OVERLAP

    if not text.strip():
        return []

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap

    return chunks


def load_documents(knowledge_base_dir: str) -> list[dict]:
    """
    Load all supported documents from the knowledge base directory.
    Returns list of {text, source, filetype} dicts.
    """
    kb_path = Path(knowledge_base_dir)
    if not kb_path.exists():
        logger.warning(f"Knowledge base directory not found: {knowledge_base_dir}")
        return []

    documents = []
    supported_extensions = {".txt", ".md", ".pdf"}

    for filepath in kb_path.rglob("*"):
        if filepath.suffix.lower() not in supported_extensions:
            continue

        logger.info(f"Loading: {filepath.name}")
        try:
            if filepath.suffix.lower() == ".pdf":
                text = load_pdf_file(str(filepath))
            else:
                text = load_text_file(str(filepath))

            if text.strip():
                documents.append({
                    "text": text,
                    "source": filepath.name,
                    "filetype": filepath.suffix.lower()
                })
                logger.info(f"  ✓ Loaded {len(text)} characters from {filepath.name}")
            else:
                logger.warning(f"  ✗ Empty content in {filepath.name}")

        except Exception as e:
            logger.error(f"  ✗ Error loading {filepath.name}: {e}")

    return documents


def get_chroma_client():
    """Initialize and return a ChromaDB client."""
    return chromadb.PersistentClient(
        path=Config.CHROMA_PERSIST_DIR
    )


def get_or_create_collection(client):
    """Get or create the ChromaDB collection."""
    try:
        collection = client.get_collection(Config.CHROMA_COLLECTION_NAME)
        logger.info(f"Found existing collection: {Config.CHROMA_COLLECTION_NAME}")
        return collection
    except Exception:
        collection = client.create_collection(
            name=Config.CHROMA_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )
        logger.info(f"Created new collection: {Config.CHROMA_COLLECTION_NAME}")
        return collection


def ingest_documents(knowledge_base_dir: str = None):
    """
    Full ingestion pipeline:
    1. Load documents
    2. Chunk text
    3. Generate embeddings
    4. Store in ChromaDB
    """
    kb_dir = knowledge_base_dir or Config.KNOWLEDGE_BASE_DIR
    logger.info(f"Starting ingestion from: {kb_dir}")

    # Load embedding model
    logger.info(f"Loading embedding model: {Config.EMBEDDING_MODEL}")
    model = SentenceTransformer(Config.EMBEDDING_MODEL)

    # Load documents
    documents = load_documents(kb_dir)
    if not documents:
        logger.warning("No documents found. Please add files to the knowledge_base/ folder.")
        return {"status": "warning", "message": "No documents found", "chunks_added": 0}

    # Connect to ChromaDB
    client = get_chroma_client()
    collection = get_or_create_collection(client)

    # Clear existing data for fresh ingest
    existing = collection.count()
    if existing > 0:
        logger.info(f"Clearing {existing} existing chunks...")
        client.delete_collection(Config.CHROMA_COLLECTION_NAME)
        collection = client.create_collection(
            name=Config.CHROMA_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )

    # Process each document
    total_chunks = 0
    all_texts = []
    all_embeddings = []
    all_metadatas = []
    all_ids = []

    for doc in documents:
        chunks = chunk_text(doc["text"])
        logger.info(f"  {doc['source']}: {len(chunks)} chunks")

        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc['source']}_{i}"
            all_texts.append(chunk)
            all_metadatas.append({
                "source": doc["source"],
                "filetype": doc["filetype"],
                "chunk_index": i
            })
            all_ids.append(chunk_id)
            total_chunks += 1

    if all_texts:
        logger.info(f"Generating embeddings for {total_chunks} chunks...")
        embeddings = model.encode(all_texts, show_progress_bar=True).tolist()

        # Batch upsert to ChromaDB
        batch_size = 100
        for i in range(0, len(all_texts), batch_size):
            collection.upsert(
                documents=all_texts[i:i+batch_size],
                embeddings=embeddings[i:i+batch_size],
                metadatas=all_metadatas[i:i+batch_size],
                ids=all_ids[i:i+batch_size]
            )
            logger.info(f"  Stored batch {i//batch_size + 1}/{(len(all_texts)-1)//batch_size + 1}")

    logger.info(f"✓ Ingestion complete. Total chunks stored: {total_chunks}")
    return {
        "status": "success",
        "documents_processed": len(documents),
        "chunks_added": total_chunks
    }


if __name__ == "__main__":
    result = ingest_documents()
    print(result)
