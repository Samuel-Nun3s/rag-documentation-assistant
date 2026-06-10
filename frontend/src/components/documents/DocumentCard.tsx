import { FileText, GitFork, Trash2, MessageSquare, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Document } from '@/types'

interface Props {
  document: Document
  onChat: (doc: Document) => void
  onDelete: (id: string) => void
  onRefresh: (id: string) => void
}

const statusLabel: Record<Document['status'], string> = {
  processing: 'Processing',
  ready: 'Ready',
  error: 'Error',
}

export function DocumentCard({ document, onChat, onDelete, onRefresh }: Props) {
  const Icon = document.source === 'github' ? GitFork : FileText

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3">
      <Icon className="h-5 w-5 shrink-0 text-neutral-400" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900">{document.name}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <Badge variant={document.status}>{statusLabel[document.status]}</Badge>
          {document.status === 'ready' && (
            <span className="text-xs text-neutral-400">{document.chunkCount} chunks</span>
          )}
          {document.status === 'error' && document.errorMessage && (
            <span className="truncate text-xs text-red-500">{document.errorMessage}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        {document.status === 'processing' && (
          <Button variant="ghost" size="icon" onClick={() => onRefresh(document.id)} title="Refresh status">
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        {document.status === 'ready' && (
          <Button variant="ghost" size="icon" onClick={() => onChat(document)} title="Open chat">
            <MessageSquare className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => onDelete(document.id)} title="Delete">
          <Trash2 className="h-4 w-4 text-red-400" />
        </Button>
      </div>
    </div>
  )
}
