import { MessageSquarePlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Conversation } from '@/types'

interface Props {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (conv: Conversation) => void
  onNew: () => void
}

export function ConversationSidebar({ conversations, activeId, onSelect, onNew }: Props) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between px-3 py-3 border-b border-neutral-200">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Conversations</span>
        <Button variant="ghost" size="icon" onClick={onNew} title="New conversation">
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {conversations.length === 0 && (
          <p className="px-3 py-4 text-xs text-neutral-400">No conversations yet.</p>
        )}
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={cn(
              'w-full px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-100',
              activeId === conv.id ? 'bg-neutral-100 font-medium text-neutral-900' : 'text-neutral-600',
            )}
          >
            <span className="line-clamp-2">{conv.title ?? 'New conversation'}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
