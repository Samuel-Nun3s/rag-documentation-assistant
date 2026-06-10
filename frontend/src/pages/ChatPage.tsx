import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, SendHorizontal } from 'lucide-react'
import { chatApi, documentsApi } from '@/api'
import type { Conversation, Message } from '@/types'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ConversationSidebar } from '@/components/chat/ConversationSidebar'

export function ChatPage() {
  const { documentId, conversationId } = useParams<{ documentId: string; conversationId: string }>()
  const navigate = useNavigate()

  const [docName, setDocName] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId ?? null)
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingContent, setStreamingContent] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!documentId) return
    documentsApi.get(documentId).then((d) => setDocName(d.name))
    chatApi.listConversations(documentId).then(setConversations)
  }, [documentId])

  const loadMessages = useCallback(async (convId: string) => {
    const msgs = await chatApi.getMessages(convId)
    setMessages(msgs)
  }, [])

  useEffect(() => {
    if (activeConvId) loadMessages(activeConvId)
  }, [activeConvId, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const handleNewConversation = async () => {
    if (!documentId) return
    const conv = await chatApi.createConversation(documentId)
    setConversations((prev) => [conv, ...prev])
    setActiveConvId(conv.id)
    setMessages([])
    navigate(`/chat/${documentId}/${conv.id}`, { replace: true })
  }

  const handleSelectConversation = (conv: Conversation) => {
    setActiveConvId(conv.id)
    navigate(`/chat/${documentId}/${conv.id}`, { replace: true })
  }

  const handleSend = async () => {
    if (!question.trim() || !activeConvId || sending) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversationId: activeConvId,
      role: 'user',
      content: question.trim(),
      sources: null,
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setQuestion('')
    setSending(true)
    setStreamingContent('')

    abortRef.current = new AbortController()

    try {
      let fullContent = ''

      for await (const event of chatApi.askStream(activeConvId, userMessage.content, abortRef.current.signal)) {
        if (event.error) throw new Error(event.error)
        if (event.token) {
          fullContent += event.token
          setStreamingContent(fullContent)
        }
        if (event.done) {
          const saved = await chatApi.getMessages(activeConvId)
          setMessages(saved)
          setStreamingContent(null)

          // Update conversation title if it was just set
          const updatedConvs = await chatApi.listConversations(documentId!)
          setConversations(updatedConvs)
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            conversationId: activeConvId,
            role: 'assistant',
            content: 'Something went wrong. Please try again.',
            sources: null,
            createdAt: new Date().toISOString(),
          },
        ])
      }
      setStreamingContent(null)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900">{docName}</p>
          <p className="text-xs text-neutral-400">Ask anything about this document</p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <ConversationSidebar
          conversations={conversations}
          activeId={activeConvId}
          onSelect={handleSelectConversation}
          onNew={handleNewConversation}
        />

        {/* Chat area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {messages.length === 0 && !streamingContent && (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-neutral-400">Ask your first question below.</p>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {streamingContent !== null && (
              <MessageBubble
                message={{
                  id: 'streaming',
                  conversationId: activeConvId ?? '',
                  role: 'assistant',
                  content: streamingContent,
                  sources: null,
                  createdAt: new Date().toISOString(),
                }}
                streaming
              />
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-neutral-200 px-4 py-4">
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask a question…"
                disabled={sending}
                className="flex-1 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400 disabled:opacity-50"
              />
              <Button onClick={handleSend} disabled={!question.trim() || sending} size="icon">
                {sending ? <Spinner className="text-white" /> : <SendHorizontal className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-2 text-xs text-neutral-400">Press Enter to send · answers are grounded in your document</p>
          </div>
        </div>
      </div>
    </div>
  )
}
