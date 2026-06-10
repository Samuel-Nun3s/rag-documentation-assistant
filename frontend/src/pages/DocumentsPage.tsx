import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { documentsApi, chatApi } from '@/api'
import type { Document } from '@/types'
import { UploadZone } from '@/components/documents/UploadZone'
import { DocumentCard } from '@/components/documents/DocumentCard'
import { Spinner } from '@/components/ui/spinner'

export function DocumentsPage() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await documentsApi.list()
      setDocuments(docs)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDocuments() }, [loadDocuments])

  const handleUploaded = (doc: Document) => {
    setDocuments((prev) => [doc, ...prev])
  }

  const handleRefresh = async (id: string) => {
    const doc = await documentsApi.get(id)
    setDocuments((prev) => prev.map((d) => (d.id === id ? doc : d)))
  }

  const handleDelete = async (id: string) => {
    await documentsApi.remove(id)
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  const handleChat = async (doc: Document) => {
    const conversation = await chatApi.createConversation(doc.id)
    navigate(`/chat/${doc.id}/${conversation.id}`)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">RAG Assistant</h1>
          <p className="text-sm text-neutral-500">Chat with your documents</p>
        </div>
      </div>

      {/* Upload */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-neutral-700">Add document</h2>
        <UploadZone onUploaded={handleUploaded} />
      </section>

      {/* List */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-700">
          Your documents {!loading && <span className="text-neutral-400">({documents.length})</span>}
        </h2>

        {loading ? (
          <div className="flex justify-center py-8"><Spinner className="text-neutral-400" /></div>
        ) : documents.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">No documents yet. Upload one above.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onChat={handleChat}
                onDelete={handleDelete}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
