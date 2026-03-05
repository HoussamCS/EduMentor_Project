# Large Language Models and RAG Systems

## What is an LLM?

A Large Language Model (LLM) is a deep neural network (typically a Transformer) trained on massive amounts of text data to predict the next token in a sequence. Through this simple objective and vast scale, LLMs develop emergent capabilities like reasoning, coding, and question answering.

**Examples**: GPT-4, Claude, Gemini, Llama 3, Mistral

## How LLMs Work

LLMs are trained in two main phases:

1. **Pre-training**: Self-supervised learning on internet-scale text. The model learns language, facts, and reasoning patterns.

2. **Fine-tuning / RLHF**: Alignment with human preferences. Makes the model helpful, harmless, and honest.

### Tokenization
Text is broken into tokens (subword units) before processing. "machine learning" might become ["machine", " learning"] or ["mach", "ine", " learn", "ing"] depending on the tokenizer.

## Prompt Engineering

The art of designing inputs to get optimal outputs from LLMs.

### System Prompts
Define the model's persona and constraints:
```
You are an expert ML tutor. Answer only questions about machine learning.
If you don't know, say "I don't know."
```

### Few-Shot Prompting
Provide examples in the prompt:
```
Classify sentiment:
"Great product!" → Positive
"Terrible experience" → Negative
"It was okay" → Neutral
"I absolutely loved it!" →
```

### Chain-of-Thought (CoT)
Ask the model to reason step by step:
```
Solve this step by step:
If a model has 90% accuracy on 100 samples,
how many did it classify correctly?
```

## Retrieval-Augmented Generation (RAG)

**The Problem**: LLMs hallucinate — they confidently generate false information. They also have a knowledge cutoff date and no access to your private documents.

**The Solution**: RAG grounds LLM responses in external, verifiable documents.

### RAG Pipeline

```
User Query
    ↓
Query Embedding (same model as documents)
    ↓
Vector Similarity Search (ChromaDB/FAISS)
    ↓
Top-k Relevant Chunks Retrieved
    ↓
LLM Prompt = System + Retrieved Context + User Question
    ↓
Grounded Answer + Source Citations
```

### Step 1: Ingestion (offline)
```python
from sentence_transformers import SentenceTransformer
import chromadb

model = SentenceTransformer('all-MiniLM-L6-v2')
client = chromadb.PersistentClient(path='./chroma_db')
collection = client.create_collection('knowledge')

# Chunk documents
chunks = split_into_chunks(document_text, chunk_size=700)

# Embed and store
embeddings = model.encode(chunks).tolist()
collection.upsert(
    documents=chunks,
    embeddings=embeddings,
    ids=[f"chunk_{i}" for i in range(len(chunks))]
)
```

### Step 2: Retrieval (at query time)
```python
query_embedding = model.encode([user_question]).tolist()
results = collection.query(
    query_embeddings=query_embedding,
    n_results=5
)
context = "\n".join(results['documents'][0])
```

### Step 3: Generation
```python
prompt = f"""
Based only on this context:
{context}

Answer: {user_question}

If the context doesn't contain the answer, say so.
"""
answer = llm.generate(prompt)
```

## Embeddings

Embeddings convert text to dense numerical vectors where semantic similarity = geometric proximity.

**all-MiniLM-L6-v2**:
- Dimensions: 384
- Speed: Fast
- Quality: Good for retrieval tasks
- Use case: Semantic search, RAG

**Key properties**:
- "cat" and "feline" will have similar embeddings
- "bank" (financial) and "bank" (river) will differ in context
- Cosine similarity measures relevance: 1.0 = identical, 0 = unrelated

## AI Agents

An AI Agent is an LLM with access to **tools** that it can use to complete tasks.

**Orchestration pattern**:
1. User gives a goal
2. Agent decides which tool to use (RAG, calculator, code executor)
3. Tool returns result
4. Agent incorporates result and decides next action
5. Repeat until goal achieved

**ReAct Framework** (Reason + Act):
```
Thought: I need to find current information about X
Action: web_search("X")
Observation: [search results]
Thought: Now I have the info to answer
Action: answer_user("Based on...")
```
