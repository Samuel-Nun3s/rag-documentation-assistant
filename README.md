# RAG Document Assistant

Chat with any PDF, Markdown file or GitHub repository using semantic search and GPT-4o.

Upload a document, ask a question in natural language, and get an answer grounded in the real content — with source citations pointing to the exact chunk used.

---

## Architecture

```
[Upload / GitHub URL]
        ↓
[Document Processor]         PDF · Markdown · Git clone
        ↓
[Chunking — overlap 50]      500-char chunks, context preserved at boundaries
        ↓
[Embeddings — OpenAI]        text-embedding-3-small → 1536-dim vectors
        ↓
[ChromaDB]                   vector store (local, Docker)
        ↓
        [User asks a question]
                ↓
        [Query Embedding]     question → same vector space
                ↓
        [Semantic Search]     top-5 most similar chunks
                ↓
        [GPT-4o]             question + chunks → grounded answer
                ↓
        [SSE Stream]         tokens arrive in real time in the UI
```

---

## Stack

| Layer | Technology |
|---|---|
| Backend | NestJS + TypeScript |
| Embeddings | OpenAI `text-embedding-3-small` |
| LLM | OpenAI GPT-4o (streaming) |
| Vector DB | ChromaDB (Docker) |
| Queue | BullMQ + Redis |
| Database | PostgreSQL (documents + conversation history) |
| Frontend | React + Vite + Tailwind CSS |
| Tests | Jest — 46 unit tests, Levels 1 and 2 |

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- OpenAI API key

---

## Setup

**1. Clone and install**

```bash
git clone <repo-url>
cd rag-documentation-assistent

cd backend && npm install
cd ../frontend && npm install
```

**2. Configure environment**

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and set your OpenAI key:

```env
OPENAI_API_KEY=sk-...
```

All other values work out of the box with the Docker setup.

**3. Start infrastructure (Docker)**

```bash
docker compose up -d
```

This starts PostgreSQL (5432), Redis (6379) and ChromaDB (8000).

**4. Start the backend**

```bash
cd backend
npm run start:dev
```

The API will be available at `http://localhost:3000`.  
TypeORM creates the tables automatically on first run.

**5. Start the frontend**

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Usage

### Upload a document

Drag and drop a PDF or Markdown file onto the upload zone, or paste a public GitHub repository URL and click **Index**.

The document is processed asynchronously — the status badge updates from `Processing` to `Ready` when indexing is complete (click the refresh icon to check).

### Chat

Click the chat icon on any ready document to open a conversation. Type a question and press Enter. The answer streams in real time, with source citations showing which file and chunk each response is grounded in.

### API endpoints

```
POST   /documents/upload                     Upload PDF or Markdown
POST   /documents/github                     Index a GitHub repository
GET    /documents                            List all documents
GET    /documents/:id                        Get document by ID
DELETE /documents/:id                        Delete document and its vectors

POST   /chat/conversations                   Create conversation
POST   /chat/conversations/:id/ask           Ask (full response)
POST   /chat/conversations/:id/ask/stream    Ask (SSE streaming)
GET    /chat/conversations/document/:docId   List conversations
GET    /chat/conversations/:id/messages      Get message history
```

---

## Running tests

```bash
cd backend
npm test
```

46 tests across 10 suites covering all services with mocked external dependencies.

---

## Technical highlights

**Chunking with overlap** — each 500-character chunk overlaps by 50 characters with the next, preventing context loss at boundaries.

**Semantic search** — vector similarity finds relevant chunks even when the question uses different words than the document.

**Grounding** — the LLM is instructed to answer only from the provided context, eliminating hallucination.

**Async pipeline** — uploads return immediately; processing happens in a BullMQ worker queue so the API never blocks.

**SSE streaming** — GPT-4o tokens are forwarded to the browser as Server-Sent Events, giving instant feedback without polling.
