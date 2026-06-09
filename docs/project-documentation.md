```
1. RAG Document Assistant  →  2. GitHub PR Review Agent  →  3. Multi-Agent Pipeline
```

O RAG é base para os outros dois — embeddings e tool use aparecem nos três. Construir nessa ordem evita reaprender conceitos.

---

---

# Projeto 1 — RAG Document Assistant
**"Chat com qualquer documento ou repositório"**

## O que é
Usuário faz upload de PDFs, documentações ou conecta um repositório GitHub e consegue fazer perguntas em linguagem natural. O sistema busca os trechos relevantes e gera respostas fundamentadas no conteúdo real — sem alucinação.

**Exemplo de uso:** conecta o repositório do NestJS e pergunta "como funciona o ciclo de vida de um módulo?" O sistema lê o código e a documentação e responde com contexto real.

---

## Arquitetura

```
[Upload de arquivo / URL / Repositório]
         ↓
[Document Processor]
  - Extrai texto (PDF, MD, código)
  - Divide em chunks (pedaços menores)
         ↓
[Embedding Service]
  - Gera vetores numéricos de cada chunk
  - Modelo: text-embedding-3-small (OpenAI) ou Claude
         ↓
[Vector Store — Pinecone ou Chroma]
  - Armazena os vetores + metadados (arquivo, página, trecho)
         ↓
         [Usuário faz uma pergunta]
                  ↓
         [Query Embedding]
           - Pergunta também vira vetor
                  ↓
         [Busca Semântica]
           - Encontra os chunks mais similares à pergunta
                  ↓
         [LLM com contexto]
           - Recebe: pergunta + chunks relevantes
           - Gera resposta citando as fontes
                  ↓
         [Resposta com referências]
```

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Backend | NestJS + TypeScript |
| Embeddings | OpenAI text-embedding-3-small |
| Vector DB | Pinecone (cloud, free tier) ou Chroma (local) |
| LLM | Claude claude-sonnet-4-6 ou GPT-4o |
| Fila de processamento | BullMQ + Redis (upload assíncrono) |
| Storage de arquivos | AWS S3 |
| Banco relacional | PostgreSQL (metadados, histórico de conversas) |
| Frontend | React + TailwindCSS |

---

## Estrutura de Módulos (NestJS)

```
src/
├── documents/
│   ├── documents.module.ts
│   ├── documents.controller.ts    # upload, listar, deletar
│   ├── documents.service.ts       # orquestra o pipeline
│   ├── processors/
│   │   ├── pdf.processor.ts       # extrai texto de PDF
│   │   ├── markdown.processor.ts  # processa arquivos MD
│   │   └── github.processor.ts    # clona e processa repositório
│   └── chunking.service.ts        # divide em chunks com overlap
│
├── embeddings/
│   ├── embeddings.module.ts
│   ├── embeddings.service.ts      # gera vetores via API
│   └── vector-store.service.ts    # interface com Pinecone/Chroma
│
├── chat/
│   ├── chat.module.ts
│   ├── chat.controller.ts         # endpoint de pergunta
│   ├── chat.service.ts            # orquestra busca + geração
│   ├── retrieval.service.ts       # busca semântica
│   └── generation.service.ts     # chama o LLM com contexto
│
└── queue/
    └── document-processing.queue.ts
```

---

## Fluxo de Código Principal

### 1. Chunking com overlap
```typescript
// chunking.service.ts
chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize));
    start += chunkSize - overlap; // overlap garante contexto entre chunks
  }
  return chunks;
}
```

### 2. Geração de embedding
```typescript
// embeddings.service.ts
async embed(text: string): Promise<number[]> {
  const response = await this.openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}
```

### 3. Busca semântica + geração de resposta
```typescript
// chat.service.ts
async ask(question: string, documentId: string): Promise<string> {
  const questionVector = await this.embeddings.embed(question);
  const relevantChunks = await this.vectorStore.search(questionVector, {
    topK: 5,
    filter: { documentId },
  });

  const context = relevantChunks.map(c => c.text).join('\n\n');

  return this.generation.generate({
    system: 'Responda apenas com base no contexto fornecido. Cite a fonte.',
    user: `Contexto:\n${context}\n\nPergunta: ${question}`,
  });
}
```

---

## Features para o Portfolio

- [ ] Upload de PDF, Markdown e URL
- [ ] Integração com repositório GitHub (via URL)
- [ ] Histórico de conversas por documento
- [ ] Resposta com citação da fonte (página/arquivo/linha)
- [ ] Múltiplos documentos em uma coleção
- [ ] Streaming da resposta em tempo real (SSE)

---

## Diferencial Técnico para Mencionar em Entrevistas
- **Chunking com overlap** — evita perder contexto na divisão
- **Busca semântica** vs busca por palavra-chave — entende o significado
- **Grounding** — resposta fundamentada em fonte real, sem alucinação
- **Pipeline assíncrono** — upload não bloqueia, processado em fila