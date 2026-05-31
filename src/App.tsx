import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { Header } from './components/layout/Header'
import { HomePage } from './pages/HomePage'
import { TopicsPage } from './pages/TopicsPage'
import { TopicPage } from './pages/TopicPage'
import { AdminPage } from './pages/AdminPage'
import { GroupsPage } from './pages/GroupsPage'
import { SearchPage } from './pages/SearchPage'

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
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
