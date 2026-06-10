import { useRef, useState } from 'react'
import { UploadCloud, GitFork, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { documentsApi } from '@/api'
import type { Document } from '@/types'

interface Props {
  onUploaded: (doc: Document) => void
}

export function UploadZone({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [githubUrl, setGithubUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setLoading(true)
    setError(null)
    try {
      const doc = await documentsApi.upload(file)
      onUploaded(doc)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGithub = async () => {
    if (!githubUrl.trim()) return
    setLoading(true)
    setError(null)
    try {
      const doc = await documentsApi.fromGithub(githubUrl.trim())
      onUploaded(doc)
      setGithubUrl('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to index repository')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        className={cn(
          'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
          dragging ? 'border-neutral-400 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.md,.txt"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <UploadCloud className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
        <p className="text-sm font-medium text-neutral-700">Drop a file here or click to browse</p>
        <p className="mt-1 text-xs text-neutral-400">PDF, Markdown or TXT</p>
      </div>

      {/* GitHub URL */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <GitFork className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGithub()}
            placeholder="https://github.com/org/repo"
            className="w-full rounded-md border border-neutral-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-400"
          />
        </div>
        <Button onClick={handleGithub} disabled={!githubUrl.trim() || loading} size="sm">
          Index
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Processing…
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
