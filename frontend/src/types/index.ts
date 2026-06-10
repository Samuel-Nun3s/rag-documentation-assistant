export type DocumentStatus = 'processing' | 'ready' | 'error'
export type DocumentSource = 'upload' | 'github'
export type MessageRole = 'user' | 'assistant'

export interface Document {
  id: string
  name: string
  status: DocumentStatus
  source: DocumentSource
  mimeType: string | null
  chunkCount: number
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  id: string
  documentId: string
  title: string | null
  createdAt: string
}

export interface MessageSource {
  fileName: string
  chunkIndex: string
}

export interface Message {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  sources: MessageSource[] | null
  createdAt: string
}

export interface StreamEvent {
  token?: string
  done?: boolean
  messageId?: string
  error?: string
}
