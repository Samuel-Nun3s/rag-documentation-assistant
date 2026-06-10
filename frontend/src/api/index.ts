import type { Conversation, Document, Message, StreamEvent } from '@/types'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text)
  }
  return res.json() as Promise<T>
}

// ── Documents ─────────────────────────────────────────────────────────────────

export const documentsApi = {
  list: () => request<Document[]>('/documents'),

  get: (id: string) => request<Document>(`/documents/${id}`),

  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<Document>('/documents/upload', { method: 'POST', body: form })
  },

  fromGithub: (url: string) =>
    request<Document>('/documents/github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }),

  remove: (id: string) =>
    fetch(`${BASE}/documents/${id}`, { method: 'DELETE' }).then(() => undefined),
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export const chatApi = {
  createConversation: (documentId: string) =>
    request<Conversation>('/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
    }),

  listConversations: (documentId: string) =>
    request<Conversation[]>(`/chat/conversations/document/${documentId}`),

  getMessages: (conversationId: string) =>
    request<Message[]>(`/chat/conversations/${conversationId}/messages`),

  ask: (conversationId: string, question: string) =>
    request<Message>(`/chat/conversations/${conversationId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    }),

  askStream: async function* (
    conversationId: string,
    question: string,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamEvent> {
    const res = await fetch(`${BASE}/chat/conversations/${conversationId}/ask/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal,
    })

    if (!res.ok || !res.body) throw new Error('Stream failed')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            yield JSON.parse(line.slice(6)) as StreamEvent
          } catch {
            // malformed line — skip
          }
        }
      }
    }
  },
}
