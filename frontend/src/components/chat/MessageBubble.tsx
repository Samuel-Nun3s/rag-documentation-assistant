import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/types'

interface Props {
  message: Message
  streaming?: boolean
}

export function MessageBubble({ message, streaming }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium',
        isUser ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600',
      )}>
        {isUser ? 'U' : 'AI'}
      </div>

      <div className={cn('max-w-[80%] space-y-2', isUser && 'items-end flex flex-col')}>
        {/* Content */}
        <div className={cn(
          'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-neutral-900 text-white'
            : 'bg-neutral-100 text-neutral-900',
        )}>
          {message.content}
          {streaming && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current align-middle" />
          )}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.sources.map((src, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-xs text-neutral-500"
              >
                <FileText className="h-3 w-3" />
                {src.fileName} · chunk {src.chunkIndex}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
