import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { Header } from './components/layout/Header'
import { HomePage } from './pages/HomePage'
import { TopicsPage } from './pages/TopicsPage'
import { TopicPage } from './pages/TopicPage'
import { AdminPage } from './pages/AdminPage'

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/topics" element={<TopicsPage />} />
            <Route path="/topic/:slug" element={<TopicPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
