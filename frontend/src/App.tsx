import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DocumentsPage } from '@/pages/DocumentsPage'
import { ChatPage } from '@/pages/ChatPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DocumentsPage />} />
        <Route path="/chat/:documentId/:conversationId" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  )
}
